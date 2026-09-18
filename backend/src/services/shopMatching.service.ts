import mongoose, { Types } from 'mongoose';
import { Order, IOrder, IEligibleShop } from '../models/Order.model';
import { Product, IProduct } from '../models/Product.model';
import { User, IUser } from '../models/User.model';
import { LocationService } from './location.service';

export interface EligibleShopCandidate {
  shopOwnerId: Types.ObjectId;
  shopName: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  phone?: string;
  city?: string;
}

export interface RoutingResult {
  success: boolean;
  order: IOrder;
  assignedShop?: EligibleShopCandidate;
  candidatesCount: number;
  message: string;
  exhausted?: boolean;
}

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  kurnool: { latitude: 15.8281, longitude: 78.0373 },
  adoni: { latitude: 15.6268, longitude: 77.275 },
  nandyal: { latitude: 15.4883, longitude: 78.4832 },
  guntur: { latitude: 16.3067, longitude: 80.4365 },
  vijayawada: { latitude: 16.5062, longitude: 80.648 },
  anantapur: { latitude: 14.6819, longitude: 77.6006 },
  hyderabad: { latitude: 17.385, longitude: 78.4867 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  ballari: { latitude: 15.1394, longitude: 76.9214 },
};

export class ShopMatchingService {
  /**
   * High-precision Haversine formula to compute great-circle distance between two points in km
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's mean radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Resolve coordinates for Farmer delivery address
   */
  public static async resolveFarmerCoordinates(
    order: IOrder
  ): Promise<{ latitude: number; longitude: number } | null> {
    // 1. Direct coordinates on delivery address
    if (
      order.deliveryAddress?.latitude !== undefined &&
      order.deliveryAddress?.longitude !== undefined &&
      !isNaN(Number(order.deliveryAddress.latitude)) &&
      !isNaN(Number(order.deliveryAddress.longitude))
    ) {
      return {
        latitude: Number(order.deliveryAddress.latitude),
        longitude: Number(order.deliveryAddress.longitude),
      };
    }

    // 2. Check Farmer User profile coordinates
    const farmerUser = await User.findById(order.farmer);
    if (
      farmerUser?.address?.latitude !== undefined &&
      farmerUser?.address?.longitude !== undefined &&
      !isNaN(Number(farmerUser.address.latitude)) &&
      !isNaN(Number(farmerUser.address.longitude))
    ) {
      return {
        latitude: Number(farmerUser.address.latitude),
        longitude: Number(farmerUser.address.longitude),
      };
    }

    // 3. Fallback: Geocode via District / Pincode
    const rawPin = order.deliveryAddress?.pincode || farmerUser?.address?.pincode;
    if (rawPin) {
      const pinResult = await LocationService.lookupPincode(rawPin);
      if (pinResult.success && pinResult.city) {
        const cityLookup = pinResult.city.toLowerCase().trim();
        const match = CITY_COORDINATES[cityLookup];
        if (match) {
          return match;
        }
      }
    }

    const rawCity = (order.deliveryAddress?.city || farmerUser?.address?.city || '').toLowerCase().trim();
    if (rawCity && CITY_COORDINATES[rawCity]) {
      return CITY_COORDINATES[rawCity];
    }

    return null;
  }

  /**
   * Resolve coordinates for a Shop Owner / Store profile
   */
  public static resolveShopCoordinates(
    shop: IUser
  ): { latitude: number; longitude: number } | null {
    if (
      shop.address?.latitude !== undefined &&
      shop.address?.longitude !== undefined &&
      !isNaN(Number(shop.address.latitude)) &&
      !isNaN(Number(shop.address.longitude))
    ) {
      return {
        latitude: Number(shop.address.latitude),
        longitude: Number(shop.address.longitude),
      };
    }

    const rawCity = (shop.address?.city || '').toLowerCase().trim();
    if (rawCity && CITY_COORDINATES[rawCity]) {
      return CITY_COORDINATES[rawCity];
    }

    return null;
  }

