/* app.js — auth flow + page wiring */

(function () {

  let currentProjectId = null;
  let currentUser      = null;

  // ── Auth state listener ───────────────────────────────────
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, session?.user?.email);
    if (session?.user) {
      currentUser  = session.user;
      API.token    = session.access_token;
      console.log('Token stored:', !!API.token);
      await loadDashboard();
    } else {
      currentUser = null;
      UI.showPage('landing');
    }
  });

  // ── Load dashboard after login ────────────────────────────
  async function loadDashboard() {
    console.log('loadDashboard called');
    try {
      const { projects } = await API.getProjects();
      console.log('projects:', projects);

      if (!projects || projects.length === 0) {
        UI.showPage('onboarding');
        return;
      }

      const switcher = document.getElementById('projectSwitcher');
      switcher.innerHTML = projects.map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('');

      const saved = localStorage.getItem('pulse_last_project');
      const project = projects.find(p => p.id === saved) || projects[0];
      switcher.value   = project.id;
      currentProjectId = project.id;

      const email = currentUser.email || '';
      document.getElementById('greetName').textContent = email.split('@')[0];

      UI.showPage('dashboard');
      Dashboard.init(project.id);
    } catch (err) {
      console.error('loadDashboard error:', err);
      // Show onboarding as fallback so user isn't stuck
      UI.showPage('onboarding');
    }
  }

  // ── Signup ────────────────────────────────────────────────
  document.getElementById('signupBtn').addEventListener('click', async () => {
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const msg      = document.getElementById('signupMsg');

    if (!email)              { showMsg(msg, 'Email is required', 'error'); return; }
    if (password.length < 8) { showMsg(msg, 'Password must be at least 8 characters', 'error'); return; }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9!@#$%^*])/.test(password)) {
      showMsg(msg, 'Password must include letters and at least one number or symbol', 'error');
      return;
    }

    const btn = document.getElementById('signupBtn');
    btn.disabled = true; btn.textContent = 'Creating account…';

    const { data, error } = await sb.auth.signUp({ email, password });
    console.log('signUp result:', data, error);

    if (error) {
      showMsg(msg, error.message, 'error');
      btn.disabled = false; btn.textContent = 'Create account →';
    } else {
      showMsg(msg, 'Account created! Signing you in…', 'success');
      // Auto sign in after signup
      const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
      if (loginError) {
        showMsg(msg, 'Account created! Please sign in.', 'success');
        UI.showPage('login');
      }
      btn.disabled = false; btn.textContent = 'Create account →';
    }
  });

  // ── Login ─────────────────────────────────────────────────
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg      = document.getElementById('loginMsg');

    if (!email || !password) { showMsg(msg, 'Email and password required', 'error'); return; }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    console.log('signIn result:', data, error);

    if (error) {
      showMsg(msg, error.message, 'error');
      btn.disabled = false; btn.textContent = 'Sign in →';
    }
    // success handled by onAuthStateChange
  });

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    Dashboard.stopPolling();
    API.token = null;
    await sb.auth.signOut();
    localStorage.removeItem('pulse_last_project');
    // Reset login form completely
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginMsg').textContent = '';
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in →';
    UI.showPage('login');
  });

  // ── Create project ────────────────────────────────────────
  document.getElementById('createProjectBtn').addEventListener('click', async () => {
    const name = document.getElementById('projectName').value.trim();
    const site = document.getElementById('projectSite').value.trim();
    const msg  = document.getElementById('projectMsg');

    if (!name) { showMsg(msg, 'Project name is required', 'error'); return; }
    if (!site) { showMsg(msg, 'Website URL is required', 'error'); return; }

    const btn = document.getElementById('createProjectBtn');
    btn.disabled = true; btn.textContent = 'Creating…';

    try {
      const { project } = await API.createProject(name, site);
      currentProjectId  = project.id;
      document.getElementById('displayProjectId').textContent = project.id;
      document.getElementById('scriptDisplay').textContent    = UI.buildScript(project.id);
      UI.showPage('scriptPage');
    } catch (err) {
      console.error('createProject error:', err);
      showMsg(msg, err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create project →';
    }
  });

  // ── Cancel new project
  document.getElementById('cancelProjectBtn').addEventListener('click', async () => {
    const { projects } = await API.getProjects().catch(() => ({ projects: [] }));
    if (projects && projects.length > 0) {
      loadDashboard();
    } else {
      // No projects yet, go back to landing
      await sb.auth.signOut();
      API.token = null;
      UI.showPage('landing');
    }
  });

  // ── Go to dashboard from script page ─────────────────────
  document.getElementById('gotoDashBtn').addEventListener('click', () => loadDashboard());

  // ── New project button ────────────────────────────────────
  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('projectName').value = '';
    document.getElementById('projectSite').value = '';
    UI.showPage('onboarding');
  });

  // ── Project switcher ──────────────────────────────────────
  document.getElementById('projectSwitcher').addEventListener('change', (e) => {
    currentProjectId = e.target.value;
    localStorage.setItem('pulse_last_project', currentProjectId);
    Dashboard.init(currentProjectId);
  });

  // ── Time filter ───────────────────────────────────────────
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Dashboard.setRange(btn.dataset.range);
    });
  });

// ── Copy buttons ──────────────────────────────────────────
  document.getElementById('copyIdBtn').addEventListener('click', () => {
    UI.copyText(document.getElementById('displayProjectId').textContent, document.getElementById('copyIdBtn'));
  });

  document.getElementById('copyScriptBtn').addEventListener('click', () => {
    UI.copyText(document.getElementById('scriptDisplay').textContent, document.getElementById('copyScriptBtn'));
  });

  document.getElementById('dashCopyBtn').addEventListener('click', () => {
    UI.copyText(document.getElementById('dashScriptDisplay').textContent, document.getElementById('dashCopyBtn'));
  });

  // ── Enter key ────────────────────────────────────────────
  ['signupEmail','signupPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('signupBtn').click();
    });
  });
  ['loginEmail','loginPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
  });

  // ── Helper ───────────────────────────────────────────────
  function showMsg(el, text, type) {
    el.textContent = text;
    el.className   = `auth-msg ${type}`;
  }

})();