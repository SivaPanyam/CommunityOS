import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";
import { PubSub } from "@google-cloud/pubsub";
import { BigQuery } from "@google-cloud/bigquery";
import { Logging } from "@google-cloud/logging";
import { MetricServiceClient } from "@google-cloud/monitoring";
import fs from "fs";
import path from "path";

// Detect if we are in production Google Cloud mode
export function isGcpEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ENV_MODE === "production" ||
    !!process.env.GOOGLE_CLOUD_PROJECT ||
    !!process.env.K_SERVICE // K_SERVICE is auto-set in Cloud Run
  );
}

// ---------------------------------------------------------
// 1. Secret Manager Service
// ---------------------------------------------------------
let secretClient: SecretManagerServiceClient | null = null;

export async function getSecret(secretName: string, defaultValue: string = ""): Promise<string> {
  if (!isGcpEnabled()) {
    return process.env[secretName] || defaultValue;
  }

  try {
    if (!secretClient) {
      secretClient = new SecretManagerServiceClient();
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "smart-city-os-project";
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await secretClient.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    return payload || defaultValue;
  } catch (err: any) {
    console.warn(`[Secret Manager] Failed to load secret ${secretName} from Cloud. Falling back to env:`, err.message);
    return process.env[secretName] || defaultValue;
  }
}

// ---------------------------------------------------------
// 2. Cloud Storage Service
// ---------------------------------------------------------
let storageClient: Storage | null = null;

function getStorage(): Storage | null {
  if (!isGcpEnabled()) return null;
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
}

export async function uploadToBucket(bucketName: string, fileName: string, content: string | Buffer): Promise<boolean> {
  const storage = getStorage();
  if (!storage) {
    // Local fallback: write to temp/local folder
    try {
      const localPath = path.join(process.cwd(), "src", "data", "local_gcs_fallback", bucketName);
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      fs.writeFileSync(path.join(localPath, fileName), content);
      return true;
    } catch (err) {
      console.error("[Storage Fallback] Write failed:", err);
      return false;
    }
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    await file.save(content);
    return true;
  } catch (err: any) {
    console.error(`[Cloud Storage] Error uploading file ${fileName} to bucket ${bucketName}:`, err.message);
    return false;
  }
}

export async function downloadFromBucket(bucketName: string, fileName: string): Promise<string | null> {
  const storage = getStorage();
  if (!storage) {
    // Local fallback: read from temp/local folder
    try {
      const localFilePath = path.join(process.cwd(), "src", "data", "local_gcs_fallback", bucketName, fileName);
      if (fs.existsSync(localFilePath)) {
        return fs.readFileSync(localFilePath, "utf-8");
      }
      return null;
    } catch (err) {
      console.error("[Storage Fallback] Read failed:", err);
      return null;
    }
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return content.toString("utf-8");
  } catch (err: any) {
    console.error(`[Cloud Storage] Error downloading file ${fileName} from bucket ${bucketName}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------
// 3. Firestore Service (Persisting app state)
// ---------------------------------------------------------
let firestoreClient: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (!isGcpEnabled()) return null;
  if (!firestoreClient) {
    firestoreClient = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || undefined,
    });
  }
  return firestoreClient;
}

export async function saveToFirestore(collectionPath: string, docId: string, data: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    await db.collection(collectionPath).doc(docId).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore] Error writing to collection ${collectionPath} document ${docId}:`, err.message);
    return false;
  }
}

export async function fetchCollectionFromFirestore(collectionPath: string): Promise<any[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(collectionPath).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err: any) {
    console.error(`[Firestore] Error reading collection ${collectionPath}:`, err.message);
    return [];
  }
}

// ---------------------------------------------------------
// 4. Pub/Sub Service (Event processing & workflows)
// ---------------------------------------------------------
let pubSubClient: PubSub | null = null;

function getPubSub(): PubSub | null {
  if (!isGcpEnabled()) return null;
  if (!pubSubClient) {
    pubSubClient = new PubSub();
  }
  return pubSubClient;
}

