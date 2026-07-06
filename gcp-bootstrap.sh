#!/usr/bin/env bash
# ==============================================================================
# SMART CITY OS - GOOGLE CLOUD PLATFORM BOOTSTRAP SCRIPT
# ==============================================================================
# This script sets up all required GCP resources for the Smart City OS
# production environment. Make sure you are authenticated with 'gcloud auth login'.
# ==============================================================================

set -euo pipefail

# Colors for elegant terminal logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}        SMART CITY OS: GOOGLE CLOUD SERVICE BOOTSTRAPPER${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Detect current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "${PROJECT_ID}" ]; then
  echo -e "${RED}Error: No active Google Cloud Project detected.${NC}"
  echo "Please set one using: gcloud config set project <PROJECT_ID>"
  exit 1
fi

echo -e "Target Project ID: ${GREEN}${PROJECT_ID}${NC}"

# Define constants
REGION="asia-southeast1"
AR_REPO="smart-city-apps"
SERVICE_NAME="smart-city-os"
RAG_BUCKET="${PROJECT_ID}-smart-city-rag-bucket"
UPLOADS_BUCKET="${PROJECT_ID}-smart-city-rag-uploads"
PUBSUB_TOPIC="municipal-events-topic"
BQ_DATASET="smartcity_dataset"

# 1. Enable Required Google Cloud APIs
echo -e "\n${BLUE}[1/7] Enabling Required Cloud APIs...${NC}"
APIS=(
  "run.googleapis.com"
  "firestore.googleapis.com"
  "pubsub.googleapis.com"
  "bigquery.googleapis.com"
  "secretmanager.googleapis.com"
  "artifactregistry.googleapis.com"
  "cloudbuild.googleapis.com"
  "logging.googleapis.com"
  "monitoring.googleapis.com"
)

for API in "${APIS[@]}"; do
  echo -e "Enabling API: ${YELLOW}${API}${NC}..."
  gcloud services enable "${API}" --quiet
done
echo -e "${GREEN}All required Cloud APIs enabled successfully.${NC}"

# 2. Configure Artifact Registry
echo -e "\n${BLUE}[2/7] Creating Artifact Registry Repository...${NC}"
if gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" &>/dev/null; then
  echo -e "${GREEN}Artifact Registry repository '${AR_REPO}' already exists.${NC}"
else
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Smart City OS Docker Repository" \
    --quiet
  echo -e "${GREEN}Artifact Registry repository '${AR_REPO}' created in ${REGION}.${NC}"
fi

# 3. Provision Cloud Storage Buckets
echo -e "\n${BLUE}[3/7] Creating Cloud Storage Buckets...${NC}"
# RAG state bucket
if gcloud storage buckets describe "gs://${RAG_BUCKET}" &>/dev/null; then
  echo -e "${GREEN}Bucket '${RAG_BUCKET}' already exists.${NC}"
else
  gcloud storage buckets create "gs://${RAG_BUCKET}" --location="${REGION}" --quiet
  # Enable uniform bucket-level access for security
  gcloud storage buckets update "gs://${RAG_BUCKET}" --uniform-bucket-level-access --quiet
  echo -e "${GREEN}Bucket gs://${RAG_BUCKET} created.${NC}"
fi

# Uploads bucket
if gcloud storage buckets describe "gs://${UPLOADS_BUCKET}" &>/dev/null; then
  echo -e "${GREEN}Bucket '${UPLOADS_BUCKET}' already exists.${NC}"
else
  gcloud storage buckets create "gs://${UPLOADS_BUCKET}" --location="${REGION}" --quiet
  gcloud storage buckets update "gs://${UPLOADS_BUCKET}" --uniform-bucket-level-access --quiet
  echo -e "${GREEN}Bucket gs://${UPLOADS_BUCKET} created.${NC}"
fi

# 4. Initialize Firestore Database
echo -e "\n${BLUE}[4/7] Checking Firestore Database...${NC}"
# Check if database (default) exists, create if not
if gcloud firestore databases describe --database="(default)" &>/dev/null; then
  echo -e "${GREEN}Firestore (default) database already active.${NC}"
