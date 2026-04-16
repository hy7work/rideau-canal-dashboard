require('dotenv').config();
const express = require('express');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const cosmosConfigPresent = Boolean(
  process.env.COSMOS_ENDPOINT &&
  process.env.COSMOS_KEY &&
  process.env.COSMOS_DATABASE &&
  process.env.COSMOS_CONTAINER
);

let container = null;
if (cosmosConfigPresent) {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
  });
  container = client
    .database(process.env.COSMOS_DATABASE)
    .container(process.env.COSMOS_CONTAINER);
}

function fallbackStatus(item) {
  if (item.avgIceThicknessCm >= 30 && item.avgSurfaceTemperatureC <= -2) return 'Safe';
  if (item.avgIceThicknessCm >= 25 && item.avgSurfaceTemperatureC <= 0) return 'Caution';
  return 'Unsafe';
}

function buildMockData() {
  const base = Date.now();
  const locations = ["Dow's Lake", 'Fifth Avenue', 'NAC'];

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

async function queryLatest() {
  const querySpec = {
    query: `
      SELECT * FROM c
      WHERE c.windowEnd IN (
        SELECT VALUE MAX(c2.windowEnd)
        FROM c c2
        WHERE c2.location = c.location
      )
    `
  };
  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

async function queryTrends() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const querySpec = {
    query: 'SELECT * FROM c WHERE c.windowEnd >= @since ORDER BY c.windowEnd ASC',
    parameters: [{ name: '@since', value: oneHourAgo }]
  };
  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

app.get('/api/health', async (_req, res) => {
  res.json({ status: 'ok', cosmosConfigured: cosmosConfigPresent });
});

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

app.listen(PORT, () => {
  console.log(`Dashboard server running on port ${PORT}`);
});
