// Global variables to hold Chart.js instances
let iceChart;
let surfaceChart;

/**
 * Returns a CSS class name based on safety status
 * Used to style badges (Safe, Caution, Unsafe)
 */
function badgeClass(status) {
  if (status === 'Safe') return 'safe';
  if (status === 'Caution') return 'caution';
  if (status === 'Unsafe') return 'unsafe';
  return 'neutral'; // default fallback
}

/**
 * Formats a timestamp into a readable time string
 * Used for chart labels (e.g., 5:30:00 PM)
 */
function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

/**
 * Renders location cards dynamically on the dashboard
 * Each card shows aggregated metrics for a location
 * @param {Array} data - latest aggregated data from API
 */
function renderCards(data) {
  const container = document.getElementById('location-cards');

  // Generate HTML for each location card
  container.innerHTML = data.map(item => `
    <article class="location-card">
      <h3>${item.location}</h3>

      <!-- Display safety status badge -->
      <p><span class="badge ${badgeClass(item.safetyStatus)}">${item.safetyStatus}</span></p>

      <!-- Grid layout for metrics -->
      <div class="metric-grid">

        <!-- Average Ice Thickness -->
        <div class="metric">
          <div class="metric-label">Avg Ice Thickness</div>
          <div class="metric-value">
            ${Number(item.avgIceThicknessCm).toFixed(1)} cm
          </div>
        </div>

        <!-- Min and Max Ice Thickness -->
        <div class="metric">
          <div class="metric-label">Min / Max Ice</div>
          <div class="metric-value">
            ${Number(item.minIceThicknessCm).toFixed(1)} / 
            ${Number(item.maxIceThicknessCm).toFixed(1)} cm
          </div>
        </div>

        <!-- Average Surface Temperature -->
        <div class="metric">
          <div class="metric-label">Avg Surface Temp</div>
          <div class="metric-value">
            ${Number(item.avgSurfaceTemperatureC).toFixed(1)} °C
          </div>
        </div>

        <!-- Average External Temperature -->
        <div class="metric">
          <div class="metric-label">Avg External Temp</div>
          <div class="metric-value">
            ${Number(item.avgExternalTemperatureC).toFixed(1)} °C
          </div>
        </div>

        <!-- Maximum Snow Accumulation -->
        <div class="metric">
          <div class="metric-label">Max Snow</div>
          <div class="metric-value">
            ${Number(item.maxSnowAccumulationCm).toFixed(1)} cm
          </div>
        </div>

        <!-- Number of readings in the time window -->
        <div class="metric">
          <div class="metric-label">Reading Count</div>
          <div class="metric-value">
            ${item.readingCount}
          </div>
        </div>

      </div>

      <!-- Display aggregation window end time -->
      <p>Window End: ${new Date(item.windowEnd).toLocaleString()}</p>
    </article>
  `).join('');
}

/**
 * Groups data by location
 * Example output:
 * {
 *   "Dow's Lake": [...],
 *   "NAC": [...],
 *   "Fifth Avenue": [...]
 * }
 * @param {Array} items - trend data
 * @returns {Object} grouped data by location
 */
function groupByLocation(items) {
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.location]) grouped[item.location] = [];
    grouped[item.location].push(item);
  }
  return grouped;
}

/**
 * Builds datasets for Chart.js
 * Each dataset represents one location line on the chart
 * @param {Object} grouped - grouped data by location
 * @param {String} property - property to plot (e.g., avgIceThicknessCm)
 * @returns {Array} Chart.js datasets
 */
function buildDatasets(grouped, property) {
  return Object.entries(grouped).map(([location, values]) => ({
    label: location,
    data: values.map(item => item[property]),
    tension: 0.3 // smooth line curve
  }));
}

/**
 * Renders charts using Chart.js
 * Creates two line charts:
 * 1. Ice Thickness
 * 2. Surface Temperature
 * @param {Array} trends - trend data from API
 */
function renderCharts(trends) {
  const grouped = groupByLocation(trends);

  // Extract time labels from first location
  const labels = Object.values(grouped)[0]?.map(item => formatTime(item.windowEnd)) || [];

  // Destroy existing charts before re-rendering
  if (iceChart) iceChart.destroy();
  if (surfaceChart) surfaceChart.destroy();

  // Create Ice Thickness chart
  iceChart = new Chart(document.getElementById('iceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: buildDatasets(grouped, 'avgIceThicknessCm')
    },
    options: { responsive: true, maintainAspectRatio: true }
  });

  // Create Surface Temperature chart
  surfaceChart = new Chart(document.getElementById('surfaceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: buildDatasets(grouped, 'avgSurfaceTemperatureC')
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

/**
 * Loads dashboard data from backend APIs
 * Fetches:
 * 1. Latest aggregated data
 * 2. Trend data for charts
 * 3. Overall system status
 * Then updates UI components
 */
async function loadDashboard() {
  // Fetch all APIs in parallel

  //const [latestRes, trendsRes, statusRes] = await Promise.all([
  //  fetch('/api/latest'),
  //  fetch('/api/trends'),
  //  fetch('/api/status')
  //]);

  // Convert responses to JSON
  //const latest = await latestRes.json();
  //const trends = await trendsRes.json();
  //const status = await statusRes.json();

  // Mock data (simulate API)
const latest = [
  {
    location: "Dow's Lake",
    safetyStatus: "Safe",
    avgIceThicknessCm: 32,
    minIceThicknessCm: 28,
    maxIceThicknessCm: 35,
    avgSurfaceTemperatureC: -5,
    avgExternalTemperatureC: -8,
    maxSnowAccumulationCm: 12,
    readingCount: 25,
    windowEnd: new Date()
  },
  {
    location: "NAC",
    safetyStatus: "Caution",
    avgIceThicknessCm: 18,
    minIceThicknessCm: 15,
    maxIceThicknessCm: 20,
    avgSurfaceTemperatureC: -3,
    avgExternalTemperatureC: -6,
    maxSnowAccumulationCm: 8,
    readingCount: 20,
    windowEnd: new Date()
  }
];

const trends = [
  {
    location: "Dow's Lake",
    avgIceThicknessCm: 30,
    avgSurfaceTemperatureC: -5,
    windowEnd: new Date()
  },
  {
    location: "Dow's Lake",
    avgIceThicknessCm: 32,
    avgSurfaceTemperatureC: -6,
    windowEnd: new Date()
  },
  {
    location: "NAC",
    avgIceThicknessCm: 18,
    avgSurfaceTemperatureC: -3,
    windowEnd: new Date()
  }
];

const status = {
  overallStatus: "Safe",
  lastUpdated: new Date(),
  dataSource: "Simulated Data"
};


  

  // Update UI
  renderCards(latest);
  renderCharts(trends);

  // Update overall status section
  const statusEl = document.getElementById('overall-status');
  statusEl.className = `badge ${badgeClass(status.overallStatus)}`;
  statusEl.textContent = status.overallStatus;

  document.getElementById('last-updated').textContent =
    `Last updated: ${new Date(status.lastUpdated).toLocaleString()}`;

  document.getElementById('data-source').textContent =
    `Data Source: ${status.dataSource}`;
}

/**
 * Initial load when page opens
 */
loadDashboard();

/**
 * Auto-refresh dashboard every 30 seconds
 * Calls loadDashboard repeatedly
 */
setInterval(loadDashboard, 30000);
