import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserRole, IUser } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { normalizePhoneNumber, isValidIndianPhoneNumber, buildPhoneVariants } from '../utils/phone';

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

    // Check if phone number is already registered across any format variant (+91, local, etc.)
    const phoneVariants = buildPhoneVariants(phone);
    const existingPhoneUser = await User.findOne({
      $or: [
        { phone: { $in: phoneVariants } },
        { phone: new RegExp(`${normalizedPhone}$`) },
      ],
    });
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
    const { identifier: rawIdentifier, phone, email, password } = req.body;

    const identifier = (rawIdentifier || phone || email || '').toString().trim();
    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide your registered phone number (or email) and password.',
      });
      return;
    }

    // 1. Query user by phone (all variants) or email
    let user: IUser | null = null;

    // A. Check if identifier is an email (contains '@')
    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
    }

    // B. Check if identifier or phone field is a phone number (all variants)
    if (!user) {
      const phoneInput = phone || identifier;
      const normalizedPhone = normalizePhoneNumber(phoneInput);
      if (normalizedPhone) {
        const phoneVariants = buildPhoneVariants(phoneInput);
        user = await User.findOne({
          $or: [
            { phone: { $in: phoneVariants } },
            { phone: new RegExp(`${normalizedPhone}$`) },
          ],
        }).select('+password');
      }
    }

    // C. Fallback: check email field explicitly if provided separately
    if (!user && email && typeof email === 'string') {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
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

    // 2. Verify password with bcrypt
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.warn(`🔒 [Auth]: Login failed - incorrect password for user ID '${user._id}'.`);
      res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
      return;
    }

    // Auto-normalize stored phone number if it had legacy non-standard formatting (+91 etc.)
    if (user.phone && typeof user.phone === 'string') {
      const canonicalPhone = normalizePhoneNumber(user.phone);
      if (canonicalPhone && user.phone !== canonicalPhone) {
        try {
          await User.updateOne({ _id: user._id }, { $set: { phone: canonicalPhone } });
          user.phone = canonicalPhone;
        } catch (phoneMigrateErr) {
          console.warn('⚠️ [Auth]: Non-fatal phone normalization update error:', phoneMigrateErr);
        }
      }
    }

    console.log(`✅ [Auth]: Login successful for user '${user.phone || user.email}' (${user.role}).`);

    // 3. Generate JWT
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
    const identifier = (phone || email || '').toString().trim();
    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'Please provide your registered phone number or email address.',
      });
      return;
    }

    let user: IUser | null = null;

    // A. Check if identifier contains '@' (email)
    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    }

    // B. Check phone variants
    if (!user) {
      const phoneInput = phone || identifier;
      const normalizedPhone = normalizePhoneNumber(phoneInput);
      if (normalizedPhone) {
        const phoneVariants = buildPhoneVariants(phoneInput);
        user = await User.findOne({
          $or: [
            { phone: { $in: phoneVariants } },
            { phone: new RegExp(`${normalizedPhone}$`) },
          ],
        });
      }
    }

    // C. Fallback direct email match
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

    const frontendBase = (process.env.FRONTEND_URL || 'https://agro-mitra-frontend.vercel.app').replace(/\/+$/, '');
    const resetLink = `${frontendBase}/reset-password?token=${rawResetToken}&phone=${encodeURIComponent(user.phone || '')}`;

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
    } else {
      const identifier = (phone || email || '').toString().trim();
      if (!identifier) {
        res.status(400).json({
          success: false,
          message: 'Password reset token or registered account phone number/email is required.',
        });
        return;
      }

      if (identifier.includes('@')) {
        user = await User.findOne({ email: identifier.toLowerCase() });
      }

      if (!user) {
        const phoneInput = phone || identifier;
        const normalizedPhone = normalizePhoneNumber(phoneInput);
        if (normalizedPhone) {
          const phoneVariants = buildPhoneVariants(phoneInput);
          user = await User.findOne({
            $or: [
              { phone: { $in: phoneVariants } },
              { phone: new RegExp(`${normalizedPhone}$`) },
            ],
          });
        }
      }

      if (!user && email && typeof email === 'string') {
        user = await User.findOne({ email: email.toLowerCase().trim() });
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'No account found with this phone number or email.',
        });
        return;
      }
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
      const cleanUpi = upiId.trim();
      if (cleanUpi.length > 0) {
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9]{2,64}$/;
        if (!upiRegex.test(cleanUpi)) {
          res.status(400).json({
            success: false,
            message: 'Invalid UPI ID format. UPI ID must be in the format username@bank (e.g. store@icici or 9876543210@upi).',
          });
          return;
        }
      }
      user.upiId = cleanUpi;
    }
    if (qrCodeUrl !== undefined && typeof qrCodeUrl === 'string') {
      user.qrCodeUrl = qrCodeUrl.trim();
    }

    await user.save();

    // If user is ADMIN, SHOP_OWNER, or AGRI_PARTNER, synchronize active StorePaymentConfig
    if (['ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'].includes(user.role)) {
      try {
        let storeConfig = await StorePaymentConfig.findOne({}).sort({ updatedAt: -1 });
        const cleanStore = user.shopName || user.name || 'AgroMitra Agri Store';
        const cleanUpi = user.upiId || '';
        const cleanPhone = user.phone || '';

        if (!storeConfig) {
          if (cleanUpi) {
            storeConfig = new StorePaymentConfig({
              storeName: cleanStore,
              upiId: cleanUpi,
              phoneNumber: cleanPhone,
              merchantName: cleanStore,
              isActive: true,
              updatedBy: user._id,
            });
            await storeConfig.save();
          }
        } else {
          if (cleanUpi) {
            storeConfig.upiId = cleanUpi;
          }
          if (user.shopName) {
            storeConfig.storeName = user.shopName;
            storeConfig.merchantName = user.shopName;
          }
          if (cleanPhone) {
            storeConfig.phoneNumber = cleanPhone;
          }
          storeConfig.isActive = true;
          storeConfig.updatedBy = user._id;
          await storeConfig.save();
        }
      } catch (syncErr) {
        console.warn('[updateProfile] StorePaymentConfig sync warning:', syncErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

