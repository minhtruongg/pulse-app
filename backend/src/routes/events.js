const express = require('express');
const router  = express.Router();
const db = require('../db/database');

function classifyType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('page view') || n.includes('pageview')) return 'page';
  if (n.includes('click'))  return 'click';
  if (n.includes('focus') || n.includes('input')) return 'focus';
  return 'custom';
}

// Drop ghost clicks — clicks on meaningless elements with no text or id
function isJunkClick(name, propsObj) {
  const isClick = (name || '').toLowerCase().includes('click');
  if (!isClick) return false;

  const el   = (propsObj.el || '').toUpperCase();
  const text = (propsObj.text || '').trim();
  const id   = (propsObj.id || '').trim();

  const meaningful = ['BUTTON', 'A', 'INPUT', 'SELECT', 'LABEL', 'SUMMARY', 'NAV'];
  if (meaningful.includes(el)) return false; // always keep
  if (text || id) return false;              // has context, keep it
  return true;                               // no element, no text, no id = junk
}

// POST /e  — ingest a single event
router.post('/', (req, res) => {
  res.status(200).json({ ok: true });

  const { pid, event, props, url, referrer } = req.body;
  if (!pid || !event) return;

  const project = db.getProject(pid);
  if (!project) return;

  const propsObj = (props && typeof props === 'object') ? props : {};
  const type = propsObj._type || classifyType(event);

  // Drop junk clicks before storing
  if (isJunkClick(event, propsObj)) return;

  try {
    db.insertEvent({
      project_id: pid,
      name:       String(event).slice(0, 100),
      type,
      props:      JSON.stringify(propsObj),
      url:        String(url || propsObj.url || '').slice(0, 500),
      referrer:   String(referrer || propsObj.ref || '').slice(0, 500),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
      ip:         req.ip,
    });
  } catch (err) {
    console.error('Event insert error:', err.message);
  }
});

// GET /api/events/:projectId
router.get('/:projectId', (req, res) => {
  const { projectId } = req.params;
  const project = db.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const range    = req.query.range || '24h';
  const rangeMap = { '24h': 86400, '7d': 604800, '30d': 2592000 };
  const seconds  = rangeMap[range] || 86400;
  const since    = Math.floor(Date.now() / 1000) - seconds;

  const events   = db.getRecentEvents(projectId, since);
  const stats    = db.getEventStats(projectId, since);
  const pages    = db.getTopPages(projectId, since);
  const topEvts  = db.getTopEvents(projectId, since);
  const hourly   = db.getHourlyVolume(projectId, since);

  const parsedEvents = events.map(e => ({
    ...e,
    props: e.props ? JSON.parse(e.props) : {},
  }));

  return res.json({ project, stats, events: parsedEvents, topPages: pages, topEvents: topEvts, hourly });
});

module.exports = router;
