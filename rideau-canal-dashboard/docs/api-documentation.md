# API Documentation

## Base URL
Local: `http://localhost:3000`

## Endpoints

### GET /api/health
Returns application health and whether Cosmos DB is configured.

**Example response**
```json
{
  "status": "ok",
  "cosmosConfigured": true
}
```

### GET /api/latest
Returns the latest aggregation document for each monitoring location.

### GET /api/trends
Returns all aggregation documents from the last hour for charting.

### GET /api/status
Returns overall system status used by the dashboard summary card.

**Example response**
```json
{
  "overallStatus": "Caution",
  "locationsMonitored": 3,
  "lastUpdated": "2026-04-16T18:55:00.000Z",
  "dataSource": "cosmos"
}
```
