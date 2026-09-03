import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

export const autoSeedDefaultData = async (): Promise<void> => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 [Database]: Seeding default accounts and products for development...');

      // 1. Agri Retail Partner (Nandeeswar)
      const shopOwner = await User.create({
        name: 'Nandeeswar',
        email: 'nandeeswarreddy1346@gmail.com',
        phone: '9876543210',
        password: 'Password123',
        role: 'SHOP_OWNER',
        shopName: 'Kisan Agri Kendra',
        upiId: 'nandeeswar@upi',
        address: {
          street: 'Main Market Road, Agri Complex',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440001',
        },
      });

      // 2. Farmer (Nandhu)
      await User.create({
        name: 'Nandhu',
        email: 'nandeeswarreddy2852@gmail.com',
        phone: '8519813077',
        password: 'Password123',
        role: 'FARMER',
        address: {
          street: 'Survey 42, Green Agro Farm',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440001',
        },
      });

      // 3. Admin
      await User.create({
        name: 'KrishiSetu Admin',
        email: 'admin@agrimart.com',
        phone: '9876543211',
        password: 'Password123',
        role: 'ADMIN',
      });

      // 4. Delivery Boy (Ramesh Kumar)
      const deliveryUser = await User.create({
        name: 'Ramesh Kumar',
        email: 'delivery@agrimart.com',
        phone: '9876543220',
        password: 'Password123',
        role: 'DELIVERY_BOY',
        address: {
          street: 'Agri Transport Nagar',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440001',
        },
      });

      // Create DeliveryBoy profile linked to Shop Owner
      await DeliveryBoy.create({
        user: deliveryUser._id,
        shopOwner: shopOwner._id,
        name: 'Ramesh Kumar',
        phone: '9876543220',
        email: 'delivery@agrimart.com',
        vehicleType: 'Hero Splendor Plus (MH-31-AG-4402)',
        deliveryArea: 'Nagpur Agro Market & Rural Mandals',
        isAvailable: true,
        activeOrdersCount: 0,
      });

      console.log('✅ [Database]: Auto-seed complete. Real accounts and delivery boys ready.');

    } else {
      // Ensure default accounts exist with verifiable credentials
      const seedAccounts = [
        {
          name: 'Nandhu',
          email: 'nandeeswarreddy2852@gmail.com',
          phone: '8519813077',
          role: 'FARMER',
        },
        {
          name: 'Nandeeswar',
          email: 'nandeeswarreddy1346@gmail.com',
          phone: '9876543210',
          role: 'SHOP_OWNER',
          shopName: 'Kisan Agri Kendra',
          upiId: 'nandeeswar@upi',
        },
        {
          name: 'KrishiSetu Admin',
          email: 'admin@agrimart.com',
          phone: '9876543211',
          role: 'ADMIN',
        },
        {
          name: 'Ramesh Kumar',
          email: 'delivery@agrimart.com',
          phone: '9876543220',
          role: 'DELIVERY_BOY',
        },
      ];

      for (const acc of seedAccounts) {
        let u = await User.findOne({ email: acc.email }).select('+password');
        if (!u) {
          await User.create({
            ...acc,
            password: 'Password123',
          });
        } else {
          const isValid = await u.comparePassword('Password123');
          if (!isValid) {
            u.password = 'Password123';
            await u.save();
          }
        }
      }
    }

    // Synchronize official Andhra Pradesh and Telangana Government Schemes
    const { Scheme } = await import('../models/Scheme.model');
    const { OFFICIAL_INDIAN_SCHEMES } = await import('../data/officialSchemes');

    // Remove legacy generic schemes to ensure only verified AP and Telangana schemes are active
    await Scheme.deleteMany({});
    await Scheme.insertMany(OFFICIAL_INDIAN_SCHEMES);
    console.log(`🏛️  [Database]: Synchronized ${OFFICIAL_INDIAN_SCHEMES.length} verified Andhra Pradesh & Telangana government schemes.`);
  } catch (error) {
    console.error('⚠️ [Database]: Auto-seed error (non-fatal):', error);
  }
};