else
  echo -e "${YELLOW}Creating Firestore database (default) in native mode...${NC}"
  gcloud firestore databases create --location="${REGION}" --type=firestore-native --quiet
  echo -e "${GREEN}Firestore database created successfully.${NC}"
fi

# 5. Create Pub/Sub Topics
echo -e "\n${BLUE}[5/7] Configuring Pub/Sub Topics...${NC}"
if gcloud pubsub topics describe "${PUBSUB_TOPIC}" &>/dev/null; then
  echo -e "${GREEN}Pub/Sub Topic '${PUBSUB_TOPIC}' already exists.${NC}"
else
  gcloud pubsub topics create "${PUBSUB_TOPIC}" --quiet
  echo -e "${GREEN}Pub/Sub Topic '${PUBSUB_TOPIC}' created.${NC}"
fi

# 6. Create BigQuery Dataset & Schema Tables
echo -e "\n${BLUE}[6/7] Creating BigQuery Dataset & Tables...${NC}"
if bq show "${PROJECT_ID}:${BQ_DATASET}" &>/dev/null; then
  echo -e "${GREEN}BigQuery Dataset '${BQ_DATASET}' already exists.${NC}"
else
  bq --project_id="${PROJECT_ID}" mk --location="${REGION}" --dataset "${BQ_DATASET}"
  echo -e "${GREEN}BigQuery Dataset '${BQ_DATASET}' created.${NC}"
fi

# Create complaints schema table
COMPLAINTS_SCHEMA="id:STRING,timestamp:STRING,title:STRING,description:STRING,location:STRING,category:STRING,priority:STRING,department:STRING,status:STRING,image_url:STRING,suggested_action:STRING"
if bq show "${PROJECT_ID}:${BQ_DATASET}.complaints_table" &>/dev/null; then
  echo -e "${GREEN}BigQuery Complaints Table already exists.${NC}"
else
  bq mk --table "${PROJECT_ID}:${BQ_DATASET}.complaints_table" "${COMPLAINTS_SCHEMA}"
  echo -e "${GREEN}BigQuery Complaints Table created with schema.${NC}"
fi

# Create decisions schema table
DECISIONS_SCHEMA="id:STRING,dispatchId:STRING,timestamp:STRING,title:STRING,department:STRING,sector:STRING,status:STRING,report:STRING"
if bq show "${PROJECT_ID}:${BQ_DATASET}.decisions_table" &>/dev/null; then
  echo -e "${GREEN}BigQuery Decisions Table already exists.${NC}"
else
  bq mk --table "${PROJECT_ID}:${BQ_DATASET}.decisions_table" "${DECISIONS_SCHEMA}"
  echo -e "${GREEN}BigQuery Decisions Table created with schema.${NC}"
fi

# 7. Setup Secret Manager for Gemini API Key
echo -e "\n${BLUE}[7/7] Setting up Secret Manager...${NC}"
if gcloud secrets describe GEMINI_API_KEY &>/dev/null; then
  echo -e "${GREEN}Secret 'GEMINI_API_KEY' already exists in Secret Manager.${NC}"
else
  gcloud secrets create GEMINI_API_KEY --replication-policy="automatic" --quiet
  echo -e "${YELLOW}Please enter your Gemini API Key to store as a secret (leave blank to skip, you can add it later):${NC}"
  read -r -s SECRET_VAL
  if [ -n "${SECRET_VAL}" ]; then
    echo -n "${SECRET_VAL}" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
    echo -e "${GREEN}Gemini API Key successfully saved in Secret Manager!${NC}"
  else
    echo "Skipped secret value addition. Make sure to populate GEMINI_API_KEY before running the service!"
  fi
fi

# Summary
echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}        BOOTSTRAP COMPLETED SUCCESSFULLY FOR PROJECT ${PROJECT_ID}${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "You can now build and deploy the Smart City OS using Cloud Build:"
echo -e "  ${YELLOW}gcloud builds submit --config=cloudbuild.yaml \\${NC}"
echo -e "    ${YELLOW}--substitutions=_REGION=${REGION},_AR_REPO=${AR_REPO},_SERVICE_NAME=${SERVICE_NAME}${NC}"
echo ""
