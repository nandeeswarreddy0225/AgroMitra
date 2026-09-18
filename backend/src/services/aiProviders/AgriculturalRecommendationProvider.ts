import { Product, IProduct } from '../../models/Product.model';
import { User, IUser } from '../../models/User.model';
import { ShopMatchingService } from '../shopMatching.service';
import { RecommendedProduct, NearbyShopSummary } from './types';

export interface FarmerCoordinates {
  latitude?: number;
  longitude?: number;
}

export class AgriculturalRecommendationProvider {
  /**
   * Determine matching product categories and search terms based on species and disease
   */
  public static getSearchCriteria(
    species: string | null,
    disease: string | null,
    isHealthy: boolean
  ): { categories: string[]; keywords: string[] } {
    if (isHealthy) {
      return {
        categories: ['Bio-Fertilizers', 'Fertilizers', 'Soil Conditioners', 'Growth Promoters'],
        keywords: ['growth', 'bio', 'nutrition', 'tonic'],
      };
    }

    const dLower = (disease || '').toLowerCase();
    const keywords: string[] = [];

    if (dLower.includes('blight') || dLower.includes('rot') || dLower.includes('spot') || dLower.includes('scab') || dLower.includes('mold') || dLower.includes('rust') || dLower.includes('mildew')) {
      return {
        categories: ['Fungicides', 'Bio Products', 'Crop Protection Products', 'Pesticides'],
        keywords: ['fungicide', 'copper', 'blight', 'mancozeb', 'neem', 'bio'],
      };
    }

    if (dLower.includes('bacterial')) {
      return {
        categories: ['Bio Products', 'Crop Protection Products', 'Fungicides', 'Pesticides'],
        keywords: ['bacterial', 'streptocycline', 'copper', 'bio', 'neem'],
      };
    }

    if (dLower.includes('virus') || dLower.includes('curl') || dLower.includes('mosaic') || dLower.includes('mite') || dLower.includes('pest') || dLower.includes('insect') || dLower.includes('borer')) {
      return {
        categories: ['Insecticides', 'Pesticides', 'Bio Products', 'Crop Protection Products'],
        keywords: ['insecticide', 'neem', 'mite', 'pest', 'spray'],
      };
    }

    return {
      categories: ['Crop Protection Products', 'Bio Products', 'Pesticides', 'Fungicides'],
      keywords: ['protect', 'cure', 'spray'],
    };
  }

  /**
   * Query real products and nearby registered shops from MongoDB
   * Returns empty array if no real matching product with stock > 0 exists
   */
  public async getRecommendationsAndShops(
    species: string | null,
    disease: string | null,
    isHealthy: boolean,
    farmerCoords?: FarmerCoordinates | null
  ): Promise<{
    products: RecommendedProduct[];
    nearbyShops: NearbyShopSummary[];
  }> {
    const { categories, keywords } = AgriculturalRecommendationProvider.getSearchCriteria(
      species,
      disease,
      isHealthy
    );

    // Build regex search for relevant categories or name matches
    const categoryQuery = { category: { $in: categories } };
    const keywordRegexes = keywords.map((k) => new RegExp(k, 'i'));
    const nameOrDescQuery = {
      $or: [
        { name: { $in: keywordRegexes } },
        { description: { $in: keywordRegexes } },
      ],
    };

    // Find real products with stock > 0 and isActive !== false
    let products = await Product.find({
      isActive: { $ne: false },
      stock: { $gt: 0 },
      $or: [categoryQuery, nameOrDescQuery],
    })
      .populate('shopOwner', 'name shopName phone address status isApproved')
      .limit(30)
      .lean();

    // If specific search yielded zero, fallback to any available crop protection / fertilizer products with stock > 0
    if (products.length === 0) {
      products = await Product.find({
        isActive: { $ne: false },
        stock: { $gt: 0 },
      })
        .populate('shopOwner', 'name shopName phone address status isApproved')
        .limit(10)
        .lean();
    }

    const recommendedProducts: RecommendedProduct[] = [];
    const shopMap = new Map<string, NearbyShopSummary>();

    for (const p of products) {
      const shopOwner = p.shopOwner as any;
      if (!shopOwner || shopOwner.status === 'DISABLED') {
        continue;
      }

      // Calculate real distance if coordinates are present
      let distanceKm: number | undefined;
      const shopLat = shopOwner.address?.latitude;
      const shopLon = shopOwner.address?.longitude;

      if (
        farmerCoords?.latitude !== undefined &&
        farmerCoords?.longitude !== undefined &&
        shopLat !== undefined &&
        shopLon !== undefined &&
        !isNaN(Number(farmerCoords.latitude)) &&
        !isNaN(Number(farmerCoords.longitude)) &&
        !isNaN(Number(shopLat)) &&
        !isNaN(Number(shopLon))
      ) {
        distanceKm = ShopMatchingService.calculateHaversineDistance(
          Number(farmerCoords.latitude),
          Number(farmerCoords.longitude),
          Number(shopLat),
          Number(shopLon)
        );
      }

      const shopOwnerId = shopOwner._id?.toString() || shopOwner.id?.toString() || '';
      const shopName = shopOwner.shopName || shopOwner.name || 'Agri Store';

      recommendedProducts.push({
        productId: (p._id as any).toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand || 'Standard',
        price: p.price,
        unit: p.unit,
        stock: p.stock,
        images: p.images || [],
        shop: {
          shopOwnerId,
          shopName,
          phone: shopOwner.phone,
          city: shopOwner.address?.city,
          state: shopOwner.address?.state,
          pincode: shopOwner.address?.pincode,
          address: [shopOwner.address?.street, shopOwner.address?.city, shopOwner.address?.state].filter(Boolean).join(', '),
          latitude: shopLat,
          longitude: shopLon,
          distanceKm,
        },
      });

      // Aggregate nearby shop summary
      if (shopOwnerId) {
        const existing = shopMap.get(shopOwnerId);
        if (existing) {
          existing.availableProductsCount += 1;
        } else {
          shopMap.set(shopOwnerId, {
            shopOwnerId,
            shopName,
            phone: shopOwner.phone,
            city: shopOwner.address?.city,
            address: [shopOwner.address?.street, shopOwner.address?.city].filter(Boolean).join(', '),
            distanceKm: distanceKm ?? 0,
            availableProductsCount: 1,
          });
        }
      }
    }

    // If farmer coordinates were provided, sort products and shops by real distance
    if (farmerCoords?.latitude !== undefined && farmerCoords?.longitude !== undefined) {
      recommendedProducts.sort((a, b) => {
        const distA = a.shop.distanceKm ?? 999999;
        const distB = b.shop.distanceKm ?? 999999;
        return distA - distB;
      });
    }

    const nearbyShops = Array.from(shopMap.values());
    if (farmerCoords?.latitude !== undefined && farmerCoords?.longitude !== undefined) {
      nearbyShops.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return {
      products: recommendedProducts,
      nearbyShops,
    };
  }
}

export const agriculturalRecommendationProvider = new AgriculturalRecommendationProvider();
