const Note = require('../models/note.model');
const logger = require('../utils/logger');

// ─── Create Note ──────────────────────────────────────────────────────────────
/**
 * POST /notes
 * Body: { title, content, tags? }
 */
const createNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    const note = await Note.create({
      userId: req.user.userId,
      title: title.trim(),
      content,
      tags: Array.isArray(tags) ? tags : [],
    });

    logger.info(`Note created: ${note._id} by user ${req.user.userId}`);

    return res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

// ─── List Notes ───────────────────────────────────────────────────────────────
/**
 * GET /notes
 * Query: page=1&limit=20&archived=false&pinned=true
 */
const listNotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, archived = 'false', pinned } = req.query;

    const filter = {
      userId: req.user.userId,
      isArchived: archived === 'true',
    };

    if (pinned !== undefined) {
      filter.isPinned = pinned === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notes, total] = await Promise.all([
      Note.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Note.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Note ──────────────────────────────────────────────────────────
/**
 * GET /notes/:id
 */
const getNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    return res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

// ─── Update Note ──────────────────────────────────────────────────────────────
/**
 * PUT /notes/:id
 * Body: { title?, content?, tags?, isPinned?, isArchived? }
 */
const updateNote = async (req, res, next) => {
  try {
    const { title, content, tags, isPinned, isArchived } = req.body;

    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (isPinned !== undefined) update.isPinned = isPinned;
    if (isArchived !== undefined) update.isArchived = isArchived;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    logger.info(`Note updated: ${note._id}`);

    return res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Note ──────────────────────────────────────────────────────────────
/**
 * DELETE /notes/:id
 */
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    logger.info(`Note deleted: ${req.params.id}`);

    return res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Search Notes ─────────────────────────────────────────────────────────────
/**
 * GET /notes/search?query=keyword&page=1&limit=10
 * Uses MongoDB text index on title + content + tags
 */
const searchNotes = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      userId: req.user.userId,
      $text: { $search: query.trim() },
    };

    const [notes, total] = await Promise.all([
      Note.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit)),
      Note.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createNote, listNotes, getNote, updateNote, deleteNote, searchNotes };
