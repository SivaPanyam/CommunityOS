import { BaseService } from "./BaseService";
import { saveToFirestore, logStructured } from "../gcp";
import fs from "fs";
import path from "path";

export interface WeatherData {
  timestamp: string;
  temperature_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  condition: string;
  warnings: string;
}

export class WeatherService extends BaseService {
  private static instance: WeatherService;

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  // WMO Weather interpretation codes
  private mapWeatherCode(code: number): { condition: string; warning: string } {
    if (code === 0) return { condition: "Clear", warning: "None" };
    if (code >= 1 && code <= 3) return { condition: "Overcast", warning: "None" };
    if (code === 45 || code === 48) return { condition: "Foggy", warning: "Fog Advisory" };
    if (code >= 51 && code <= 55) return { condition: "Drizzle", warning: "None" };
    if (code >= 61 && code <= 65) return { condition: "Light Rain", warning: "None" };
    if (code >= 80 && code <= 82) return { condition: "Rain", warning: "Rain Advisory" };
    if (code === 71 || code === 73 || code === 75 || code === 85 || code === 86) return { condition: "Snowing", warning: "Winter Advisory" };
    if (code >= 95 && code <= 99) return { condition: "Thunderstorm", warning: "Severe Thunderstorm Warning" };
    return { condition: "Cloudy", warning: "None" };
  }

  public async fetchWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `weather_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.getCached<WeatherData>(cacheKey);
    if (cached) return cached;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`;

    try {
      const data = await this.fetchWithRetry(url);
      const current = data.current;
      const { condition, warning } = this.mapWeatherCode(current.weather_code);

      const weather: WeatherData = {
        timestamp: new Date().toISOString(),
        temperature_c: Number(current.temperature_2m.toFixed(1)),
        humidity_pct: Math.round(current.relative_humidity_2m),
        rainfall_mm: Number(current.precipitation.toFixed(1)),
        wind_speed_kmh: Number(current.wind_speed_10m.toFixed(1)),
        condition,
        warnings: weatherWarningHeuristics(Number(current.precipitation), Number(current.wind_speed_10m), warning),
      };

      // Cache for 15 minutes
      this.setCached(cacheKey, weather, 15 * 60 * 1000);

      // Save historical state
      await this.saveHistory(weather, lat, lng);

      return weather;
    } catch (err: any) {
      logStructured("ERROR", "Failed to fetch weather from Open-Meteo API. Using fallback.", { error: err.message });
      // Return safe standard fallback
      return {
        timestamp: new Date().toISOString(),
        temperature_c: 24.5,
        humidity_pct: 78,
        rainfall_mm: 0.0,
        wind_speed_kmh: 12.0,
        condition: "Clear",
        warnings: "None",
      };
    }
  }

  private async saveHistory(data: WeatherData, lat: number, lng: number): Promise<void> {
    // Save to firestore if GCP active
    const docId = `weather_${Date.now()}`;
    const payload = { ...data, latitude: lat, longitude: lng };
    await saveToFirestore("weather_history", docId, payload);

    // Also persist locally in workspace
    try {
      const dirPath = path.join(process.cwd(), "src", "data", "history");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const historyFile = path.join(dirPath, "weather_history.json");
      let list: any[] = [];
      if (fs.existsSync(historyFile)) {
        try {
          list = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
        } catch {
          list = [];
        }
      }
      list.push(payload);
      // keep last 50
      if (list.length > 50) list.shift();
      fs.writeFileSync(historyFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (e: any) {
      console.warn("Local history saving failed for weather", e.message);
    }
  }
}

function weatherWarningHeuristics(rainfall: number, wind: number, baseWarning: string): string {
  if (rainfall > 10.0) return "Flash Flood Warning";
  if (rainfall > 5.0) return "Flood Advisory";
  if (wind > 45.0) return "High Wind Warning";
  if (wind > 30.0) return "Wind Advisory";
  return baseWarning;
}
