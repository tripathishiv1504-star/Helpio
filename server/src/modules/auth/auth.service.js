import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { User } from '../../models/index.js';
import { ROLES } from '../../../../shared/constants.js';

function formatUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    roles: user.roles || [],
    status: user.status,
    createdAt: user.createdAt,
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function register({ name, email, phone, password, wantsToHelp }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.status = 400;
    throw error;
  }

  // Admin role is NEVER creatable through registration
  const roles = wantsToHelp ? [ROLES.USER, ROLES.HELPER] : [ROLES.USER];

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    passwordHash,
    roles,
    status: 'active',
  });

  const token = generateToken(user);
  return {
    token,
    user: formatUser(user),
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  if (user.status === 'suspended') {
    const error = new Error('Your account has been suspended. Please contact support.');
    error.status = 403;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const token = generateToken(user);
  return {
    token,
    user: formatUser(user),
  };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  return formatUser(user);
}

export async function updateMe(userId, { name, phone, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  if (name !== undefined) {
    user.name = name;
  }
  if (phone !== undefined) {
    user.phone = phone;
  }

  if (newPassword) {
    if (!currentPassword) {
      const error = new Error('Current password is required to set a new password.');
      error.status = 400;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password does not match.');
      error.status = 400;
      throw error;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await user.save();
  return formatUser(user);
}

export default {
  register,
  login,
  getMe,
  updateMe,
};
