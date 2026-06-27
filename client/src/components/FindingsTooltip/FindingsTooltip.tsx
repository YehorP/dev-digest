"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Icon, SEV, CAT, type Severity, type Category } from "@devdigest/ui";
import type { Finding } from "@devdigest/shared";

/**
 * Hover tooltip that lists the underlying findings behind a `FindingsCounters`
 * trio. Used on the PR-list "Findings" column and the agent-run timeline rows,
 * where only per-severity counts are shown inline — hovering reveals the actual
 * findings (severity, title, category, file:line, confidence, rationale).
 *
 * The panel is portalled to <body> with fixed positioning so it escapes the
 * table/row `overflow` clipping. It's interactive: the body scrolls when there
 * are many findings, and the panel stays open while the cursor is over it. A
 * short close delay bridges the gap between trigger and panel so moving onto it
 * doesn't dismiss it. Findings can be supplied directly (PR detail, already
 * loaded) or fetched lazily via `onOpen` (PR list).
 */

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUGGESTION: 2, INFO: 3 };
const PANEL_WIDTH = 384;
const CLOSE_DELAY_MS = 120;

type Placement = "below" | "above";

export function FindingsTooltip({
  findings,
  count,
  loading,
  onOpen,
  children,
}: {
  findings: Finding[];
  /** Total finding count for the header — shown immediately even while lazily loading. */
  count?: number;
  loading?: boolean;
  /** Fired on hover-in; lets the PR list lazily fetch findings only when needed. */
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; placement: Placement } | null>(
    null,
  );

  const cancelHide = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = () => {
    cancelHide();
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - PANEL_WIDTH - 8);
    const placement: Placement = r.bottom > window.innerHeight * 0.62 ? "above" : "below";
    setPos({ top: placement === "below" ? r.bottom + 8 : r.top - 8, left, placement });
    onOpen?.();
  };

  // Delay the close so the cursor can travel the gap onto the (interactive)
  // panel without the tooltip vanishing mid-move.
  const scheduleHide = () => {
    cancelHide();
    closeTimer.current = setTimeout(() => setPos(null), CLOSE_DELAY_MS);
  };

  React.useEffect(() => cancelHide, []);

  const sorted = React.useMemo(
    () =>
      [...findings].sort(
        (a, b) =>
          (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) ||
          b.confidence - a.confidence,
      ),
    [findings],
  );
  const total = count ?? sorted.length;

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      {children}
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            style={{
              ...st.panel,
              top: pos.top,
              left: pos.left,
              transform: pos.placement === "above" ? "translateY(-100%)" : undefined,
            }}
          >
            <div style={st.header}>{total} findings</div>
            <div style={st.body}>
              {loading && sorted.length === 0 ? (
                <div style={st.empty}>Loading findings…</div>
              ) : sorted.length === 0 ? (
                <div style={st.empty}>No findings.</div>
              ) : (
                sorted.map((f) => <FindingRow key={f.id} f={f} />)
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const sev = SEV[f.severity as Severity] ?? SEV.SUGGESTION;
  const SevIcon = Icon[sev.icon];
  const cat = CAT[f.category as Category];
  const CatIcon = cat ? Icon[cat.icon] : null;
  const pct = Math.round(f.confidence * 100);
  const line = f.start_line === f.end_line ? `${f.start_line}` : `${f.start_line}-${f.end_line}`;
  const rationale = f.rationale?.replace(/[`*#>]/g, "").trim();

  return (
    <div style={st.row}>
      <div style={st.rowTop}>
        <SevIcon size={13} style={{ color: sev.c, flexShrink: 0, marginTop: 1.5 }} />
        <span style={st.title}>{f.title}</span>
        {cat && CatIcon && (
          <span style={st.cat}>
            <CatIcon size={11} />
            {cat.label}
          </span>
        )}
      </div>
      <div style={st.meta}>
        <span className="mono" style={st.file}>
          {f.file}:{line}
        </span>
        <span className="mono tnum" style={st.conf}>
          {pct}% conf
        </span>
      </div>
      {rationale && <div style={st.rationale}>{rationale}</div>}
    </div>
  );
}

const st = {
  panel: {
    position: "fixed",
    width: PANEL_WIDTH,
    maxHeight: "min(420px, 70vh)",
    zIndex: 1000,
    pointerEvents: "auto",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  header: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    padding: "6px 8px 4px",
  },
  // The scrollable region — flex:1 + minHeight:0 lets it shrink under maxHeight
  // and scroll instead of overflowing the panel.
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  empty: { fontSize: 12.5, color: "var(--text-muted)", padding: "6px 8px 8px" },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "7px 8px",
    borderRadius: 6,
  },
  rowTop: { display: "flex", alignItems: "flex-start", gap: 7 },
  title: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--text-primary)",
    flex: 1,
    minWidth: 0,
    lineHeight: 1.35,
  },
  cat: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  meta: { display: "flex", alignItems: "center", gap: 8, paddingLeft: 20 },
  file: { fontSize: 11.5, color: "var(--accent-text)" },
  conf: { fontSize: 11.5, color: "var(--text-muted)" },
  rationale: {
    fontSize: 11.5,
    color: "var(--text-secondary)",
    lineHeight: 1.4,
    paddingLeft: 20,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
} satisfies Record<string, React.CSSProperties>;
