import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { Finding } from "@devdigest/shared";
import { FindingsTooltip } from "./FindingsTooltip";

afterEach(cleanup);

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: "f1",
  severity: "CRITICAL",
  category: "security",
  title: "Hardcoded Stripe secret key",
  file: "src/config.ts",
  start_line: 12,
  end_line: 12,
  rationale: "Line 12 contains a literal string starting with sk_live_.",
  confidence: 0.98,
  ...over,
});

describe("FindingsTooltip", () => {
  it("shows nothing until hovered, then lists findings", () => {
    render(
      <FindingsTooltip findings={[finding()]}>
        <span>counters</span>
      </FindingsTooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(screen.getByText("counters"));
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Hardcoded Stripe secret key");
    expect(tip).toHaveTextContent("src/config.ts:12");
    expect(tip).toHaveTextContent("98% conf");
    expect(tip).toHaveTextContent("1 findings");
  });

  it("hides on mouse leave after the close delay", async () => {
    render(
      <FindingsTooltip findings={[finding()]}>
        <span>counters</span>
      </FindingsTooltip>,
    );
    const trigger = screen.getByText("counters");
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("sorts critical first and renders every finding (scrollable, no cap)", () => {
    const findings: Finding[] = [
      ...Array.from({ length: 8 }, (_, i) =>
        finding({ id: `s${i}`, severity: "SUGGESTION", title: `sugg ${i}` }),
      ),
      finding({ id: "c1", severity: "CRITICAL", title: "the critical one" }),
    ];
    render(
      <FindingsTooltip findings={findings}>
        <span>counters</span>
      </FindingsTooltip>,
    );
    fireEvent.mouseEnter(screen.getByText("counters"));
    const tip = screen.getByRole("tooltip");
    // All 9 findings render (the body scrolls); critical sorts to the top.
    expect(tip).toHaveTextContent("9 findings");
    const titles = screen.getAllByText(/the critical one|sugg \d/);
    expect(titles).toHaveLength(9);
    expect(titles[0]).toHaveTextContent("the critical one");
  });

  it("stays open when the cursor moves from the trigger onto the panel", () => {
    render(
      <FindingsTooltip findings={[finding()]}>
        <span>counters</span>
      </FindingsTooltip>,
    );
    const trigger = screen.getByText("counters");
    fireEvent.mouseEnter(trigger);
    // Leaving the trigger only schedules a delayed close; entering the panel
    // cancels it, so the tooltip remains.
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("uses the provided count for the header while lazily loading", () => {
    render(
      <FindingsTooltip findings={[]} count={6} loading>
        <span>counters</span>
      </FindingsTooltip>,
    );
    fireEvent.mouseEnter(screen.getByText("counters"));
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("6 findings");
    expect(tip).toHaveTextContent("Loading findings…");
  });
});
