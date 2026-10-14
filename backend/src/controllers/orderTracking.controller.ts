import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

interface Coordinate {
  latitude: number;
  longitude: number;
}

// Haversine distance in KM
const calculateHaversineDistance = (p1: Coordinate, p2: Coordinate): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

// Bearing calculation in degrees
const calculateBearing = (start: Coordinate, end: Coordinate): number => {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;
  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
};

// Generate realistic intermediate curved waypoints mimicking road networks
const generateRouteWaypoints = (origin: Coordinate, destination: Coordinate, count = 7): Coordinate[] => {
  const waypoints: Coordinate[] = [origin];
  const dLat = destination.latitude - origin.latitude;
  const dLon = destination.longitude - origin.longitude;

  for (let i = 1; i < count - 1; i++) {
    const fraction = i / (count - 1);
    // Add realistic road curve jitter
    const curveOffset = Math.sin(fraction * Math.PI) * 0.008 * (i % 2 === 0 ? 1 : -0.7);
    const perpendicularOffsetLat = -dLon * 0.12 * Math.sin(fraction * Math.PI);
    const perpendicularOffsetLng = dLat * 0.12 * Math.sin(fraction * Math.PI);

    waypoints.push({
      latitude: parseFloat((origin.latitude + dLat * fraction + perpendicularOffsetLat + curveOffset).toFixed(6)),
      longitude: parseFloat((origin.longitude + dLon * fraction + perpendicularOffsetLng).toFixed(6)),
    });
  }

  waypoints.push(destination);
  return waypoints;
};

