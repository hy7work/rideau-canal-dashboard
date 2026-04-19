// Load environment variables from .env file (COSMOS credentials, PORT, etc.)
require('dotenv').config();

const express = require('express');        // Web framework for building APIs
const path = require('path');              // Utility for handling file paths
const { CosmosClient } = require('@azure/cosmos'); // Azure Cosmos DB SDK

const app = express();                     // Create Express app
const PORT = process.env.PORT || 3000;     // Use environment port or default 3000

// Middleware to parse JSON requests
app.use(express.json());

// Serve static frontend files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Check if all required Cosmos DB environment variables exist
 */
const cosmosConfigPresent = Boolean(
  process.env.COSMOS_ENDPOINT &&
  process.env.COSMOS_KEY &&
  process.env.COSMOS_DATABASE &&
  process.env.COSMOS_CONTAINER
);

let container = null;

/**
 * Initialize Cosmos DB client if configuration is present
 */
if (cosmosConfigPresent) {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
  });

  // Reference specific database and container
  container = client
    .database(process.env.COSMOS_DATABASE)
    .container(process.env.COSMOS_CONTAINER);
}

/**
 * Determines safety status based on ice thickness and surface temperature
 * @param {Object} item - contains avgIceThicknessCm and avgSurfaceTemperatureC
 * @returns {String} Safe / Caution / Unsafe
 */
function fallbackStatus(item) {
  if (item.avgIceThicknessCm >= 30 && item.avgSurfaceTemperatureC <= -2) return 'Safe';
  if (item.avgIceThicknessCm >= 25 && item.avgSurfaceTemperatureC <= 0) return 'Caution';
  return 'Unsafe';
}

/**
 * Generates mock data when Cosmos DB is not configured
 * Used for development/testing
 */
function buildMockData() {
  const base = Date.now();
  const locations = ["Dow's Lake", 'Fifth Avenue', 'NAC'];

  // Generate latest snapshot data
  const latest = locations.map((location, index) => {
    const avgIceThicknessCm = Number((31 - index * 3 + Math.random() * 1.5).toFixed(2));
    const avgSurfaceTemperatureC = Number((-4 + index * 1.5 + Math.random()).toFixed(2));
    const avgExternalTemperatureC = Number((-9 + index * 2 + Math.random()).toFixed(2));
    const maxSnowAccumulationCm = Number((1 + index * 1.5 + Math.random()).toFixed(2));
    const count = 30;

    return {
      id: `${location}-${base}`,
      location,
      windowEnd: new Date(base).toISOString(),
      avgIceThicknessCm,
      minIceThicknessCm: avgIceThicknessCm - 1.5,
      maxIceThicknessCm: avgIceThicknessCm + 1.5,
      avgSurfaceTemperatureC,
      minSurfaceTemperatureC: avgSurfaceTemperatureC - 1,
      maxSurfaceTemperatureC: avgSurfaceTemperatureC + 1,
      maxSnowAccumulationCm,
      avgExternalTemperatureC,
      readingCount: count,
      safetyStatus: fallbackStatus({ avgIceThicknessCm, avgSurfaceTemperatureC })
    };
  });

  // Generate historical trend data (last hour)
  const trends = [];
  for (const location of locations) {
    for (let i = 11; i >= 0; i--) {
      const ts = new Date(base - i * 5 * 60 * 1000).toISOString();
      const avgIceThicknessCm = Number((28 + Math.random() * 6).toFixed(2));
      const avgSurfaceTemperatureC = Number((-5 + Math.random() * 5).toFixed(2));

      trends.push({
        location,
        windowEnd: ts,
        avgIceThicknessCm,
        avgSurfaceTemperatureC,
        safetyStatus: fallbackStatus({ avgIceThicknessCm, avgSurfaceTemperatureC })
      });
    }
  }

  return { latest, trends, source: 'mock' };
}

/**
 * Query latest aggregated data from Cosmos DB
 * Returns most recent record per location
 */
