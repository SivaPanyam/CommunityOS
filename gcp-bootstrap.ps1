# ==============================================================================
# SMART CITY OS - GOOGLE CLOUD PLATFORM BOOTSTRAP SCRIPT (WINDOWS POWERSHELL)
# ==============================================================================
# This script sets up all required GCP resources for the Smart City OS
# production environment. Make sure you are authenticated with 'gcloud auth login'.
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Blue
Write-Host "        SMART CITY OS: GOOGLE CLOUD SERVICE BOOTSTRAPPER (PS)" -ForegroundColor Blue
Write-Host "======================================================================" -ForegroundColor Blue

# Detect current project
$projectId = (gcloud config get-value project 2>$null)
if (-not $projectId) {
    Write-Host "Error: No active Google Cloud Project detected." -ForegroundColor Red
    Write-Host "Please set one using: gcloud config set project <PROJECT_ID>" -ForegroundColor Yellow
    Exit 1
}

Write-Host "Target Project ID: $projectId" -ForegroundColor Green

# Define constants
$region = "asia-southeast1"
$arRepo = "smart-city-apps"
$serviceName = "smart-city-os"
$ragBucket = "$projectId-smart-city-rag-bucket"
$uploadsBucket = "$projectId-smart-city-rag-uploads"
$pubsubTopic = "municipal-events-topic"
$bqDataset = "smartcity_dataset"

# 1. Enable Required Google Cloud APIs
Write-Host "`n[1/7] Enabling Required Cloud APIs..." -ForegroundColor Blue
$apis = @(
    "run.googleapis.com",
    "firestore.googleapis.com",
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling API: $api..." -ForegroundColor Yellow
    gcloud services enable $api --quiet
}
Write-Host "All required Cloud APIs enabled successfully." -ForegroundColor Green

# 2. Configure Artifact Registry
Write-Host "`n[2/7] Creating Artifact Registry Repository..." -ForegroundColor Blue
$arRepoExists = (gcloud artifacts repositories describe $arRepo --location=$region 2>$null)
if ($arRepoExists) {
    Write-Host "Artifact Registry repository '$arRepo' already exists." -ForegroundColor Green
} else {
    gcloud artifacts repositories create $arRepo `
        --repository-format=docker `
        --location=$region `
        --description="Smart City OS Docker Repository" `
        --quiet
    Write-Host "Artifact Registry repository '$arRepo' created in $region." -ForegroundColor Green
}

# 3. Provision Cloud Storage Buckets
Write-Host "`n[3/7] Creating Cloud Storage Buckets..." -ForegroundColor Blue

# RAG state bucket
$ragBucketExists = (gcloud storage buckets describe "gs://$ragBucket" 2>$null)
if ($ragBucketExists) {
    Write-Host "Bucket '$ragBucket' already exists." -ForegroundColor Green
} else {
    gcloud storage buckets create "gs://$ragBucket" --location=$region --quiet
    gcloud storage buckets update "gs://$ragBucket" --uniform-bucket-level-access --quiet
    Write-Host "Bucket gs://$ragBucket created." -ForegroundColor Green
}

# Uploads bucket
$uploadsBucketExists = (gcloud storage buckets describe "gs://$uploadsBucket" 2>$null)
if ($uploadsBucketExists) {
    Write-Host "Bucket '$uploadsBucket' already exists." -ForegroundColor Green
} else {
    gcloud storage buckets create "gs://$uploadsBucket" --location=$region --quiet
    gcloud storage buckets update "gs://$uploadsBucket" --uniform-bucket-level-access --quiet
    Write-Host "Bucket gs://$uploadsBucket created." -ForegroundColor Green
}

# 4. Initialize Firestore Database
Write-Host "`n[4/7] Checking Firestore Database..." -ForegroundColor Blue
$firestoreExists = (gcloud firestore databases describe --database="(default)" 2>$null)
if ($firestoreExists) {
    Write-Host "Firestore (default) database already active." -ForegroundColor Green
} else {
    Write-Host "Creating Firestore database (default) in native mode..." -ForegroundColor Yellow
    gcloud firestore databases create --location=$region --type=firestore-native --quiet
    Write-Host "Firestore database created successfully." -ForegroundColor Green
}

