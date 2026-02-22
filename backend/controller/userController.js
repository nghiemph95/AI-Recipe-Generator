import User from '../models/User.js';
import UserPreference from '../models/UserPreference.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/users/profile
 */
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    const preferences = await UserPreference.findByUserId(req.user.id);

    return successResponse(res, { ...user.toJSON(), preferences: preferences || null }, 'Profile retrieved successfully.');
  } catch (err) {
    console.error('GetProfile error:', err);
    return errorResponse(res, 'Failed to get profile.', 500);
  }
}

/**
 * PUT /api/users/profile
 * Body: { name?, email? }
 */
export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return errorResponse(res, 'At least one field (name or email) is required.', 400);
    }

    if (email) {
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        return errorResponse(res, 'Email is already in use.', 409);
      }
    }

    const user = await User.updateUser(req.user.id, { name, email });

    return successResponse(res, user, 'Profile updated successfully.');
  } catch (err) {
    console.error('UpdateProfile error:', err);
    return errorResponse(res, 'Failed to update profile.', 500);
  }
}

/**
 * PUT /api/users/password
 * Body: { currentPassword, newPassword }
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current and new passwords are required.', 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(res, 'New password must be at least 8 characters.', 400);
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    const valid = await User.verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return errorResponse(res, 'Current password is incorrect.', 401);
    }

    await User.updatePassword(req.user.id, newPassword);

    return successResponse(res, null, 'Password updated successfully.');
  } catch (err) {
    console.error('ChangePassword error:', err);
    return errorResponse(res, 'Failed to change password.', 500);
  }
}

/**
 * GET /api/users/preferences
 */
export async function getPreferences(req, res) {
  try {
    const preferences = await UserPreference.findByUserId(req.user.id);
    if (!preferences) {
      return errorResponse(res, 'Preferences not found.', 404);
    }

    return successResponse(res, preferences, 'Preferences retrieved successfully.');
  } catch (err) {
    console.error('GetPreferences error:', err);
    return errorResponse(res, 'Failed to get preferences.', 500);
  }
}

/**
 * PUT /api/users/preferences
 * Body: { dietary_restrictions?, allergies?, preferred_cuisines?, default_servings?, measurement_unit? }
 */
export async function updatePreferences(req, res) {
  try {
    const preferences = await UserPreference.upsertPreference(req.user.id, req.body);

    return successResponse(res, preferences, 'Preferences updated successfully.');
  } catch (err) {
    console.error('UpdatePreferences error:', err);
    return errorResponse(res, 'Failed to update preferences.', 500);
  }
}

/**
 * DELETE /api/users/account
 */
export async function deleteAccount(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    await User.deleteUser(req.user.id);

    return successResponse(res, null, 'Account deleted successfully.');
  } catch (err) {
    console.error('DeleteAccount error:', err);
    return errorResponse(res, 'Failed to delete account.', 500);
  }
}
