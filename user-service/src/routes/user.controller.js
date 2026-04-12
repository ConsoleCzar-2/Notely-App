const UserModel = require('../models/user.model');
const logger = require('../utils/logger');

const isValidAvatarUrl = (value) => {
  if (!value) return true;

  const trimmed = value.trim();
  if (trimmed.startsWith('/')) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:';
  } catch {
    return false;
  }
};

/**
 * GET /users/profile
 * Returns the profile of the currently authenticated user.
 * If user doesn't exist in DB yet (first request after register), creates it.
 */
const getProfile = async (req, res, next) => {
  try {
    const { userId, email, username } = req.user;

    let user = await UserModel.findByUserId(userId);

    if (!user) {
      // Auto-create profile on first access (bootstrapping pattern)
      user = await UserModel.create({ userId, email, username });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        userId: user.user_id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /users/profile
 * Body: { fullName?, bio?, avatarUrl? }
 */
const updateProfile = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { fullName, bio, avatarUrl } = req.body;

    const normalizedAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : avatarUrl;

    if (normalizedAvatarUrl && !isValidAvatarUrl(normalizedAvatarUrl)) {
      return res.status(400).json({ success: false, message: 'avatarUrl must be a valid URL' });
    }

    const updated = await UserModel.upsert(userId, {
      email: req.user.email,
      username: req.user.username,
      fullName,
      bio,
      avatarUrl: normalizedAvatarUrl,
    });

    if (!updated) {
      return res.status(500).json({ success: false, message: 'Failed to update profile' });
    }

    logger.info(`Profile updated for user: ${userId}`);

    return res.json({
      success: true,
      message: 'Profile updated',
      data: {
        userId: updated.user_id,
        email: updated.email,
        username: updated.username,
        fullName: updated.full_name,
        bio: updated.bio,
        avatarUrl: updated.avatar_url,
        updatedAt: updated.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /users/account
 * Permanently deletes the user's account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const deleted = await UserModel.delete(userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.info(`Account deleted: ${userId}`);

    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /users/:userId  (internal — for other services to look up users)
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findByUserId(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, deleteAccount, getUserById };
