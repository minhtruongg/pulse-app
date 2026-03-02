const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('requireAuth called, header:', authHeader ? 'present' : 'missing');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Verifying token with Supabase...');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('Supabase response:', user?.email, error?.message);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

module.exports = { requireAuth, supabase };