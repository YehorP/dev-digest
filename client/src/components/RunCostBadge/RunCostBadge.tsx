"use client";

import React from "react";

/** Adaptive USD cost; "—" when unknown (never "$0.00" for missing data). */
export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "—";
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`;
}

/** Token in→out summary (e.g. "8.2K→1.3K"). */
function formatTokens(tokensIn: number, tokensOut: number): string {
  return `${(tokensIn / 1000).toFixed(1)}K→${(tokensOut / 1000).toFixed(1)}K`;
}

/**
 * Run cost (+ optional token usage) badge. Two variants:
 *   compact  → "$0.012"             (PR list column, run timeline)
 *   detailed → "$0.014 · 8.2K→1.3K" (PR-detail verdict banner)
 * A null cost renders a muted "—"; we never coerce missing data to "$0.00".
 */
export function RunCostBadge({
  cost,
  tokensIn,
  tokensOut,
  variant = "compact",
}: {
  cost: number | null | undefined;
  tokensIn?: number | null;
  tokensOut?: number | null;
  variant?: "compact" | "detailed";
}) {
  const muted = cost == null;
  const text =
    variant === "detailed" && cost != null && tokensIn != null && tokensOut != null
      ? `${formatCost(cost)} · ${formatTokens(tokensIn, tokensOut)}`
      : formatCost(cost);
  return (
    <span
      className="mono tnum"
      style={{ fontSize: 12, color: muted ? "var(--text-muted)" : "var(--text-secondary)" }}
    >
      {text}
    </span>
  );
}
