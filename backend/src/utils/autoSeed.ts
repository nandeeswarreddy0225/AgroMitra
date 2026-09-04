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
    ];

    for (const acc of seedAccounts) {
      const existing = await User.findOne({ email: acc.email });
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
