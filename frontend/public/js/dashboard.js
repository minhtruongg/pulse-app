/* dashboard.js — polling, chart, simulate */

const Dashboard = {
  projectId:    null,
  chart:        null,
  pollTimer:    null,
  currentRange: '24h',

  init(projectId) {
    this.projectId = projectId;
    localStorage.setItem('pulse_last_project', projectId);
    document.getElementById('dashScriptDisplay').textContent = UI.buildScript(projectId);
    this.initChart();
    this.fetchAndRender();
    this.startPolling();
  },

  initChart() {
    const ctx = document.getElementById('eventChart').getContext('2d');
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(0,255,136,0.15)', borderColor: 'rgba(0,255,136,0.6)', borderWidth: 1, borderRadius: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} events` }, backgroundColor: '#111', borderColor: '#333', borderWidth: 1, titleColor: '#888', bodyColor: '#f0f0f0' } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#444', font: { family: 'DM Mono', size: 10 }, maxTicksLimit: 12 } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#444', font: { family: 'DM Mono', size: 10 }, stepSize: 1 }, beginAtZero: true },
        },
      },
    });
  },

  async fetchAndRender() {
    if (!this.projectId) return;
    try {
      const data = await API.getEvents(this.projectId, this.currentRange);
      UI.renderStats(data.stats);
      UI.renderFeed(data.events);
      UI.renderTopPages(data.topPages);
      UI.renderTopEvents(data.topEvents);
      UI.renderChart(this.chart, data.hourly, this.currentRange);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  },

  startPolling(interval = 5000) {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.fetchAndRender(), interval);
  },

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },

  setRange(range) {
    this.currentRange = range;
    const labels = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days' };
    document.getElementById('rangeLabel').textContent = labels[range] || range;
    this.fetchAndRender();
  },

  samplePages:  ['/home', '/pricing', '/about', '/signup', '/blog', '/features', '/docs'],
  sampleClicks: ['Sign Up', 'Get Started', 'Learn More', 'View Pricing', 'Try Demo', 'Download'],
  sampleFocus:  ['email', 'password', 'name', 'search'],

  async simulate() {
    const btn = document.getElementById('simBtn');
    btn.disabled = true; btn.textContent = '⏳ Sending…';

    const count = 6 + Math.floor(Math.random() * 6);
    const sends = [];

    for (let i = 0; i < count; i++) {
      sends.push(new Promise(resolve => setTimeout(async () => {
        const r = Math.random();
        if (r < 0.35) {
          const page = this.samplePages[Math.floor(Math.random() * this.samplePages.length)];
          await API.sendEvent(this.projectId, 'Page View', { _type: 'page', url: `${window.location.origin}${page}` });
        } else if (r < 0.75) {
          const text = this.sampleClicks[Math.floor(Math.random() * this.sampleClicks.length)];
          await API.sendEvent(this.projectId, 'Click', { _type: 'click', el: 'BUTTON', text });
        } else {
          const field = this.sampleFocus[Math.floor(Math.random() * this.sampleFocus.length)];
          await API.sendEvent(this.projectId, 'Input Focus', { _type: 'focus', field });
        }
        resolve();
      }, i * 150)));
    }

    await Promise.all(sends);
    await this.fetchAndRender();
    btn.disabled = false; btn.textContent = '▶ Simulate';
  },
};
