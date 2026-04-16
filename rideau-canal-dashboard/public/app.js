let iceChart;
let surfaceChart;

function badgeClass(status) {
  if (status === 'Safe') return 'safe';
  if (status === 'Caution') return 'caution';
  if (status === 'Unsafe') return 'unsafe';
  return 'neutral';
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

function renderCards(data) {
  const container = document.getElementById('location-cards');
  container.innerHTML = data.map(item => `
    <article class="location-card">
      <h3>${item.location}</h3>
      <p><span class="badge ${badgeClass(item.safetyStatus)}">${item.safetyStatus}</span></p>
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">Avg Ice Thickness</div><div class="metric-value">${item.avgIceThicknessCm} cm</div></div>
        <div class="metric"><div class="metric-label">Min / Max Ice</div><div class="metric-value">${item.minIceThicknessCm} / ${item.maxIceThicknessCm} cm</div></div>
        <div class="metric"><div class="metric-label">Avg Surface Temp</div><div class="metric-value">${item.avgSurfaceTemperatureC} °C</div></div>
        <div class="metric"><div class="metric-label">Avg External Temp</div><div class="metric-value">${item.avgExternalTemperatureC} °C</div></div>
        <div class="metric"><div class="metric-label">Max Snow</div><div class="metric-value">${item.maxSnowAccumulationCm} cm</div></div>
        <div class="metric"><div class="metric-label">Reading Count</div><div class="metric-value">${item.readingCount}</div></div>
      </div>
      <p>Window End: ${new Date(item.windowEnd).toLocaleString()}</p>
    </article>
  `).join('');
}

function groupByLocation(items) {
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.location]) grouped[item.location] = [];
    grouped[item.location].push(item);
  }
  return grouped;
}

function buildDatasets(grouped, property) {
  return Object.entries(grouped).map(([location, values]) => ({
    label: location,
    data: values.map(item => item[property]),
    tension: 0.3
  }));
}

function renderCharts(trends) {
  const grouped = groupByLocation(trends);
  const labels = Object.values(grouped)[0]?.map(item => formatTime(item.windowEnd)) || [];

  if (iceChart) iceChart.destroy();
  if (surfaceChart) surfaceChart.destroy();

  iceChart = new Chart(document.getElementById('iceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: buildDatasets(grouped, 'avgIceThicknessCm')
    },
    options: { responsive: true, maintainAspectRatio: true }
  });

  surfaceChart = new Chart(document.getElementById('surfaceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: buildDatasets(grouped, 'avgSurfaceTemperatureC')
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

async function loadDashboard() {
  const [latestRes, trendsRes, statusRes] = await Promise.all([
    fetch('/api/latest'),
    fetch('/api/trends'),
    fetch('/api/status')
  ]);

  const latest = await latestRes.json();
  const trends = await trendsRes.json();
  const status = await statusRes.json();

  renderCards(latest);
  renderCharts(trends);

  const statusEl = document.getElementById('overall-status');
  statusEl.className = `badge ${badgeClass(status.overallStatus)}`;
  statusEl.textContent = status.overallStatus;
  document.getElementById('last-updated').textContent = `Last updated: ${new Date(status.lastUpdated).toLocaleString()}`;
  document.getElementById('data-source').textContent = `Source: ${status.dataSource}`;
}

loadDashboard();
setInterval(loadDashboard, 30000);