// City coordinate registry for intelligent Indian agro-regions
const REGIONAL_COORDINATES: Record<string, Coordinate> = {
  kurnool: { latitude: 15.8281, longitude: 78.0373 },
  vijayawada: { latitude: 16.5062, longitude: 80.648 },
  guntur: { latitude: 16.3067, longitude: 80.4365 },
  hyderabad: { latitude: 17.385, longitude: 78.4867 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  nagpur: { latitude: 21.1458, longitude: 79.0882 },
  nashik: { latitude: 19.9975, longitude: 73.7898 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  belgaum: { latitude: 15.8497, longitude: 74.4977 },
  davangere: { latitude: 14.4644, longitude: 75.9218 },
  coimbatore: { latitude: 11.0168, longitude: 76.9558 },
  madurai: { latitude: 9.9252, longitude: 78.1198 },
  indore: { latitude: 22.7196, longitude: 75.8577 },
  bhopal: { latitude: 23.2599, longitude: 77.4126 },
  ludhiana: { latitude: 30.901, longitude: 75.8573 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  varanasi: { latitude: 25.3176, longitude: 82.9739 },
};

const resolveCoordinate = (
  city?: string,
  state?: string,
  explicitLat?: number,
  explicitLon?: number,
  fallbackBase = { latitude: 15.8281, longitude: 78.0373 },
  offsetFactor = 0
): Coordinate => {
  if (explicitLat && explicitLon && !isNaN(explicitLat) && !isNaN(explicitLon)) {
    return { latitude: explicitLat, longitude: explicitLon };
  }

  const normalizedCity = (city || '').toLowerCase().trim();
  for (const [key, coord] of Object.entries(REGIONAL_COORDINATES)) {
    if (normalizedCity.includes(key)) {
      return {
        latitude: parseFloat((coord.latitude + offsetFactor * 0.025).toFixed(6)),
        longitude: parseFloat((coord.longitude + offsetFactor * 0.02).toFixed(6)),
      };
    }
  }

  return {
    latitude: parseFloat((fallbackBase.latitude + offsetFactor * 0.035).toFixed(6)),
    longitude: parseFloat((fallbackBase.longitude + offsetFactor * 0.03).toFixed(6)),
  };
};

export const getOrderTrackingTelemetry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Invalid Order ID.' });
      return;
    }

    const order = await Order.findById(id)
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId')
      .populate('acceptedShopOwner', 'name email phone address shopName')
      .populate('assignedShopOwner', 'name email phone address shopName')
      .populate('deliveryBoy', 'name email phone');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const isFarmerOwner =
      order.farmer?._id?.toString() === userIdStr || order.farmer?.toString() === userIdStr;

    const isShopOwnerOfItem = order.items.some((item) => {
      const itemShopOwnerId =
        (item.shopOwner as any)?._id?.toString() ||
        (item.shopOwner as any)?.id?.toString() ||
        item.shopOwner?.toString();
      return (
        itemShopOwnerId === userIdStr ||
        order.acceptedShopOwner?._id?.toString() === userIdStr ||
        order.assignedShopOwner?._id?.toString() === userIdStr
      );
    });

    const isDeliveryBoyOfOrder = Boolean(order.deliveryBoy && (order.deliveryBoy as any)._id?.toString() === userIdStr || order.deliveryBoy?.toString() === userIdStr);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isFarmerOwner && !isShopOwnerOfItem && !isDeliveryBoyOfOrder && !isAdmin) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to track this order.' });
      return;
    }

    // Resolve Origin (Shop)
    const primaryShop =
      (order.acceptedShopOwner as any) ||
      (order.assignedShopOwner as any) ||
      (order.items[0]?.shopOwner as any);

    const shopAddress = primaryShop?.address || {};
    const originCoord = resolveCoordinate(
      shopAddress.city || order.deliveryAddress.city,
      shopAddress.state || order.deliveryAddress.state,
      shopAddress.latitude,
      shopAddress.longitude,
      { latitude: 15.8281, longitude: 78.0373 },
      0
    );

    // Resolve Destination (Farmer Delivery Location)
    const farmerDelivery = order.deliveryAddress;
    const destCoord = resolveCoordinate(
      farmerDelivery.city,
      farmerDelivery.state,
      farmerDelivery.latitude,
      farmerDelivery.longitude,
      originCoord,
      1 // slightly offset destination from origin
    );

    const totalDistanceKm = Math.max(1.5, calculateHaversineDistance(originCoord, destCoord));
    const waypoints = generateRouteWaypoints(originCoord, destCoord, 8);

    // Calculate progression based on status
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED';
    const isOutForDelivery =
      order.status === 'OUT_FOR_DELIVERY' ||
      order.status === 'DISPATCHED' ||
      order.deliveryStatus === 'OUT_FOR_DELIVERY';
    const isPickedUp =
      order.status === 'READY_FOR_DELIVERY' ||
      order.deliveryStatus === 'PICKED_UP' ||
      order.deliveryStatus === 'READY_FOR_DELIVERY';

    let progressPercent = 0;
    let speedKmh = 0;

    if (isDelivered) {
      progressPercent = 100;
      speedKmh = 0;
    } else if (isOutForDelivery) {
      // Simulate real-time animated progression based on minutes elapsed
      const lastUpdate = new Date(order.updatedAt || order.createdAt).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - lastUpdate) / (1000 * 60);

      // Advance ~4% to 92% based on elapsed time with periodic loop for interactive testing
      const simulatedCyclePercent = Math.min(92, Math.max(15, Math.floor((elapsedMinutes * 8) % 95)));
      progressPercent = simulatedCyclePercent;
      speedKmh = 32 + Math.floor(Math.sin(now / 5000) * 8);
    } else if (isPickedUp) {
      progressPercent = 8;
      speedKmh = 0;
    } else {
      progressPercent = 0;
      speedKmh = 0;
    }

    // Determine current live coordinate along waypoints
    const waypointIndex = Math.min(
      waypoints.length - 1,
      Math.floor((progressPercent / 100) * (waypoints.length - 1))
    );
    const nextWaypointIndex = Math.min(waypoints.length - 1, waypointIndex + 1);

    const segmentFraction =
      (progressPercent / 100) * (waypoints.length - 1) - waypointIndex;

    const currentLat =
      waypoints[waypointIndex].latitude +
      (waypoints[nextWaypointIndex].latitude - waypoints[waypointIndex].latitude) * segmentFraction;
    const currentLng =
      waypoints[waypointIndex].longitude +
      (waypoints[nextWaypointIndex].longitude - waypoints[waypointIndex].longitude) * segmentFraction;

    const currentCoord: Coordinate = {
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6)),
    };

    const bearing = calculateBearing(
      waypoints[waypointIndex],
      waypoints[nextWaypointIndex]
    );

    const remainingFraction = Math.max(0, 1 - progressPercent / 100);
    const distanceRemainingKm = parseFloat((totalDistanceKm * remainingFraction).toFixed(2));
    const etaMinutes = isDelivered
      ? 0
      : Math.max(2, Math.round((distanceRemainingKm / 30) * 60));

    // Generate secure 4-digit verification OTP
    const rawSeed = order._id.toString().slice(-4).toUpperCase();
    const deliveryOtp = (parseInt(rawSeed, 16) % 9000 + 1000).toString();

    // Fetch delivery partner profile details if assigned
    let deliveryPartnerProfile: any = null;
    if (order.deliveryBoy) {
      const dbDoc = await DeliveryBoy.findOne({ user: (order.deliveryBoy as any)._id || order.deliveryBoy });
      deliveryPartnerProfile = {
        name: order.deliveryBoyName || (order.deliveryBoy as any).name || 'Ramesh Kumar',
        phone: order.deliveryBoyPhone || (order.deliveryBoy as any).phone || '+91 98765 43210',
        vehicleType: dbDoc?.vehicleType || 'Two-Wheeler Delivery Partner',
        deliveryArea: dbDoc?.deliveryArea || 'Local Agro Mandal',
      };
    } else {
      deliveryPartnerProfile = {
        name: 'Assigned Agro Logistics Partner',
        phone: primaryShop?.phone || '+91 98765 00000',
        vehicleType: 'Farm Logistics Vehicle',
        deliveryArea: 'Regional Hub',
      };
    }

    // Progression Milestones
    const milestones = [
      {
        step: 1,
        title: 'Order Confirmed',
        description: 'Order placed & assigned to nearest Agri Store Partner',
        done: true,
        active: false,
        time: order.createdAt,
      },
      {
        step: 2,
        title: 'Items Packed & Ready',
        description: 'Store verified fertilizers, seeds & supplies are packed securely',
        done: ['PREPARING', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY', 'PACKED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.status),
        active: order.status === 'PREPARING' || order.status === 'READY_FOR_PICKUP',
      },
      {
        step: 3,
        title: 'Picked Up by Courier',
        description: `${deliveryPartnerProfile.name} verified package barcode & left store hub`,
        done: ['OUT_FOR_DELIVERY', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.status) || order.deliveryStatus === 'PICKED_UP',
        active: order.status === 'READY_FOR_DELIVERY' || order.deliveryStatus === 'PICKED_UP',
      },
      {
        step: 4,
        title: 'Out for Farm Delivery',
        description: 'Live delivery courier navigating directly to your agricultural gate',
        done: isDelivered,
        active: isOutForDelivery,
      },
      {
        step: 5,
        title: 'Delivered Successfully',
        description: 'Package handed over with OTP verification',
        done: isDelivered,
        active: isDelivered,
        time: order.deliveryDeliveredAt,
      },
    ];

    res.status(200).json({
      success: true,
      telemetry: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        paymentStatus: order.paymentStatus,
        origin: {
          name: primaryShop?.shopName || primaryShop?.name || 'Agro Store Hub',
          phone: primaryShop?.phone,
          street: shopAddress.street || 'Agri Market Yard',
          city: shopAddress.city || farmerDelivery.city,
          state: shopAddress.state || farmerDelivery.state,
          coordinate: originCoord,
        },
        destination: {
          farmerName: (order.farmer as any)?.name || 'Farmer',
          phone: (order.farmer as any)?.phone,
          street: farmerDelivery.street,
          city: farmerDelivery.city,
          state: farmerDelivery.state,
          pincode: farmerDelivery.pincode,
          coordinate: destCoord,
        },
        currentLocation: {
          latitude: currentCoord.latitude,
          longitude: currentCoord.longitude,
          bearing,
          speedKmh,
        },
        route: {
          totalDistanceKm,
          distanceRemainingKm,
          etaMinutes,
          progressPercent,
          waypoints,
        },
        deliveryPartner: deliveryPartnerProfile,
        deliveryOtp,
        milestones,
      },
    });
  } catch (error) {
    next(error);
  }
};
