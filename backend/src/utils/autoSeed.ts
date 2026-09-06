import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';

export const autoSeedDefaultData = async (): Promise<void> => {
  try {
    const seedAccounts = [
      {
        name: 'KrishiSetu Admin',
        email: 'admin@agrimart.com',
        phone: '9876543211',
        role: 'ADMIN' as const,
        shopName: 'AgroMitra Super Store',
        upiId: 'partnerB.kurnool@hdfcbank',
      },
    ];

    for (const acc of seedAccounts) {
      let user: any = await User.findOne({ email: acc.email }).select('+password');

      if (!user) {
        user = await User.findOne({ phone: acc.phone }).select('+password');
      }

      if (!user) {
        user = await User.create({
          ...acc,
          password: 'Password123',
        });
        console.log(`✅ [Database]: Created seed account '${acc.email}' (${acc.role}, ${acc.phone}).`);
      } else {
        let needsSave = false;
        if (acc.name && user.name !== acc.name) {
          user.name = acc.name;
          needsSave = true;
        }
        if (acc.phone && user.phone !== acc.phone) {
          user.phone = acc.phone;
          needsSave = true;
        }
        if (acc.role && user.role !== acc.role) {
          user.role = acc.role;
          needsSave = true;
        }
        if (acc.shopName && !user.shopName) {
          user.shopName = acc.shopName;
          needsSave = true;
        }
        if (acc.upiId && !user.upiId) {
          user.upiId = acc.upiId;
          needsSave = true;
        }
        if (acc.address && (!user.address || !user.address.city)) {
          user.address = acc.address;
          needsSave = true;
        }
        const hasValidDefaultPassword = user.password ? await user.comparePassword('Password123') : false;
        if (!hasValidDefaultPassword) {
          user.password = 'Password123';
          needsSave = true;
        }
        if (needsSave) {
          await user.save();
          console.log(`✅ [Database]: Updated seed account '${acc.email}' (${acc.role}).`);
        }
      }

      if (acc.role === 'DELIVERY_BOY' && user) {
        const existingDB = await DeliveryBoy.findOne({ user: user._id });
        if (!existingDB) {
          await DeliveryBoy.create({
            user: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            vehicleType: 'Motorcycle / Two-Wheeler',
            deliveryArea: 'Agro Market & Rural Mandals',
            isAvailable: true,
            activeOrdersCount: 0,
          });
          console.log(`🚚 [Database]: Created DeliveryBoy profile for '${user.email}'.`);
        }
      }
    }

    // Ensure active StorePaymentConfig exists
    const activeStoreConfig = await StorePaymentConfig.findOne({ isActive: true });
    if (!activeStoreConfig) {
      await StorePaymentConfig.create({
        storeName: 'AgroMitra Certified Agri Kendra',
        upiId: 'agripartner@upi',
        phoneNumber: '9876543299',
        merchantName: 'AgroMitra Certified Agri Kendra',
        isActive: true,
      });
      console.log('💳 [Database]: Initialized active StorePaymentConfig for UPI QR.');
    }

    // Synchronize official Andhra Pradesh and Telangana Government Schemes
    const { Scheme } = await import('../models/Scheme.model');
    const { OFFICIAL_INDIAN_SCHEMES } = await import('../data/officialSchemes');

    const schemeCount = await Scheme.countDocuments();
    if (schemeCount === 0) {
      await Scheme.insertMany(OFFICIAL_INDIAN_SCHEMES);
      console.log(`🏛️  [Database]: Synchronized ${OFFICIAL_INDIAN_SCHEMES.length} verified Andhra Pradesh & Telangana government schemes.`);
    }
  } catch (error) {
    console.error('⚠️ [Database]: Auto-seed error (non-fatal):', error);
  }
};

