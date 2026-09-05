import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserRole, IUser } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { normalizePhoneNumber, isValidIndianPhoneNumber } from '../utils/phone';
import { CaptchaService } from '../services/captcha.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, password, role = 'FARMER', email, address } = req.body;

    // Validate presence of required fields
    if (!name || !phone || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, phone number, and password are required.',
      });
      return;
    }

    // Phone number validation
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidIndianPhoneNumber(phone)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian phone number.',
      });
      return;
    }

    // Role validation: ADMIN cannot be registered publicly
    if (role === 'ADMIN') {
      res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be created via public registration.',
      });
      return;
    }

    const normalizedRole = (role as string).toUpperCase() as UserRole;
    if (!['FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', 'DELIVERY_BOY'].includes(normalizedRole)) {
      res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Allowed registration roles are 'FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', and 'DELIVERY_BOY'.`,
      });
      return;
    }

    // Password length validation
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    // Check if phone number is already registered
    const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
    if (existingPhoneUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this phone number is already registered.',
      });
      return;
    }

    // Normalize email if provided
    let normalizedEmail = '';
    if (email && typeof email === 'string' && email.trim()) {
      normalizedEmail = email.toLowerCase().trim();
      const existingEmailUser = await User.findOne({ email: normalizedEmail });
      if (existingEmailUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address is already registered.',
        });
        return;
      }
    } else {
      // Default placeholder email derived from phone if none supplied
      normalizedEmail = `${normalizedPhone}@agromitra.local`;
    }

    // Create new user (password is automatically hashed in pre-save hook)
    const user = new User({
      name: name.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      address: address || {},
      shopName: req.body.shopName || '',
      upiId: req.body.upiId || '',
      qrCodeUrl: req.body.qrCodeUrl || '',
    });

    await user.save();

    // If role is DELIVERY_BOY, create DeliveryBoy profile
    if (normalizedRole === 'DELIVERY_BOY') {
      const { vehicleType, deliveryArea } = req.body;
      await DeliveryBoy.create({
        user: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        vehicleType: vehicleType?.trim() || 'Motorcycle / Two-Wheeler',
        deliveryArea: deliveryArea?.trim() || 'Local Agricultural Mandals & Rural Hub',
        isAvailable: true,
        activeOrdersCount: 0,
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user,
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, email, password, captchaToken } = req.body;

    // Identifier check
    const identifier = phone || email;
    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide your phone number, password, and security CAPTCHA verification.',
      });
      return;
    }

    // 1. Server-Side CAPTCHA Verification
    const captchaResult = await CaptchaService.verifyCaptchaToken(captchaToken, req.ip);
    if (!captchaResult.success) {
      res.status(400).json({
        success: false,
        message: captchaResult.message || 'CAPTCHA security verification failed. Please try again.',
      });
      return;
    }

    // 2. Query user by normalized Phone Number (with email fallback)
    let user: IUser | null = null;

    if (phone && typeof phone === 'string') {
      const normalizedPhone = normalizePhoneNumber(phone);
      user = await User.findOne({ phone: normalizedPhone }).select('+password');
    }

    if (!user && email && typeof email === 'string') {
      const normalizedEmail = email.toLowerCase().trim();
      user = await User.findOne({ email: normalizedEmail }).select('+password');
    }

    // Generic error for security (do not disclose whether account exists)
    if (!user) {
      console.warn(`🔒 [Auth]: Login failed - user identifier not found.`);
      res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
      return;
    }

    // 3. Verify password with bcrypt
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.warn(`🔒 [Auth]: Login failed - incorrect password for user ID '${user._id}'.`);
      res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
      return;
    }

    console.log(`✅ [Auth]: Login successful for user '${user.phone || user.email}' (${user.role}).`);

    // 4. Generate JWT
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, email } = req.body;
    if (!phone && !email) {
      res.status(400).json({
        success: false,
        message: 'Please provide your registered phone number or email address.',
      });
      return;
    }

    let user: IUser | null = null;
    if (phone && typeof phone === 'string') {
      const normalizedPhone = normalizePhoneNumber(phone);
      user = await User.findOne({ phone: normalizedPhone });
    }

    if (!user && email && typeof email === 'string') {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'No account found with the provided phone number or email.',
      });
      return;
    }

    // Generate secure 32-byte cryptographic random token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    // Store hashed token with 15-minute expiration
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `http://localhost:5173/reset-password?token=${rawResetToken}&phone=${encodeURIComponent(user.phone || '')}`;

    console.log(`🔑 [Auth]: Password reset token generated for '${user.phone || user.email}': ${rawResetToken}`);

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully. (Note: SMS/OTP gateway is not configured in this environment; token link is provided for recovery).',
      resetToken: rawResetToken,
      resetLink,
      expiresInMinutes: 15,
      smsConfigured: false,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword, email, phone } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({
        success: false,
        message: 'New password is required.',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    let user: IUser | null = null;

    // If token is provided, validate token & expiry against MongoDB
    if (token && typeof token === 'string' && token.trim()) {
      const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset token. Please request a new reset link.',
        });
        return;
      }
    } else if (phone && typeof phone === 'string' && phone.trim()) {
      const normalizedPhone = normalizePhoneNumber(phone);
      user = await User.findOne({ phone: normalizedPhone });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'No account found with this phone number.',
        });
        return;
      }
    } else if (email && typeof email === 'string' && email.trim()) {
      // Direct email reset fallback (for admin/direct reset scenarios)
      const normalizedEmail = email.toLowerCase().trim();
      user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'No account found with this email address.',
        });
        return;
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Password reset token or registered account phone number/email is required.',
      });
      return;
    }

    // Update password and clear reset token & expiry in MongoDB
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save(); // Pre-save hook securely hashes with bcrypt

    console.log(`🔐 [Auth]: Password securely updated for '${user.email}'.`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // req.user was attached by authenticate middleware (password excluded)
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { name, phone, address, shopName, upiId, qrCodeUrl } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (name !== undefined && typeof name === 'string' && name.trim().length >= 2) {
      user.name = name.trim();
    }
    if (phone !== undefined && typeof phone === 'string' && phone.trim().length >= 8) {
      user.phone = phone.trim();
    }
    if (address !== undefined && typeof address === 'object') {
      user.address = {
        street: address.street !== undefined ? String(address.street).trim() : (user.address?.street || ''),
        city: address.city !== undefined ? String(address.city).trim() : (user.address?.city || ''),
        state: address.state !== undefined ? String(address.state).trim() : (user.address?.state || ''),
        pincode: address.pincode !== undefined ? String(address.pincode).trim() : (user.address?.pincode || ''),
      };
      user.markModified('address');
    }
    if (shopName !== undefined && typeof shopName === 'string') {
      user.shopName = shopName.trim();
    }
    if (upiId !== undefined && typeof upiId === 'string') {
      user.upiId = upiId.trim();
    }
    if (qrCodeUrl !== undefined && typeof qrCodeUrl === 'string') {
      user.qrCodeUrl = qrCodeUrl.trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

