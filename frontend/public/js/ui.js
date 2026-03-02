/* ============================================================
   ui.js — Rendering helpers and DOM utilities
   ============================================================ */

const UI = {

  // ── Page navigation ───────────────────────────────────────
  showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  },

  // ── Copy to clipboard ─────────────────────────────────────
  async copyText(text, btn, original = 'Copy') {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  },

  // ── Form error ────────────────────────────────────────────
  showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById('signupError');
    input.classList.add('error');
    errEl.textContent = message;
    errEl.style.display = 'block';
    input.addEventListener('input', () => {
      input.classList.remove('error');
      errEl.style.display = 'none';
    }, { once: true });
  },

  // ── Number animation ──────────────────────────────────────
  animateCount(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? '–';
    el.style.transform = 'scale(1.1)';
    setTimeout(() => {
      el.style.transform = '';
      el.style.transition = 'transform 0.2s';
    }, 150);
  },

  // ── Time formatting ───────────────────────────────────────
  timeAgo(tsSeconds) {
    const secs = Math.floor(Date.now() / 1000) - tsSeconds;
    if (secs < 5)  return 'just now';
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  },

  // ── Event dot class ───────────────────────────────────────
  dotClass(type) {
    return ['click', 'page', 'focus', 'custom'].includes(type) ? type : 'custom';
  },

  // ── Render event feed ─────────────────────────────────────
  renderFeed(events) {
    const feed = document.getElementById('eventFeed');
    if (!events || events.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◌</div>
          <div class="empty-title">Listening…</div>
          <div class="empty-sub">Events will appear here in real-time</div>
        </div>`;
      return;
    }

    feed.innerHTML = events.slice(0, 40).map(ev => {
      const props = typeof ev.props === 'object' ? ev.props : {};
      const meta = Object.entries(props)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ') || ev.url || '';
      return `
        <div class="event-item">
          <div class="event-dot ${UI.dotClass(ev.type)}"></div>
          <div class="event-info">
            <div class="event-name">${UI.escape(ev.name)}</div>
            <div class="event-meta">${UI.escape(meta)}</div>
          </div>
          <div class="event-time">${UI.timeAgo(ev.ts)}</div>
        </div>`;
    }).join('');
  },

  // ── Render stats ──────────────────────────────────────────
  renderStats(stats) {
    if (!stats) return;
    UI.animateCount('statPageViews', stats.page_views ?? 0);
    UI.animateCount('statClicks', stats.clicks ?? 0);
    UI.animateCount('statTotal', stats.total ?? 0);
    UI.animateCount('statTypes', stats.unique_event_types ?? 0);

    const setDelta = (id, val, suffix = 'this period') => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val > 0 ? `↑ ${val} ${suffix}` : '— no data yet';
      el.className = 'stat-delta' + (val === 0 ? ' muted' : '');
    };

    setDelta('deltaPageViews', stats.page_views ?? 0);
    setDelta('deltaClicks',    stats.clicks ?? 0);
    setDelta('deltaTotal',     stats.total  ?? 0);
  },

  // ── Render top pages ──────────────────────────────────────
  renderTopPages(pages) {
    const el = document.getElementById('topPages');
    if (!pages || pages.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><div class="empty-sub">No page views yet</div></div>`;
      return;
    }
    const max = pages[0].count;
    el.innerHTML = pages.map((p, i) => {
      const path = (p.url || '/').replace(/^https?:\/\/[^/]+/, '') || '/';
      const pct  = Math.round((p.count / max) * 100);
      return `
        <div class="page-row">
          <div class="page-rank">${i + 1}</div>
          <div class="page-path" title="${UI.escape(p.url)}">${UI.escape(path)}</div>
          <div class="page-bar-wrap"><div class="page-bar" style="width:${pct}%"></div></div>
          <div class="page-count">${p.count}</div>
        </div>`;
    }).join('');
  },

  // ── Render top events ─────────────────────────────────────
  renderTopEvents(topEvents) {
    const el = document.getElementById('topEvents');
    if (!topEvents || topEvents.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><div class="empty-sub">No events yet</div></div>`;
      return;
    }
    el.innerHTML = topEvents.map(ev => `
      <div class="event-row">
        <div class="event-dot ${UI.dotClass(ev.type)}" style="flex-shrink:0; width:7px; height:7px; border-radius:50%;"></div>
        <div class="event-row-name">${UI.escape(ev.name)}</div>
        <span class="event-type-tag ${UI.dotClass(ev.type)}">${ev.type}</span>
        <div class="event-row-count">${ev.count}</div>
      </div>`).join('');
  },

  // ── Render chart ──────────────────────────────────────────
  renderChart(chart, hourlyData, range) {
    // Build label → count map from backend data
    const dataMap = {};
    (hourlyData || []).forEach(h => { dataMap[h.hour] = h.count; });

    // Generate hour slots for the range
    const slots = UI.buildTimeSlots(range);
    const labels = slots.map(s => s.label);
    const values = slots.map(s => dataMap[s.key] || 0);

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  },

  buildTimeSlots(range) {
    const slots = [];
    const now = new Date();

    if (range === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i, 0, 0, 0);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
        slots.push({ key, label: `${String(d.getHours()).padStart(2,'0')}:00` });
      }
    } else {
      const days = range === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} 00:00`;
        slots.push({ key, label: `${d.getMonth()+1}/${d.getDate()}` });
      }
    }
    return slots;
  },

  // ── Build tracking script string ──────────────────────────
  buildScript(projectId) {
    const host = window.location.origin;
    return `<!-- Pulse Analytics -->
<script>
(function() {
  var PID = "${projectId}";
  var API = "${host}/e";
  if (location.hostname === new URL(API).hostname) return;
  function track(name, props) {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: PID, event: name, props: props, url: location.href })
    }).catch(function(){});
  }
  // Auto: page view
  track('Page View', { url: location.href, ref: document.referrer });
  // Auto: clicks (buttons, links and submit inputs only)
  document.addEventListener('click', function(e) {
    var t = e.target.closest('button, a, input[type="submit"]');
    if (t) track('Click', { el: t.tagName, text: (t.innerText||'').slice(0,40), id: t.id || '' });
  });
  // Auto: input focus
  document.addEventListener('focusin', function(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      track('Input Focus', { field: t.name || t.id || t.type });
  });
  // Manual: window.pulse.track('My Event', { key: 'value' })
  window.pulse = { track: track };
})();
<\/script>`;
  },

  // ── XSS escape ────────────────────────────────────────────
  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
