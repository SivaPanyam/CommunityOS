import { BaseService } from "./BaseService";
import { saveToFirestore, logStructured } from "../gcp";
import fs from "fs";
import path from "path";

export interface ComplaintRecord {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  department: string;
  status: "Open" | "Assigned" | "In Progress" | "Resolved";
  image_url?: string;
  suggested_action: string;
}

export class OpenGovService extends BaseService {
  private static instance: OpenGovService;

  public static getInstance(): OpenGovService {
    if (!OpenGovService.instance) {
      OpenGovService.instance = new OpenGovService();
    }
    return OpenGovService.instance;
  }

  /**
   * Fetch live 311 complaints from New York City Open Government Socrata API
   */
  public async fetchLiveComplaints(limit = 15): Promise<ComplaintRecord[]> {
    const cacheKey = `gov_311_complaints_${limit}`;
    const cached = this.getCached<ComplaintRecord[]>(cacheKey);
    if (cached) return cached;

    // Socrata open data portal endpoint for NYC 311 Service Requests
    const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=${limit}&$order=created_date DESC`;

    try {
      const data = await this.fetchWithRetry<any[]>(url, {}, 2, 1000);
      const records: ComplaintRecord[] = [];

      for (const item of data) {
        const id = item.unique_key ? `COMP-${item.unique_key}` : `COMP-${Math.round(Math.random() * 100000)}`;
        const timestamp = item.created_date || new Date().toISOString();
        const category = mapCategory(item.complaint_type || "");
        const department = mapDepartment(item.agency_name || item.agency || "Public Works");
        
        let priority: "Low" | "Medium" | "High" | "Critical" = "Medium";
        if (item.complaint_type?.toLowerCase().includes("water") || item.complaint_type?.toLowerCase().includes("fire") || item.complaint_type?.toLowerCase().includes("gas")) {
          priority = "High";
        } else if (item.complaint_type?.toLowerCase().includes("hazardous") || item.complaint_type?.toLowerCase().includes("structural")) {
          priority = "Critical";
        }

        let status: "Open" | "Assigned" | "In Progress" | "Resolved" = "Open";
        const itemStatus = String(item.status || "Open").toLowerCase();
        if (itemStatus.includes("closed") || itemStatus.includes("resolved")) {
          status = "Resolved";
        } else if (itemStatus.includes("progress")) {
          status = "In Progress";
        } else if (itemStatus.includes("assign")) {
          status = "Assigned";
        }

        const title = item.descriptor || item.complaint_type || "Municipal Concern Registered";
        const description = item.resolution_description || `Citizen logged a complaint regarding: ${title}. Located at ${item.incident_address || "Community Boundary"}.`;
        const location = item.incident_address || item.street_name || "Community Boundary";

        const suggested_action = generateSuggestedAction(title, category);

        records.push({
          id,
          timestamp,
          title,
          description: truncateString(description, 200),
          location,
          category,
          priority,
          department,
          status,
          suggested_action,
        });
      }

      if (records.length === 0) {
        throw new Error("No open datasets returned from Socrata.");
      }

      // Cache for 10 minutes
      this.setCached(cacheKey, records, 10 * 60 * 1000);

      // Save to Firestore & local
      await this.saveHistory(records);

      return records;
    } catch (err: any) {
      logStructured("WARNING", "Failed to retrieve live NYC Open Gov datasets. Using fallbacks.", { error: err.message });
      // Safe fallback list matching original complaints
      return [
        {
          id: "COMP-101",
          timestamp: new Date().toISOString(),
          title: "Severe Water Leak on Elm St",
          description: "Water is bubbling up from the pavement near 455 Elm Street. Large puddle forming and obstructing traffic.",
          location: "455 Elm St",
          category: "Water & Utilities",
          priority: "High",
          department: "Water Department",
          status: "Open",
          suggested_action: "Shut off local water valve block 14B and patch main line."
        },
        {
          id: "COMP-102",
          timestamp: new Date().toISOString(),
          title: "Hazardous Deep Pothole",
          description: "Extremely deep pothole in the center lane of North Ring Road. Already saw two cars clip it and pull over with flat tires.",
          location: "North Ring Road (near Exit 4)",
          category: "Urban Mobility",
          priority: "Critical",
          department: "Public Works",
          status: "In Progress",
          suggested_action: "Dispatch hot-mix asphalt crew to repair immediately; place caution cones."
        }
      ];
    }
  }

  private async saveHistory(records: ComplaintRecord[]): Promise<void> {
    for (const record of records) {
      await saveToFirestore("complaints_live", record.id, record);
    }

    try {
      const dirPath = path.join(process.cwd(), "src", "data", "history");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const historyFile = path.join(dirPath, "complaints_history.json");
      fs.writeFileSync(historyFile, JSON.stringify(records, null, 2), "utf-8");
    } catch (e: any) {
      console.warn("Local history saving failed for complaints", e.message);
    }
  }
}

function truncateString(str: string, num: number) {
  if (str.length <= num) return str;
  return str.slice(0, num) + "...";
}

function mapCategory(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("water") || t.includes("sewer") || t.includes("hydrant")) return "Water & Utilities";
  if (t.includes("street light") || t.includes("power") || t.includes("electric")) return "Smart Utilities";
  if (t.includes("pothole") || t.includes("traffic") || t.includes("street") || t.includes("sidewalk")) return "Urban Mobility";
  if (t.includes("garbage") || t.includes("trash") || t.includes("sanitation") || t.includes("dumping")) return "Garbage & Waste";
  return "General Inquiries";
}

function mapDepartment(agency: string): string {
  const a = agency.toLowerCase();
  if (a.includes("dep") || a.includes("environmental") || a.includes("water")) return "Water Department";
  if (a.includes("dot") || a.includes("transportation") || a.includes("works") || a.includes("mobility")) return "Public Works";
  if (a.includes("power") || a.includes("coned") || a.includes("electrical")) return "Electrical & Power";
  if (a.includes("dsny") || a.includes("sanitation") || a.includes("waste") || a.includes("garbage")) return "Waste Management";
  return "Public Safety & Administration";
}

function generateSuggestedAction(title: string, category: string): string {
  const t = title.toLowerCase();
  if (category === "Water & Utilities") {
    return "Dispatch hydro-excavator crew to locate the main leak, close pressure valve block, and secure surrounding pipes.";
  }
  if (category === "Urban Mobility") {
    if (t.includes("pothole")) return "Assign rapid response patching team with infrared asphalt heater to seal and roll the defect.";
    return "Deploy traffic safety technicians to realign dividers and inspect sign readability.";
  }
  if (category === "Smart Utilities") {
    return "Route field engineer to inspect photodiode sensors, trace wiring circuit node, and replace with high-efficiency LED.";
  }
  if (category === "Garbage & Waste") {
    return "Dispatch compactor carrier to clear debris, perform post-collection pressure washing, and cite license plates via OCR cameras.";
  }
  return "Review municipal incident ticket and assign to local inspector for scheduled site validation.";
}
