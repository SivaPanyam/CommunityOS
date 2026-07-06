import { BaseService } from "./BaseService";
import { saveToFirestore, logStructured } from "../gcp";
import fs from "fs";
import path from "path";

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

export class AQIService extends BaseService {
  private static instance: AQIService;

  public static getInstance(): AQIService {
    if (!AQIService.instance) {
      AQIService.instance = new AQIService();
    }
    return AQIService.instance;
  }

  private getRiskStatus(aqi: number): string {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  public async fetchAQI(lat: number, lng: number, locationName = "Downtown"): Promise<AQIRecord> {
    const cacheKey = `aqi_${lat.toFixed(4)}_${lng.toFixed(4)}_${locationName}`;
    const cached = this.getCached<AQIRecord>(cacheKey);
    if (cached) return cached;

    // Use Open-Meteo Air Quality API
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,carbon_monoxide,ozone`;

    try {
      const data = await this.fetchWithRetry(url);
      const current = data.current;

      const aqiVal = Math.round(current.us_aqi || 42);

      const record: AQIRecord = {
        timestamp: new Date().toISOString(),
        location: locationName,
        aqi: aqiVal,
        pm2_5: Number((current.pm2_5 || 11.2).toFixed(1)),
        pm10: Number((current.pm10 || 22.4).toFixed(1)),
        no2: Number((current.nitrogen_dioxide || 15.6).toFixed(1)),
        co: Number(((current.carbon_monoxide || 350) / 1000).toFixed(2)), // convert microg to mg/m3 approx
        o3: Number((current.ozone || 32.1).toFixed(1)),
        risk_status: this.getRiskStatus(aqiVal),
      };

      // Cache for 15 minutes
      this.setCached(cacheKey, record, 15 * 60 * 1000);

      // Save historical state
      await this.saveHistory(record, lat, lng);

      return record;
    } catch (err: any) {
      logStructured("ERROR", `Failed to fetch AQI for ${locationName} from Open-Meteo API. Using fallback.`, { error: err.message });
      // Fallback
      return {
        timestamp: new Date().toISOString(),
        location: locationName,
        aqi: 55,
        pm2_5: 14.5,
        pm10: 28.0,
        no2: 12.0,
        co: 0.45,
        o3: 35.0,
        risk_status: "Moderate",
      };
    }
  }

  private async saveHistory(data: AQIRecord, lat: number, lng: number): Promise<void> {
    const docId = `aqi_${Date.now()}_${data.location.replace(/\s+/g, "_")}`;
    const payload = { ...data, latitude: lat, longitude: lng };
    await saveToFirestore("aqi_history", docId, payload);

    // Persist locally in workspace
    try {
      const dirPath = path.join(process.cwd(), "src", "data", "history");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const historyFile = path.join(dirPath, "aqi_history.json");
      let list: any[] = [];
      if (fs.existsSync(historyFile)) {
        try {
          list = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
        } catch {
          list = [];
        }
      }
      list.push(payload);
      if (list.length > 100) list.shift();
      fs.writeFileSync(historyFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (e: any) {
      console.warn("Local history saving failed for AQI", e.message);
    }
  }
}
