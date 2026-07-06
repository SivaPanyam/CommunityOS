import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  TrafficRecord,
  WeatherRecord,
  AQIRecord,
  ComplaintRecord,
  PowerRecord,
  WaterRecord,
  HospitalRecord,
  EmergencyRecord,
  CitizenFeedbackRecord,
} from "../types";

export interface CityDataState {
  stats: any;
  traffic: TrafficRecord[];
  weather: WeatherRecord[];
  airQuality: AQIRecord[];
  complaints: ComplaintRecord[];
  power: PowerRecord[];
  water: WaterRecord[];
  hospital: HospitalRecord[];
  emergency: EmergencyRecord[];
  citizenFeedback: CitizenFeedbackRecord[];
}

const fetchAllFeeds = async (): Promise<CityDataState> => {
  const res = await fetch("/api/data/all");
  if (!res.ok) {
    throw new Error("Network response was not ok");
  }
  return res.json();
};

export const useCityData = () => {
  const queryClient = useQueryClient();
  const [isWsReconnecting, setIsWsReconnecting] = useState(false);

  const query = useQuery<CityDataState>({
    queryKey: ["cityData"],
    queryFn: fetchAllFeeds,
    refetchInterval: 10000, // Fallback poll every 10 seconds
  });

  // Setup WebSocket sync
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to CommunityOS Real-Time Event Pipeline.");
          setIsWsReconnecting(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "telemetry:update") {
              const payload = data.payload;
              queryClient.setQueryData(["cityData"], (prev: CityDataState | undefined) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  stats: payload.stats || prev.stats,
                  traffic: payload.traffic || prev.traffic,
                  airQuality: payload.airQuality || prev.airQuality,
                  water: payload.water || prev.water,
                  complaints: payload.complaints || prev.complaints,
                  emergency: payload.emergency || prev.emergency,
                };
              });
            } else if (data.event === "complaint:created") {
              const complaint = data.payload;
              queryClient.setQueryData(["cityData"], (prev: CityDataState | undefined) => {
                if (!prev) return prev;
                if (prev.complaints.some((c) => c.id === complaint.id)) return prev;
                return {
                  ...prev,
                  complaints: [complaint, ...prev.complaints],
                };
              });
            } else if (data.event === "workflow:approved") {
              queryClient.invalidateQueries({ queryKey: ["cityData"] });
            }
          } catch (err) {
            console.error("Error parsing WebSocket event:", err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed. Attempting auto-reconnection in 5s...");
          setIsWsReconnecting(true);
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        setIsWsReconnecting(true);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient]);

  // Mutations
  const triggerActionMutation = useMutation({
    mutationFn: async (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => {
      const res = await fetch("/api/workflows/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: action.id,
          actionTitle: action.title,
          department: action.department,
          sector: action.sector,
          impactMetric: action.impactMetric,
        }),
      });
      if (!res.ok) throw new Error("Workflow dispatch failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cityData"] });
    },
  });

  const addComplaintMutation = useMutation({
    mutationFn: async (newComp: { title: string; description: string; location: string; imageUrl?: string }) => {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp),
      });
      if (!res.ok) throw new Error("Adding complaint failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cityData"] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isWsReconnecting,
    triggerAction: triggerActionMutation.mutateAsync,
    addComplaint: addComplaintMutation.mutateAsync,
  };
};
