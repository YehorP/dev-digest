import type {
  LLMProvider,
  ModelInfo,
  ChatMessage,
  CompletionRequest,
  CompletionResult,
  StructuredRequest,
  StructuredResult,
} from '@devdigest/shared';
import { toJsonSchema, parseWithRepair } from './structured.js';

/**
 * The single OpenAI-compatible structured provider, owned by the engine because
 * BOTH consumers need it: the CI runner (the GitHub Action runs reviewer-core
 * directly) and the studio server's openrouter path. Centralizing it here means
 * session grouping, the no-choices guard, request timeouts, and the
 * parse-with-repair loop live in ONE place instead of being duplicated.
 *
 * OpenRouter is OpenAI-compatible, so we drive `/chat/completions` directly with
 * `fetch`. We deliberately do NOT use the `openai` SDK here: its HTTP transport
 * premature-closes mid-body on long OpenRouter generations (slow models taking
 * minutes), failing with `ERR_STREAM_PREMATURE_CLOSE`. Raw `fetch` is the only
 * transport proven resilient on those multi-minute responses, and SDK streaming
 * does not fix it (both tested — see reviewer-core/INSIGHTS.md 2026-06-21).
 *
 * Only completeStructured is needed by reviewPullRequest; the rest are stubs.
 * Cost attribution is INJECTED (`estimateCost`) so the engine stays free of a
 * pricing table — the server passes its own, the runner passes none.
 */

const NOT_SUPPORTED = 'OpenRouterProvider only implements completeStructured';

export interface OpenRouterProviderOptions {
  /** OpenAI-compatible base URL (default: OpenRouter). */
  baseURL?: string;
  /** Provider id for traces/gating (default 'openrouter'). */
  id?: 'openai' | 'openrouter';
  /** Per-request timeout (ms) — the SDK retries on timeout/5xx/429 with backoff. */
  timeoutMs?: number;
  maxRetries?: number;
  /** Injected cost estimator; returns USD or null when the model is unknown. */
  estimateCost?: (model: string, tokensIn: number, tokensOut: number) => number | null;
}

/** OpenAI-compatible /chat/completions response (only the fields we read). */
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    // `cost` is an OpenRouter extension (USD), absent from the OpenAI shape.
    cost?: number;
  } | null;
  error?: { message?: string };
}

export class OpenRouterProvider implements LLMProvider {
  readonly id: 'openai' | 'openrouter';
  private baseURL: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxTransportRetries: number;
  private estimateCost?: OpenRouterProviderOptions['estimateCost'];

  constructor(apiKey: string, opts: OpenRouterProviderOptions = {}) {
    this.id = opts.id ?? 'openrouter';
    this.apiKey = apiKey;
    this.baseURL = opts.baseURL ?? 'https://openrouter.ai/api/v1';
    this.timeoutMs = opts.timeoutMs ?? 90_000;
    this.maxTransportRetries = opts.maxRetries ?? 2;
    this.estimateCost = opts.estimateCost;
  }