# 5. Create Pub/Sub Topics
Write-Host "`n[5/7] Configuring Pub/Sub Topics..." -ForegroundColor Blue
$pubsubExists = (gcloud pubsub topics describe $pubsubTopic 2>$null)
if ($pubsubExists) {
    Write-Host "Pub/Sub Topic '$pubsubTopic' already exists." -ForegroundColor Green
} else {
    gcloud pubsub topics create $pubsubTopic --quiet
    Write-Host "Pub/Sub Topic '$pubsubTopic' created." -ForegroundColor Green
}

# 6. Create BigQuery Dataset & Schema Tables
Write-Host "`n[6/7] Creating BigQuery Dataset & Tables..." -ForegroundColor Blue
$bqExists = (bq show "${projectId}:${bqDataset}" 2>$null)
if ($bqExists) {
    Write-Host "BigQuery Dataset '$bqDataset' already exists." -ForegroundColor Green
} else {
    bq --project_id=$projectId mk --location=$region --dataset $bqDataset
    Write-Host "BigQuery Dataset '$bqDataset' created." -ForegroundColor Green
}

# Create complaints schema table
$complaintsSchema = "id:STRING,timestamp:STRING,title:STRING,description:STRING,location:STRING,category:STRING,priority:STRING,department:STRING,status:STRING,image_url:STRING,suggested_action:STRING"
$complaintsTableExists = (bq show "${projectId}:${bqDataset}.complaints_table" 2>$null)
if ($complaintsTableExists) {
    Write-Host "BigQuery Complaints Table already exists." -ForegroundColor Green
} else {
    bq mk --table "${projectId}:${bqDataset}.complaints_table" $complaintsSchema
    Write-Host "BigQuery Complaints Table created with schema." -ForegroundColor Green
}

# Create decisions schema table
$decisionsSchema = "id:STRING,dispatchId:STRING,timestamp:STRING,title:STRING,department:STRING,sector:STRING,status:STRING,report:STRING"
$decisionsTableExists = (bq show "${projectId}:${bqDataset}.decisions_table" 2>$null)
if ($decisionsTableExists) {
    Write-Host "BigQuery Decisions Table already exists." -ForegroundColor Green
} else {
    bq mk --table "${projectId}:${bqDataset}.decisions_table" $decisionsSchema
    Write-Host "BigQuery Decisions Table created with schema." -ForegroundColor Green
}

# 7. Setup Secret Manager for Gemini API Key
Write-Host "`n[7/7] Setting up Secret Manager..." -ForegroundColor Blue
$secretExists = (gcloud secrets describe GEMINI_API_KEY 2>$null)
if ($secretExists) {
    Write-Host "Secret 'GEMINI_API_KEY' already exists in Secret Manager." -ForegroundColor Green
} else {
    gcloud secrets create GEMINI_API_KEY --replication-policy="automatic" --quiet
    $secretVal = Read-Host "Please enter your Gemini API Key to store as a secret (leave blank to skip, you can add it later)"
    if ($secretVal) {
        [System.IO.File]::WriteAllText("$env:TEMP\secret.txt", $secretVal)
        gcloud secrets versions add GEMINI_API_KEY --data-file="$env:TEMP\secret.txt"
        Remove-Item "$env:TEMP\secret.txt" -Force
        Write-Host "Gemini API Key successfully saved in Secret Manager!" -ForegroundColor Green
    } else {
        Write-Host "Skipped secret value addition. Make sure to populate GEMINI_API_KEY before running the service!" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "        BOOTSTRAP COMPLETED SUCCESSFULLY FOR PROJECT $projectId" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "You can now build and deploy the Smart City OS using Cloud Build:"
Write-Host "  gcloud builds submit --config=cloudbuild.yaml ``" -ForegroundColor Yellow
Write-Host "    --substitutions=_REGION=$region,_AR_REPO=$arRepo,_SERVICE_NAME=$serviceName" -ForegroundColor Yellow
Write-Host ""
