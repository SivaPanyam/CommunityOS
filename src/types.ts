export interface DashboardStats {
  trafficIndex: number;
  averageSpeed: number;
  vehicleCount: number;
  weather: {
    temperature_c: number;
    humidity_pct: number;
    rainfall_mm: number;
    wind_speed_kmh: number;
    condition: string;
    warnings: string;
  };
  aqi: number;
  aqiStatus: string;
  hospitalOccupancy: number;
  activePowerMW: number;
  reservoirLevelPct: number;
  unresolvedComplaintsCount: number;
  activeEmergenciesCount: number;
  recentDecisions: ApprovedAction[];
  notifications: Notification[];
}

export interface TrafficRecord {
  timestamp: string;
  location: string;
  congestion_index: number;
  average_speed_kmh: number;
  vehicle_count: number;
  accidents: number;
}

export interface WeatherRecord {
  timestamp: string;
  temperature_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  condition: string;
  warnings: string;
}

export interface AQIRecord {
  timestamp: string;
  location: string;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  co: number;
  o3: number;
  risk_status: string;
}

export interface ComplaintRecord {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  department: string;
  status: string;
  image_url?: string;
  suggested_action: string;
}

export interface PowerRecord {
  timestamp: string;
  grid_id: string;
  zone: string;
  demand_mw: number;
  capacity_mw: number;
  efficiency_pct: number;
  status: string;
}

export interface WaterRecord {
  timestamp: string;
  facility: string;
  reservoir_level_pct: number;
  pressure_psi: number;
  leak_rate_lps: number;
  turbidity_ntu: number;
  status: string;
}

export interface HospitalRecord {
  timestamp: string;
  hospital_name: string;
  total_beds: number;
  occupied_beds: number;
  icu_beds: number;
  occupied_icu_beds: number;
  emergency_wait_minutes: number;
  status: string;
}

export interface EmergencyRecord {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  severity: string;
  location: string;
  latitude: number;
  longitude: number;
  responding_units: string;
  status: string;
}

export interface CitizenFeedbackRecord {
  timestamp: string;
  topic: string;
  sentiment: string;
  rating: number;
  comment: string;
  user_type: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  category: string;
  title: string;
  message: string;
  read: boolean;
}

export interface ApprovedAction {
  id: string;
  dispatchId: string;
  timestamp: string;
  title: string;
  department: string;
  sector: string;
  status: string;
  report: string;
}

export interface ProposedAction {
  id: string;
  title: string;
  description: string;
  targetSector: string;
  impactMetric: string;
  automatedWorkflow: boolean;
}

export interface AIAnalysisResult {
  summary: string;
  evidence: string;
  predictions: string;
  recommendations: string[];
  confidenceScore: number;
  affectedAreas: string[];
  responsibleDepartments: string[];
  priority: string;
  proposedActions: ProposedAction[];
}

export type SmartCityTheme = "glass-slate" | "cyber-blue" | "emerald-green";

export type ActiveTab = "dashboard" | "decision-center" | "document-rag" | "analytics" | "complaints" | "emergency" | "utilities" | "settings";

export type SmartAgent = "Decision Agent" | "Traffic Agent" | "Environment Agent" | "Citizen Agent" | "Healthcare Agent" | "Emergency Agent" | "Resource Agent";
