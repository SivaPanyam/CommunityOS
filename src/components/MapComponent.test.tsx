import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MapComponent from "./MapComponent";

describe("MapComponent Digital Twin", () => {
  const mockTraffic = [
    { id: "1", location: "Downtown Expressway", congestion_index: 0.45, average_speed_kmh: 55, vehicle_count: 800, timestamp: "2026-07-06T12:00:00Z" }
  ];
  const mockEmergencies = [];
  const mockAqi = [
    { id: "1", location: "Downtown", aqi: 45, status: "Good", timestamp: "2026-07-06T12:00:00Z" }
  ];
  const mockWater = [];

  test("renders digital twin SVG layout and header controls", () => {
    render(
      <MapComponent
        traffic={mockTraffic}
        emergencies={mockEmergencies}
        aqiList={mockAqi}
        water={mockWater}
      />
    );

    expect(screen.getByText("COMMUNITYOS COGNITIVE DIGITAL TWIN")).toBeInTheDocument();
    expect(screen.getByText("traffic")).toBeInTheDocument();
    expect(screen.getByText("emergency")).toBeInTheDocument();
    expect(screen.getByText("aqi")).toBeInTheDocument();
  });
});