  /**
   * One raw POST to /chat/completions with an idle-free abort timeout and
   * backoff retries on transport errors / 429 / 5xx (mirrors the retry policy
   * the SDK used to give us). The full body is buffered before returning, so a
   * resilient connection — not the SDK's fragile streaming reader — owns the
   * long generation.
   */
  private async postChatCompletion(body: Record<string, unknown>): Promise<ChatCompletionResponse> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxTransportRetries; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), this.timeoutMs);
      try {
        const res = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        // Retry transient upstream failures (429 + 5xx); surface other 4xx now.
        if (res.status === 429 || res.status >= 500) {
          const text = await res.text().catch(() => '');
          throw new Error(`OpenRouter returned ${res.status}${text ? `: ${text}` : ''}`);
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          // Non-retryable: throw outside the retry loop.
          throw Object.assign(new Error(`OpenRouter returned ${res.status}${text ? `: ${text}` : ''}`), {
            fatal: true,
          });
        }
        return (await res.json()) as ChatCompletionResponse;
      } catch (err) {
        if ((err as { fatal?: boolean }).fatal) throw err;
        lastErr = err;
        if (attempt < this.maxTransportRetries) {
          // Exponential backoff: 0.5s, 1s, 2s…
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  async completeStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const jsonSchema = toJsonSchema(req.schema, req.schemaName);
    const maxRetries = req.maxRetries ?? 2;
    const messages: ChatMessage[] = [...req.messages];
    let tokensIn = 0;
    let tokensOut = 0;
    let costFromApi: number | null = null;
    let lastRaw = '';

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const res = await this.postChatCompletion({
        model: req.model,
        messages,
        temperature: req.temperature ?? 0,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        response_format: {
          type: 'json_schema',
          json_schema: { name: req.schemaName, schema: jsonSchema.schema, strict: true },
        },
        // OpenRouter session grouping — only sent when talking to OpenRouter.
        ...(this.id === 'openrouter' && req.sessionId ? { session_id: req.sessionId } : {}),
        // OpenRouter usage accounting — ask it to return the REAL generation
        // cost (USD) in `usage.cost`, instead of estimating from a price book.
        ...(this.id === 'openrouter' ? { usage: { include: true } } : {}),
      });

      // OpenRouter can return HTTP 200 with no `choices` (an upstream provider
      // error / moderation / free-tier limit in the body) — surface it.
      const choice = res.choices?.[0];
      if (!choice) {
        const errMsg = res.error?.message;
        throw new Error(`OpenRouter returned no choices for ${req.schemaName}${errMsg ? `: ${errMsg}` : ''}`);
      }
      lastRaw = choice.message?.content ?? '';
      tokensIn += res.usage?.prompt_tokens ?? 0;
      tokensOut += res.usage?.completion_tokens ?? 0;
      // `usage.cost` is an OpenRouter extension (USD), absent from the OpenAI shape.
      const apiCost = res.usage?.cost;
      if (typeof apiCost === 'number') costFromApi = (costFromApi ?? 0) + apiCost;

      const parsed = parseWithRepair(req.schema, lastRaw);
      if (parsed.ok) {
        return {
          data: parsed.data,
          model: req.model,
          tokensIn,
          tokensOut,
          costUsd: costFromApi ?? this.estimateCost?.(req.model, tokensIn, tokensOut) ?? null,
          raw: lastRaw,
          attempts: attempt,
        };
      }
      messages.push({ role: 'assistant', content: lastRaw });
      messages.push({ role: 'user', content: parsed.repromptMessage });
    }
    throw new Error(`OpenRouter structured output failed schema validation for ${req.schemaName}`);
  }

  /**
   * List models with pricing from the OpenRouter `/models` endpoint (the OpenAI
   * SDK's models.list strips the `pricing` field, so we fetch raw). Prices are
   * converted from per-token to USD per 1M tokens; cheapest output first.
   */
  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseURL}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter /models returned ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
      }>;
    };
    const models: ModelInfo[] = (json.data ?? []).map((m) => {
      const prompt = Number(m.pricing?.prompt);
      const completion = Number(m.pricing?.completion);
      // OpenRouter uses -1 as a sentinel for variable-priced router pseudo-models
      // (openrouter/auto etc.) — treat negatives as "unknown" so they don't show
      // as $-1000000 and don't sort to the top of the cheapest list.
      const pricing =
        Number.isFinite(prompt) && Number.isFinite(completion) && prompt >= 0 && completion >= 0
          ? { promptPerM: prompt * 1_000_000, completionPerM: completion * 1_000_000 }
          : null;
      return {
        id: m.id,
        provider: 'openrouter' as const,
        label: m.name ?? null,
        pricing,
        contextLength: m.context_length ?? null,
      };
    });
    return models.sort(
      (a, b) => (a.pricing?.completionPerM ?? Infinity) - (b.pricing?.completionPerM ?? Infinity),
    );
  }
  async complete(_req: CompletionRequest): Promise<CompletionResult> {
    throw new Error(NOT_SUPPORTED);
  }
  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error(NOT_SUPPORTED);
  }
}
