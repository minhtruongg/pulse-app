require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const { initDB } = require('./db/database');

const projectsRouter = require('./routes/projects');
const eventsRouter   = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 3001;

// Check required env vars
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  console.error('   Copy .env.example to .env and fill in your values');
  process.exit(1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '16kb' }));
app.set('trust proxy', 1);

const eventLimiter = rateLimit({ windowMs: 60000, max: 300 });
const apiLimiter   = rateLimit({ windowMs: 60000, max: 100 });

// Public tracking endpoint — no auth needed
app.post('/e', eventLimiter, (req, res, next) => {
  req.url = '/';
  eventsRouter(req, res, next);
});

// Protected API
app.use('/api/projects', apiLimiter, projectsRouter);
app.use('/api/events',   apiLimiter, eventsRouter);

// Serve frontend
const FRONTEND = path.join(__dirname, '../../frontend/public');
app.use(express.static(FRONTEND));
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`\n🟢 Pulse → http://localhost:${PORT}\n`));
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});