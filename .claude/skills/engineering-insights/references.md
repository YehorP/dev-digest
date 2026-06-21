# engineering-insights — references

Sources behind the capture-loop design. Fetched and verified 2026-06-20.

## Core learnings-loop guides (must-read)
- **Self-Learning AI Skill System with Learnings.md + Wrap-Up Skill** — MindStudio.
  File-section structure, vague-vs-useful entries, three wrap-up triggers, common
  mistakes, cadence (>30 min sessions), team append-only workflow.
  https://www.mindstudio.ai/blog/self-learning-ai-skill-system-learnings-md-wrap-up
- **How to Build a Learnings Loop for Claude Code Skills** — MindStudio.
  Session Protocol for CLAUDE.md; forced active read ("confirm you've read … and
  summarize the top 3"); LEARNINGS ≠ CLAUDE.md ≠ chat replay.
  https://www.mindstudio.ai/blog/how-to-build-learnings-loop-claude-code-skills
- **Self-Evolving Claude Code Memory with Obsidian + Hooks** — MindStudio.
  Source of the **4 capture categories** (Patterns / Mistakes / Decisions / Context).
  https://www.mindstudio.ai/blog/self-evolving-claude-code-memory-obsidian-hooks
- **Compounding Knowledge Loop in Claude Code** — MindStudio. Session-lifecycle
  hooks; Stop hook = end-of-session capture (deferred to a later lesson here).
  https://www.mindstudio.ai/blog/compounding-knowledge-loop-claude-code
- **Self-Learning Claude Code Skill with Learnings.md** — MindStudio. Why the
  pattern works without RAG/vectors; why markdown + version control.
  https://www.mindstudio.ai/blog/self-learning-claude-code-skill-learnings-md
- **What Is Claude Code Auto-Memory** — MindStudio. What to store; value of
  reviewing entries early before errors compound.
  https://www.mindstudio.ai/blog/what-is-claude-code-auto-memory

## Self-improving CLAUDE.md (adjacent)
- **Self-Improving AI: One Prompt …** — Aviad Rozenhek (dev.to). Meta-rules:
  lead with why, NEVER/ALWAYS, concise; mistakes "evolve upward" across sessions.
  https://dev.to/aviad_rozenhek_cba37e0660/self-improving-ai-one-prompt-that-makes-claude-learn-from-every-mistake-16ek
- **CLAUDE.md: Building Persistent Memory for AI Coding Agents** — evoleinik (dev.to).
  One-line entry model; flag-then-confirm; "add only if genuinely useful"; prune
  monthly (caps the file ~30 entries); not a docs substitute / not a tooling crutch.
  https://dev.to/evoleinik/claudemd-building-persistent-memory-for-ai-coding-agents-5322

## Official (Anthropic)
- **Skill authoring best practices.** Description = discovery interface (third
  person, what + when); gerund/noun-phrase naming; name rules (lowercase/hyphens,
  ≤64 chars, no reserved words); SKILL.md body < 500 lines; build evals first.
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **Lessons from building Claude Code: How we use skills.** "A skill is a folder,
  not just a markdown file"; dynamic session-scoped hooks (e.g. /careful, /freeze).
  https://claude.com/blog/lessons-from-building-claude-code-how-we-use-skills

## Analog skills (implementation examples)
- **glebis/claude-skills — retrospective skill.** `/retrospective`,
  `/retrospective today`, `/retrospective <date>`; dedupes against existing memories.
  https://github.com/glebis/claude-skills
- **Lessons Learned (AI Development Retro)** — mcpmarket. Parses build summaries →
  LESSONS.md; enforces actionable, transferable knowledge; prevents platitudes.
  (Not re-fetched 2026-06-20 — HTTP 429; summarized from the research digest.)
  https://mcpmarket.com/tools/skills/lessons-learned-retrospectives
- **CLAUDE.md Lessons Manager** — mcpmarket. Auto-extract from chat/terminal;
  session-end reminders; duplicate detection + rule consolidation.
  (Not re-fetched 2026-06-20 — HTTP 429; summarized from the research digest.)
  https://mcpmarket.com/tools/skills/claude-md-lessons-manager

## Adjacent (context management)
- **Skills: Code Scripts vs Markdown Instructions** — MindStudio. Scripts cut
  tokens up to ~90% and are deterministic — basis for moving capture to a script
  in a later lesson.
  https://www.mindstudio.ai/blog/claude-code-skills-code-scripts-vs-markdown-instructions
- **Skills vs Hooks** — MindStudio. "Hooks aren't called by Claude — the system
  calls them."
  https://www.mindstudio.ai/blog/claude-code-skills-vs-hooks-difference
- **Context Compounding Explained** — MindStudio. Shorter sessions = smaller peak
  context; CLAUDE.md is fixed-size system input, doesn't compound with history.
  https://www.mindstudio.ai/blog/claude-code-context-compounding-explained
