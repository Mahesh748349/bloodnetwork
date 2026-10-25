const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const { logAction } = require('../services/auditService');

// Helper to generate JWT token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'emergency_blood_secret_key_change_in_production_2026';
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (donor, requester, admin)
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'donor',
      phone = '',
      // Donor specific fields
      bloodGroup,
      coordinates, // [longitude, latitude]
      address = {},
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Role validation: prevent unauthorized admin creation unless explicit secret key or first user
    let userRole = role;
    if (userRole === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      // Allow if no admin exists yet, or if valid ADMIN_INVITE_KEY provided
      const adminKey = req.body.adminSecretKey || req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_INVITE_KEY || 'admin_emergency_2026';
      if (adminCount > 0 && adminKey !== expectedKey) {
        return res.status(403).json({
          success: false,
          message: 'Invalid administrative registration key',
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
      phone,
    });

    let donorProfile = null;

    // If role is donor, create DonorProfile
    if (userRole === 'donor') {
      const defaultCoordinates =
        Array.isArray(coordinates) && coordinates.length === 2
          ? [Number(coordinates[0]), Number(coordinates[1])]
          : [77.5946, 12.9716]; // Default fallback coords (Bangalore) if not specified

      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const selectedBloodGroup = validBloodGroups.includes(bloodGroup) ? bloodGroup : 'O+';

      donorProfile = await DonorProfile.create({
        user: user._id,
        bloodGroup: selectedBloodGroup,
        location: {
          type: 'Point',
          coordinates: defaultCoordinates,
        },
        address: {
          city: address.city || 'Bangalore',
          state: address.state || 'Karnataka',
          postalCode: address.postalCode || '',
          formattedAddress: address.formattedAddress || 'Bangalore, Karnataka',
        },
        availabilityStatus: true,
        lastAvailabilityUpdate: new Date(),
        verificationStatus: 'pending',
      });
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
      donorProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or suspended.',
      });
    }

    let donorProfile = null;
    if (user.role === 'donor') {
      donorProfile = await DonorProfile.findOne({ user: user._id });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
      donorProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user details
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let donorProfile = null;

    if (user.role === 'donor') {
      donorProfile = await DonorProfile.findOne({ user: user._id });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
      },
      donorProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/deactivate
 * @desc    Deactivate current user account
 * @access  Private
 */
const deactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.status = 'inactive';
    await user.save();

    if (user.role === 'donor') {
      await DonorProfile.findOneAndUpdate(
        { user: user._id },
        { availabilityStatus: false, lastAvailabilityUpdate: new Date() }
      );
    }

    await logAction({
      actorId: user._id,
      action: 'DEACTIVATE_ACCOUNT',
      recordModel: 'User',
      recordId: user._id,
      details: { reason: req.body.reason || 'User requested deactivation' },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Account successfully deactivated',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  deactivateAccount,
};
