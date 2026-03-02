const express = require('express');
const router  = express.Router();
const { nanoid } = require('nanoid');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// POST /api/projects — create project (auth required)
router.post('/', requireAuth, (req, res) => {
  const { name, site } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!site?.trim()) return res.status(400).json({ error: 'site is required' });

  const id = 'prj_' + nanoid(16);
  try {
    db.createProject(id, req.user.id, name.trim(), site.trim());
    return res.status(201).json({ project: db.getProject(id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects — get all projects for logged in user
router.get('/', requireAuth, (req, res) => {
  const projects = db.getProjectsByUser(req.user.id);
  return res.json({ projects });
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  return res.json({ project });
});

module.exports = router;
