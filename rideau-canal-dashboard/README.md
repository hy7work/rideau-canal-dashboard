# Rideau Canal Dashboard

## Overview
This repository contains the **web dashboard** for the Rideau Canal Skateway monitoring system. It displays near real-time aggregated data stored in **Azure Cosmos DB** and presents it in a clean dashboard with location cards, safety badges, and historical charts.

### Dashboard Features
- Real-time location cards for **Dow's Lake**, **Fifth Avenue**, and **NAC**
- Safety status badges: **Safe**, **Caution**, **Unsafe**
- Auto-refresh every **30 seconds**
- Historical trend charts for the **last hour**
- Overall system status summary

### Technologies Used
- Node.js
- Express
- Azure Cosmos DB SDK
- HTML / CSS / JavaScript
- Chart.js

## Prerequisites
- Node.js 18+
- Azure Cosmos DB account
- A Cosmos DB database and container populated by Azure Stream Analytics

## Installation
```bash
npm install
```

## Configuration
1. Copy `.env.example` to `.env`
2. Set your real Cosmos DB values:
```env
PORT=3000
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=replace_me
COSMOS_DATABASE=RideauCanalDB
COSMOS_CONTAINER=SensorAggregations
```

## Run Locally
```bash
npm start
```
Then open:
```text
http://localhost:3000
```

> Note: If Cosmos DB is not configured, the app uses **mock fallback data** so the front-end can still be previewed locally.

## API Endpoints
### `GET /api/health`
Returns application health and configuration status.

### `GET /api/latest`
Returns the newest aggregation record for each location.

### `GET /api/trends`
Returns the last hour of aggregated records for chart rendering.

### `GET /api/status`
Returns the overall system status and metadata for the dashboard header.

See `docs/api-documentation.md` for examples.

## Deployment to Azure App Service
### Step-by-step
1. Create an Azure App Service for Node.js
2. Set the startup command to use `npm start` if required
3. Add the environment variables from `.env.example` into **Configuration > Application settings**
4. Deploy using one of these methods:
   - Local Git
   - GitHub Actions
   - Zip deploy
5. Browse to the App Service URL and confirm live data loads

### Configuration Settings
At minimum, configure:
- `PORT`
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`

## Dashboard Features Explained
### Real-time updates
The page refreshes every 30 seconds by calling the back-end endpoints.

### Charts and visualizations
Two line charts display:
- Average ice thickness over time
- Average surface temperature over time

### Safety status indicators
Safety status is shown using badges and is derived from the aggregated metrics written by Stream Analytics.

## Troubleshooting
### 1. Dashboard loads but shows no live data
- Check Cosmos DB connection values
- Confirm Stream Analytics is writing documents to the correct database and container

### 2. App works locally but not on Azure
- Confirm all App Service environment variables are set correctly
- Make sure the app listens on `process.env.PORT`

### 3. Charts are blank
- Ensure trend records exist in Cosmos DB for the last hour
- Confirm the container contains valid `windowEnd` timestamps