async function queryLatest() {
  const querySpec = {
    query: 'SELECT * FROM c'
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  const latestByLocation = {};

  for (const item of resources) {
    const key = item.location || 'unknown';

    // Determine timestamp priority
    const ts = item.windowEnd || item.EventProcessedUtcTime || item._ts || 0;

    // Keep only latest record per location
    if (
      !latestByLocation[key] ||
      ts > (latestByLocation[key].windowEnd || latestByLocation[key].EventProcessedUtcTime || latestByLocation[key]._ts || 0)
    ) {
      latestByLocation[key] = item;
    }
  }

  // Map data into frontend-friendly format
  return Object.values(latestByLocation).map(item => ({
    id: item.id,
    location: item.location,
    windowEnd: item.windowEnd || null,
    avgIceThicknessCm: item.avgIceThicknessCm,
    minIceThicknessCm: item.minIceThicknessCm,
    maxIceThicknessCm: item.maxIceThicknessCm,
    avgSurfaceTemperatureC: item.avgSurfaceTemperatureC,
    minSurfaceTemperatureC: item.minSurfaceTemperatureC,
    maxSurfaceTemperatureC: item.maxSurfaceTemperatureC,
    avgExternalTemperatureC: item.avgExternalTemperatureC,
    maxSnowAccumulationCm: item.maxSnowAccumulationCm,
    readingCount: item.readingCount,
    safetyStatus:
      item.safetyStatus ||
      fallbackStatus({
        avgIceThicknessCm: item.avgIceThicknessCm,
        avgSurfaceTemperatureC: item.avgSurfaceTemperatureC
      })
  }));
}

/**
 * Query trend (time-series) data from Cosmos DB
 * Used for charts
 */
async function queryTrends() {
  const querySpec = {
    query: 'SELECT * FROM c'
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  return resources
    .filter(item => item.windowEnd) // ensure valid data
    .sort((a, b) => new Date(a.windowEnd) - new Date(b.windowEnd)) // sort by time
    .map(item => ({
      location: item.location,
      windowEnd: item.windowEnd,
      avgIceThicknessCm: item.avgIceThicknessCm,
      avgSurfaceTemperatureC: item.avgSurfaceTemperatureC,
      safetyStatus:
        item.safetyStatus ||
        fallbackStatus({
          avgIceThicknessCm: item.avgIceThicknessCm,
          avgSurfaceTemperatureC: item.avgSurfaceTemperatureC
        })
    }));
}

/**
 * Health check endpoint
 * Used to verify server and configuration status
 */
app.get('/api/health', async (_req, res) => {
  res.json({ status: 'ok', cosmosConfigured: cosmosConfigPresent });
});

/**
 * API endpoint: Latest data
 * Returns latest conditions per location
 */
app.get('/api/latest', async (_req, res) => {
  try {
    if (!container) {
      return res.json(buildMockData().latest);
    }
    const resources = await queryLatest();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint: Trends data
 * Returns time-series data for charts
 */
app.get('/api/trends', async (_req, res) => {
  try {
    if (!container) {
      return res.json(buildMockData().trends);
    }
    const resources = await queryTrends();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint: Overall system status
 * Determines overall safety level based on latest data
 */
app.get('/api/status', async (_req, res) => {
  try {
    if (!container) {
      const mock = buildMockData();
      const unsafeCount = mock.latest.filter(item => item.safetyStatus === 'Unsafe').length;
      const cautionCount = mock.latest.filter(item => item.safetyStatus === 'Caution').length;

      return res.json({
        overallStatus: unsafeCount > 0 ? 'Unsafe' : cautionCount > 0 ? 'Caution' : 'Safe',
        locationsMonitored: mock.latest.length,
        lastUpdated: new Date().toISOString(),
        dataSource: mock.source
      });
    }

    const latest = await queryLatest();
    const unsafeCount = latest.filter(item => item.safetyStatus === 'Unsafe').length;
    const cautionCount = latest.filter(item => item.safetyStatus === 'Caution').length;

    res.json({
      overallStatus: unsafeCount > 0 ? 'Unsafe' : cautionCount > 0 ? 'Caution' : 'Safe',
      locationsMonitored: latest.length,
      lastUpdated: new Date().toISOString(),
      dataSource: 'cosmos'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start the server and listen on configured port
 */
app.listen(PORT, () => {
  console.log(`Dashboard server running on port ${PORT}`);
});