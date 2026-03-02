# Pulse Analytics

> One script tag. Real-time event tracking. Know what users actually do.

## Project Structure

```
pulse/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry point
│   │   ├── db/
│   │   │   └── database.js    # SQLite schema + queries
│   │   └── routes/
│   │       ├── projects.js    # POST /api/projects, GET /api/projects/:id
│   │       └── events.js      # POST /e (tracking), GET /api/events/:id
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html
│       ├── css/
│       │   ├── base.css       # Variables, reset, shared
│       │   ├── landing.css    # Landing + onboarding
│       │   └── dashboard.css  # Dashboard
│       └── js/
│           ├── api.js         # All fetch() calls to backend
│           ├── ui.js          # Rendering helpers
│           ├── dashboard.js   # Dashboard: polling, chart, simulate
│           └── app.js         # Event listeners, page flow
├── Dockerfile
├── docker-compose.yml
└── railway.json
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/projects` | Create a project. Body: `{ name, site }` |
| `GET`  | `/api/projects/:id` | Get project info |
| `POST` | `/e` | Ingest an event (tracking endpoint) |
| `GET`  | `/api/events/:projectId?range=24h` | Get events + stats. Range: `24h`, `7d`, `30d` |

### Tracking endpoint payload
```json
{
  "pid":   "prj_abc123",
  "event": "Page View",
  "props": { "url": "https://mysite.com/home" },
  "url":   "https://mysite.com/home"
}
```

## Running locally

### Option 1: Docker (easiest)
```bash
docker compose up
# Open http://localhost:3001
```

### Option 2: Node directly
```bash
cd backend
npm install
npm start
# Open http://localhost:3001
```

## Deploy to Railway (free tier)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects the Dockerfile
4. Add a volume at `/data` for SQLite persistence:
   - In Railway: your service → Volumes → Add Volume → Mount path: `/data`
5. Your app is live 🎉

**Set environment variables in Railway if needed:**
- `PORT` — Railway sets this automatically
- `DATA_DIR` — defaults to `/data`

## Deploy to Render (free tier)

1. Push to GitHub
2. [render.com](https://render.com) → New → Web Service → Connect repo
3. Runtime: **Docker**
4. Add a Disk: Mount path `/data`, Size 1GB
5. Deploy

## Adding the tracking script to your site

After signing up, you'll get a snippet like this:

```html
<!-- Pulse Analytics -->
<script>
(function() {
  var PID = "prj_yourid";
  var API = "https://your-app.railway.app/e";
  function track(name, props) {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: PID, event: name, props: props, url: location.href })
    }).catch(function(){});
  }
  track('Page View', { url: location.href, ref: document.referrer });
  document.addEventListener('click', function(e) {
    track('Click', { el: e.target.tagName, text: (e.target.innerText||'').slice(0,40) });
  });
  document.addEventListener('focusin', function(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      track('Input Focus', { field: t.name || t.id || t.type });
  });
  window.pulse = { track: track };
})();
</script>
```

Paste it before `</body>`. Done.

### Manual tracking
```js
window.pulse.track('Signed Up', { plan: 'free' });
window.pulse.track('Watched Video', { title: 'Demo' });
```
