import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

export const autoSeedDefaultData = async (): Promise<void> => {
  try {
    const seedAccounts = [
      {
        name: 'Nandeeswar',
        email: 'nandeeswarreddy1346@gmail.com',
        phone: '9876543210',
        role: 'SHOP_OWNER' as const,
        shopName: 'Kisan Agri Kendra',
        upiId: 'nandeeswar@upi',
        address: {
          street: 'Main Market Road, Agri Complex',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
      {
        name: 'Nandhu',
        email: 'nandeeswarreddy2852@gmail.com',
        phone: '8519813077',
        role: 'FARMER' as const,
        address: {
          street: 'Survey 42, Green Agro Farm',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
      {
        name: 'KrishiSetu Admin',
        email: 'admin@agrimart.com',
        phone: '9876543211',
        role: 'ADMIN' as const,
      },
      {
        name: 'Ramesh Kumar',
        email: 'delivery@agrimart.com',
        phone: '9876543220',
        role: 'DELIVERY_BOY' as const,
        address: {
          street: 'Agri Transport Hub',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
      {
        name: 'Agri Partner Kendra',
        email: 'agripartner@agrimart.com',
        phone: '9876543299',
        role: 'AGRI_PARTNER' as const,
        shopName: 'AgroMitra Certified Agri Kendra',
        upiId: 'agripartner@upi',
        address: {
          street: 'Market Yard Complex, Shop 12',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    ];

    for (const acc of seedAccounts) {
      // Remove any stale conflicting accounts holding this seed account's phone
      await User.deleteMany({ phone: acc.phone, email: { $ne: acc.email } });

      const existing = await User.findOne({ email: acc.email }).select('+password');

      if (!existing) {
        const createdUser = await User.create({
          ...acc,
          password: 'Password123',
        });

        if (acc.role === 'DELIVERY_BOY') {
          const shopOwnerUser = await User.findOne({ role: 'SHOP_OWNER' });
          await DeliveryBoy.create({
            user: createdUser._id,
            shopOwner: shopOwnerUser?._id,
            name: createdUser.name,
            phone: createdUser.phone,
            email: createdUser.email,
            vehicleType: 'Two-Wheeler Delivery Van',
            deliveryArea: 'Agro Market & Rural Mandals',
            isAvailable: true,
            activeOrdersCount: 0,
          });
        }
      } else {
        let needsSave = false;
        if (acc.name && existing.name !== acc.name) {
          existing.name = acc.name;
          needsSave = true;
        }
        if (acc.phone && existing.phone !== acc.phone) {
          existing.phone = acc.phone;
          needsSave = true;
        }
        if (acc.role && existing.role !== acc.role) {
          existing.role = acc.role;
          needsSave = true;
        }
        if (acc.shopName && !existing.shopName) {
          existing.shopName = acc.shopName;
          needsSave = true;
        }
        if (acc.upiId && !existing.upiId) {
          existing.upiId = acc.upiId;
          needsSave = true;
        }
        if (acc.address && (!existing.address || !existing.address.city)) {
          existing.address = acc.address;
          needsSave = true;
        }
        const hasValidDefaultPassword = existing.password ? await existing.comparePassword('Password123') : false;
        if (!hasValidDefaultPassword) {
          existing.password = 'Password123';
          needsSave = true;
        }
        if (needsSave) {
          await existing.save();
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
