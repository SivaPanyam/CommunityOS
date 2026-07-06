import { BaseService } from "./BaseService";
import { getSecret, isGcpEnabled, logStructured } from "../gcp";

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  trafficDelaySeconds: number;
  congestionIndex: number; // 0.0 to 1.0 based on traffic delay
}

export class GoogleMapsService extends BaseService {
  private static instance: GoogleMapsService;
  private apiKey: string | null = null;

  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  private async getApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    
    // First try process.env
    let key = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
    if (!key && isGcpEnabled()) {
      // Try secret manager in production
      key = await getSecret("GOOGLE_MAPS_PLATFORM_KEY", "");
    }
    
    if (key && key !== "YOUR_API_KEY") {
      this.apiKey = key;
      return key;
    }
    return null;
  }

  /**
   * Compute route info between two coordinates using the official Google Maps Routes API (New)
   */
  public async computeRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteMetrics> {
    const key = await this.getApiKey();
    if (!key) {
      logStructured("WARNING", "Google Maps Platform API Key is not configured. Falling back to calculated metrics.");
      return this.calculateCalculatedMetrics(origin, destination);
    }

    const cacheKey = `gmp_route_${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}`;
    const cached = this.getCached<RouteMetrics>(cacheKey);
    if (cached) return cached;

    const url = "https://routes.googleapis.com/v1/computeRoutes";
    const body = {
      origin: {
        location: {
          latLng: origin,
        },
      },
      destination: {
        location: {
          latLng: destination,
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-Fieldmask": "routes.duration,routes.distanceMeters,routes.staticDuration",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Google Maps Routes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) {
        throw new Error("No route returned from Google Maps Routes API.");
      }

      const distanceMeters = Number(route.distanceMeters || 0);
      
      // Durations are strings like "350s"
      const durationSeconds = parseDurationString(route.duration);
      const staticDurationSeconds = parseDurationString(route.staticDuration || route.duration);
      
      const trafficDelaySeconds = Math.max(0, durationSeconds - staticDurationSeconds);
      
      // Calculate congestion index (0 to 1) based on delay relative to static duration
      const delayRatio = staticDurationSeconds > 0 ? trafficDelaySeconds / staticDurationSeconds : 0;
      const congestionIndex = Math.min(0.95, Math.max(0.05, delayRatio * 1.5));

      const metrics: RouteMetrics = {
        distanceMeters,
        durationSeconds,
        staticDurationSeconds,
        trafficDelaySeconds,
        congestionIndex,
      };

      // Cache for 5 minutes (traffic is real-time and volatile)
      this.setCached(cacheKey, metrics, 5 * 60 * 1000);
      return metrics;
    } catch (err: any) {
      logStructured("ERROR", "Failed to compute route from Google Maps Routes API.", { error: err.message });
      return this.calculateCalculatedMetrics(origin, destination);
    }
  }

  /**
   * Fallback using straight-line distance calculations with synthetic congestion
   */
  private calculateCalculatedMetrics(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): RouteMetrics {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c * 1.3); // Multiply by 1.3 for driving road factor

    // Estimate static duration at 50 km/h (13.88 m/s)
    const staticDurationSeconds = Math.round(distanceMeters / 13.88);
    
    // Add realistic dynamic noise for traffic delay
    const seed = Date.now() + distanceMeters;
    const randomFactor = (Math.sin(seed) + 1) / 2; // 0 to 1
    const trafficDelaySeconds = Math.round(staticDurationSeconds * randomFactor * 0.4); // up to 40% delay
    const durationSeconds = staticDurationSeconds + trafficDelaySeconds;

    const congestionIndex = Math.min(0.95, Math.max(0.05, (trafficDelaySeconds / staticDurationSeconds) * 1.8));

    return {
      distanceMeters,
      durationSeconds,
      staticDurationSeconds,
      trafficDelaySeconds,
      congestionIndex,
    };
  }
}

function parseDurationString(durStr: string): number {
  if (!durStr) return 0;
  // Format: "350s"
  return Number(durStr.replace("s", ""));
}
