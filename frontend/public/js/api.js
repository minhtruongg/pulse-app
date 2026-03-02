/* api.js — all backend calls */

const API = {
  BASE:  '',
  token: null, // set by app.js when user signs in

  headers() {
    return {
      'Content-Type': 'application/json',
      ...(API.token ? { 'Authorization': `Bearer ${API.token}` } : {}),
    };
  },

  async createProject(name, site) {
    const res = await fetch(`${API.BASE}/api/projects`, {
      method: 'POST',
      headers: API.headers(),
      body: JSON.stringify({ name, site }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed');
    return res.json();
  },

  async getProjects() {
    console.log('getProjects, token present:', !!API.token);
    const res = await fetch(`${API.BASE}/api/projects`, { headers: API.headers() });
    console.log('getProjects status:', res.status);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getEvents(projectId, range = '24h') {
    const res = await fetch(`${API.BASE}/api/events/${projectId}?range=${range}`, {
      headers: API.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async sendEvent(projectId, name, props = {}) {
    return fetch(`${API.BASE}/e`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: projectId, event: name, props, url: window.location.href }),
    });
  },
};