"use client";

import React from "react";
import { Icon, type IconName } from "@devdigest/ui";

/**
 * Per-severity findings counters (CRITICAL / WARNING / SUGGESTION) shown on the
 * PR list "Findings" column and on each agent-run timeline row. A null trio (PR
 * never reviewed / run not settled) renders a muted "—"; a zero count for a
 * present severity is shown muted so non-zero severities stand out.
 */
const SEVERITIES: { key: "critical" | "warning" | "suggestion"; icon: IconName; color: string }[] = [
  { key: "critical", icon: "XCircle", color: "var(--crit)" },
  { key: "warning", icon: "AlertTriangle", color: "var(--warn)" },
  { key: "suggestion", icon: "Lightbulb", color: "var(--sugg)" },
];

export function FindingsCounters({
  critical,
  warning,
  suggestion,
}: {
  critical?: number | null;
  warning?: number | null;
  suggestion?: number | null;
}) {
  const counts = { critical, warning, suggestion };
  // No data at all → "—" (matches the Score/Cost columns).
  if (critical == null && warning == null && suggestion == null) {
    return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {SEVERITIES.map(({ key, icon, color }) => {
        const n = counts[key] ?? 0;
        const IconCmp = Icon[icon];
        const active = n > 0;
        return (
          <span
            key={key}
            className="tnum"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 12,
              color: active ? color : "var(--text-muted)",
            }}
          >
            <IconCmp size={13} style={{ color: active ? color : "var(--text-muted)" }} />
            {n}
          </span>
        );
      })}
    </div>
  );
}
