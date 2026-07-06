import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricCard from "./MetricCard";
import { Navigation } from "lucide-react";

describe("MetricCard Component", () => {
  test("renders normal state with correct title and value", () => {
    render(
      <MetricCard
        title="Active Vehicles"
        value="1,420"
        unit="cars"
        trend="stable"
        trendDirection="neutral"
        icon={<Navigation data-testid="nav-icon" />}
        color="cyan"
      />
    );

    expect(screen.getByText("Active Vehicles")).toBeInTheDocument();
    expect(screen.getByText("1,420")).toBeInTheDocument();
    expect(screen.getByText("cars")).toBeInTheDocument();
    expect(screen.getByTestId("nav-icon")).toBeInTheDocument();
  });

  test("renders skeleton screen state when loading is true", () => {
    const { container } = render(
      <MetricCard
        title="Active Vehicles"
        value="1,420"
        icon={<Navigation />}
        color="cyan"
        loading={true}
      />
    );

    // Should have animate-pulse class indicating skeleton loading state
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    // Normal value should NOT be present
    expect(screen.queryByText("1,420")).not.toBeInTheDocument();
  });
});
