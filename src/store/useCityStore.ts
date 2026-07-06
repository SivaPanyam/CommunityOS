import { create } from "zustand";
import { ActiveTab, SmartCityTheme, ApprovedAction } from "../types";

interface CityStore {
  activeTab: ActiveTab;
  viewLanding: boolean;
  theme: SmartCityTheme;
  activeApprovedWorkflow: ApprovedAction | null;
  
  setActiveTab: (tab: ActiveTab) => void;
  setViewLanding: (view: boolean) => void;
  setTheme: (theme: SmartCityTheme) => void;
  setActiveApprovedWorkflow: (action: ApprovedAction | null) => void;
}

export const useCityStore = create<CityStore>((set) => ({
  activeTab: "dashboard",
  viewLanding: true,
  theme: "glass-slate",
  activeApprovedWorkflow: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewLanding: (view) => set({ viewLanding: view }),
  setTheme: (theme) => set({ theme: theme }),
  setActiveApprovedWorkflow: (action) => set({ activeApprovedWorkflow: action }),
}));
