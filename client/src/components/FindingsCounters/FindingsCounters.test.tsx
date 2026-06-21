import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FindingsCounters } from "./FindingsCounters";

afterEach(cleanup);

describe("FindingsCounters", () => {
  it("renders the three severity counts", () => {
    render(<FindingsCounters critical={2} warning={3} suggestion={1} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders zeros (settled run with no findings of a severity)", () => {
    const { container } = render(<FindingsCounters critical={0} warning={0} suggestion={0} />);
    expect(container.textContent).toContain("0");
    expect(container.textContent).not.toContain("—");
  });

  it("renders an em dash when there is no data", () => {
    render(<FindingsCounters critical={null} warning={null} suggestion={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