export async function publishPubSubMessage(topicName: string, payload: any): Promise<string | null> {
  const pubsub = getPubSub();
  if (!pubsub) {
    console.log(`[Pub/Sub Fallback] Message to topic "${topicName}":`, JSON.stringify(payload));
    return "local-id";
  }

  try {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
    return messageId;
  } catch (err: any) {
    console.error(`[Pub/Sub] Failed to publish message to topic ${topicName}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------
// 5. BigQuery Service (Data Lake & Analytics Ingestion)
// ---------------------------------------------------------
let bigqueryClient: BigQuery | null = null;

function getBigQuery(): BigQuery | null {
  if (!isGcpEnabled()) return null;
  if (!bigqueryClient) {
    bigqueryClient = new BigQuery();
  }
  return bigqueryClient;
}

export async function insertBigQueryRow(datasetId: string, tableId: string, rows: any[]): Promise<boolean> {
  const bq = getBigQuery();
  if (!bq) {
    console.log(`[BigQuery Fallback] Inserted rows in ${datasetId}.${tableId}:`, rows.length);
    return true;
  }

  try {
    await bq.dataset(datasetId).table(tableId).insert(rows);
    return true;
  } catch (err: any) {
    // If the error details contain insertErrors, dump them
    if (err.errors) {
      console.error("[BigQuery] Insert details:", JSON.stringify(err.errors));
    } else {
      console.error(`[BigQuery] Failed to insert rows into ${datasetId}.${tableId}:`, err.message);
    }
    return false;
  }
}

// ---------------------------------------------------------
// 6. Cloud Logging (Structured logs for Stackdriver Logging)
// ---------------------------------------------------------
let cloudLogging: Logging | null = null;

export function initGcpLogging() {
  if (isGcpEnabled() && !cloudLogging) {
    cloudLogging = new Logging();
  }
}

export function logStructured(
  severity: "INFO" | "WARNING" | "ERROR" | "DEBUG",
  message: string,
  meta: any = {}
) {
  if (!isGcpEnabled()) {
    const prefix = `[${severity}] [LocalLog]`;
    if (severity === "ERROR") {
      console.error(prefix, message, JSON.stringify(meta));
    } else if (severity === "WARNING") {
      console.warn(prefix, message, JSON.stringify(meta));
    } else {
      console.log(prefix, message, JSON.stringify(meta));
    }
    return;
  }

  try {
    if (!cloudLogging) {
      cloudLogging = new Logging();
    }
    const log = cloudLogging.log("smart-city-os-log");
    const metadata = {
      severity: severity,
      resource: { type: "cloud_run_revision" },
    };
    const entry = log.entry(metadata, {
      message: message,
      timestamp: new Date().toISOString(),
      ...meta,
    });
    log.write(entry).catch((err: any) => {
      console.error("[Cloud Logging Error] Async write failed:", err.message);
      // fallback
      console.log(`[${severity}] [GCP Log Fallback]`, message, JSON.stringify(meta));
    });
  } catch (err: any) {
    console.error("[Cloud Logging Error] Failed to write structured log:", err.message);
    // fallback
    console.log(`[${severity}] [GCP Log Fallback]`, message, JSON.stringify(meta));
  }
}

// ---------------------------------------------------------
// 7. Cloud Monitoring Service (Custom operational metrics)
// ---------------------------------------------------------
let metricClientInstance: MetricServiceClient | null = null;

export async function sendCustomMetric(metricType: string, value: number): Promise<boolean> {
  if (!isGcpEnabled()) {
    console.log(`[Monitoring Fallback] Metric "${metricType}" = ${value}`);
    return true;
  }

  try {
    if (!metricClientInstance) {
      metricClientInstance = new MetricServiceClient();
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "smart-city-os-project";
    const name = `projects/${projectId}`;
    
    const timeSeriesData = {
      metric: {
        type: `custom.googleapis.com/smartcity/${metricType}`,
      },
      resource: {
        type: "global",
        labels: {
          project_id: projectId,
        },
      },
      points: [
        {
          interval: {
            endTime: {
              seconds: Math.floor(Date.now() / 1000),
            },
          },
          value: {
            doubleValue: value,
          },
        },
      ],
    };

    await metricClientInstance.createTimeSeries({
      name,
      timeSeries: [timeSeriesData],
    });
    return true;
  } catch (err: any) {
    console.error(`[Cloud Monitoring] Error sending metric ${metricType}:`, err.message);
    return false;
  }
}
