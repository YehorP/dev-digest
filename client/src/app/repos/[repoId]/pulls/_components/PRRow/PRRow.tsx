/* PRRow — one clickable row in the PR list table. Ported from screen_dashboard.jsx. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, Avatar, Badge, CircularScore } from "@devdigest/ui";
import type { PrMeta } from "@/lib/types";
import { RunCostBadge } from "@/components/RunCostBadge";
import { FindingsCounters } from "@/components/FindingsCounters";
import { FindingsTooltip } from "@/components/FindingsTooltip";
import { usePrFindings } from "@/lib/hooks/reviews";
import { SIZE_COLOR, STATUS_META } from "../../constants";
import { relativeTime, sizeOf } from "../../helpers";
import { s } from "../../styles";

export function PRRow({ pr, repoId }: { pr: PrMeta; repoId: string }) {
  const t = useTranslations("prReview");
  const router = useRouter();
  const [h, setH] = React.useState(false);
  const st = STATUS_META[pr.status] ?? STATUS_META.needs_review!;
  const { size, lines } = sizeOf(pr);
  const reviewed = pr.score != null; // null score ⇒ PR has never been reviewed
  const findingsTotal =
    (pr.critical_count ?? 0) + (pr.warning_count ?? 0) + (pr.suggestion_count ?? 0);
  // Findings are not in the list payload (counts only) — fetch them lazily, but
  // only while the row is hovered, so the tooltip has data to show on demand.
  const { findings, isLoading: findingsLoading } = usePrFindings(pr.id, h && findingsTotal > 0);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={() => router.push(`/repos/${repoId}/pulls/${pr.number}`)}
      style={s.row(h)}
    >
      <div style={s.rowTitleCell}>
        <Icon.GitPullRequest size={15} style={s.rowIcon(st.c)} />
        <div style={s.rowTitleWrap}>
          <div style={s.rowTitle(h)}>{pr.title}</div>
          <span className="mono" style={s.rowNumber}>
            #{pr.number}
          </span>
        </div>
      </div>
      <div style={s.authorCell}>
        <Avatar name={pr.author} size={18} />
        {pr.author}
      </div>
      <div>
        <Badge
          color={SIZE_COLOR[size]}
          bg="transparent"
          style={s.sizeBadgeBorder(SIZE_COLOR[size]!)}
        >
          {size} · {lines}
        </Badge>
      </div>
      <div style={s.scoreCell}>
        {reviewed ? (
          <CircularScore score={pr.score!} size={34} stroke={3} />
        ) : (
          <span style={s.muted}>—</span>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {findingsTotal > 0 ? (
          <FindingsTooltip findings={findings} count={findingsTotal} loading={findingsLoading}>
            <FindingsCounters
              critical={pr.critical_count}
              warning={pr.warning_count}
              suggestion={pr.suggestion_count}
            />
          </FindingsTooltip>
        ) : (
          <FindingsCounters
            critical={pr.critical_count}
            warning={pr.warning_count}
            suggestion={pr.suggestion_count}
          />
        )}
      </div>
      <div>
        <Badge dot color={st.c} bg="transparent">
          {t(`list.status.${st.labelKey}`)}
        </Badge>
      </div>
      <div>
        <RunCostBadge cost={pr.cost_usd} />
      </div>
      <div style={s.updatedCell}>{relativeTime(pr.updated_at)}</div>
    </div>
  );
}