  /**
   * Identify all eligible, active nearby shops that sell the ordered products and rank them by distance
   */
  public static async findEligibleShopsForOrder(
    order: IOrder,
    maxRadiusKm: number = 100 // Configurable maximum service radius
  ): Promise<EligibleShopCandidate[]> {
    const farmerCoords = await this.resolveFarmerCoordinates(order);
    if (!farmerCoords) {
      console.warn(`[ShopMatching]: Unable to resolve farmer coordinates for Order #${order.orderNumber}`);
      return [];
    }

    // Set of shops that already rejected this order
    const rejectedShopIds = new Set(
      (order.rejectionHistory || []).map((r) => r.shopOwner.toString())
    );

    // Collect distinct products and quantities required by this order
    const requiredItems = order.items.map((item) => ({
      productId: item.product.toString(),
      name: (item.productNameSnapshot || '').trim().toLowerCase(),
      quantity: item.quantity,
      originalShopOwner: item.shopOwner ? item.shopOwner.toString() : null,
    }));

    // Find all active, approved shop owners
    const activeShopOwners = await User.find({
      role: { $in: ['SHOP_OWNER', 'AGRI_PARTNER'] },
      status: 'ACTIVE',
      isApproved: { $ne: false },
    });

    const candidates: EligibleShopCandidate[] = [];

    for (const shop of activeShopOwners) {
      const shopIdStr = shop._id.toString();

      // Exclude if already rejected
      if (rejectedShopIds.has(shopIdStr)) {
        continue;
      }

      // Check shop coordinates
      const shopCoords = this.resolveShopCoordinates(shop);
      if (!shopCoords) {
        continue;
      }

      // Check if this shop sells the required products with sufficient stock
      let canFulfillAll = true;

      for (const item of requiredItems) {
        let hasStock = false;
        if (item.originalShopOwner === shopIdStr) {
          const directProd = await Product.findOne({
            _id: item.productId,
            shopOwner: shop._id,
            isActive: true,
          });
          if (directProd && directProd.stock >= item.quantity) {
            hasStock = true;
          }
        }

        if (!hasStock) {
          const catalogProd = await Product.findOne({
            shopOwner: shop._id,
            isActive: true,
            $or: [
              { _id: item.productId },
              { name: new RegExp(`^${item.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
            ],
            stock: { $gte: item.quantity },
          });
          if (catalogProd) {
            hasStock = true;
          }
        }

        if (!hasStock) {
          canFulfillAll = false;
          break;
        }
      }

      if (!canFulfillAll) {
        continue;
      }

      // Calculate Haversine distance
      const distance = this.calculateHaversineDistance(
        farmerCoords.latitude,
        farmerCoords.longitude,
        shopCoords.latitude,
        shopCoords.longitude
      );

      // Check service radius
      if (maxRadiusKm > 0 && distance > maxRadiusKm) {
        continue;
      }

      candidates.push({
        shopOwnerId: shop._id,
        shopName: shop.shopName || shop.name || 'Agro Retail Store',
        distanceKm: distance,
        latitude: shopCoords.latitude,
        longitude: shopCoords.longitude,
        phone: shop.phone,
        city: shop.address?.city,
      });
    }

    // Rank by distance ascending (closest first)
    candidates.sort((a, b) => a.distanceKm - b.distanceKm);

    return candidates;
  }

  /**
   * Match and assign an order to the closest eligible shop upon order placement
   */
  public static async assignOrderToBestShop(
    orderId: string | Types.ObjectId
  ): Promise<RoutingResult> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const eligibleShops = await this.findEligibleShopsForOrder(order);

    // Save eligible shops list onto Order document
    order.eligibleShops = eligibleShops.map((c) => ({
      shopOwner: c.shopOwnerId,
      distanceKm: c.distanceKm,
      status: 'PENDING',
    }));

    if (eligibleShops.length === 0) {
      const originalShopId = order.items[0]?.shopOwner;
      if (originalShopId) {
        const fallbackShop = await User.findById(originalShopId);
        if (fallbackShop && fallbackShop.status === 'ACTIVE') {
          order.assignedShopOwner = fallbackShop._id;
          order.status = 'WAITING_FOR_SHOP';
          order.statusTimeline.push({
            status: 'WAITING_FOR_SHOP',
            timestamp: new Date(),
            message: `Order assigned to retail partner ${fallbackShop.shopName || fallbackShop.name}. Waiting for acceptance.`,
          });
          await order.save();
          return {
            success: true,
            order,
            candidatesCount: 1,
            message: 'Assigned to primary catalog shop.',
          };
        }
      }

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        message: 'Searching for nearby stores with available inventory.',
      });
      await order.save();

      return {
        success: false,
        order,
        candidatesCount: 0,
        message: 'No eligible nearby stores found within service radius.',
      };
    }

    // Select closest eligible shop
    const topShop = eligibleShops[0];
    order.assignedShopOwner = topShop.shopOwnerId;
    order.status = 'WAITING_FOR_SHOP';
    order.statusTimeline.push({
      status: 'WAITING_FOR_SHOP',
      timestamp: new Date(),
      message: `Order routed to nearby store (${topShop.shopName}, ${topShop.distanceKm} km away). Waiting for acceptance.`,
    });

    await order.save();

    return {
      success: true,
      order,
      assignedShop: topShop,
      candidatesCount: eligibleShops.length,
      message: `Successfully routed order to ${topShop.shopName} (${topShop.distanceKm} km).`,
    };
  }

  /**
   * Reroute order to the next closest eligible shop after a shop rejects
   */
  public static async routeOrderToNextShop(
    orderId: string | Types.ObjectId
  ): Promise<RoutingResult> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const remainingShops = await this.findEligibleShopsForOrder(order);

    if (remainingShops.length === 0) {
      order.status = 'REJECTED';
      order.assignedShopOwner = undefined;
      order.statusTimeline.push({
        status: 'REJECTED',
        timestamp: new Date(),
        message: 'All eligible nearby stores were unable to fulfill this order. Order rejected.',
      });

      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }

      await order.save();

      return {
        success: false,
        order,
        candidatesCount: 0,
        exhausted: true,
        message: 'All eligible shops have been exhausted. Order marked as REJECTED.',
      };
    }

    // Assign to next closest shop
    const nextShop = remainingShops[0];
    order.assignedShopOwner = nextShop.shopOwnerId;
    order.status = 'WAITING_FOR_SHOP';

    if (order.eligibleShops) {
      const entry = order.eligibleShops.find(
        (e) => e.shopOwner.toString() === nextShop.shopOwnerId.toString()
      );
      if (entry) {
        entry.status = 'PENDING';
      }
    }

    order.statusTimeline.push({
      status: 'WAITING_FOR_SHOP',
      timestamp: new Date(),
      message: `Rerouted to next nearest store (${nextShop.shopName}, ${nextShop.distanceKm} km away). Waiting for acceptance.`,
    });

    await order.save();

    return {
      success: true,
      order,
      assignedShop: nextShop,
      candidatesCount: remainingShops.length,
      message: `Order rerouted to ${nextShop.shopName} (${nextShop.distanceKm} km).`,
    };
  }
}

export default ShopMatchingService;
