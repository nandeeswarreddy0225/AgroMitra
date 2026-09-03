import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { Product } from '../models/Product.model';
import { generateToken } from '../utils/jwt';
import http from 'http';
import app from '../app';

const TEST_PORT = 5016;
let server: http.Server;

async function testUpiQrPipeline() {
  await connectDB();
  server = app.listen(TEST_PORT);

  try {
    console.log('--- TESTING DIRECT UPI QR PAYMENT PIPELINE ---');

    // Find the farmer
    const farmer = await User.findOne({ email: 'nandeeswarreddy2852@gmail.com' });
    if (!farmer) throw new Error('Farmer not found');
    const farmerToken = generateToken({ id: farmer._id.toString(), role: farmer.role });

    // Find the shop owner
    const shopOwner = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });
    if (!shopOwner) throw new Error('Shop owner not found');
    console.log('Shop Owner Record:', {
      id: shopOwner._id,
      name: shopOwner.name,
      shopName: shopOwner.shopName,
      upiId: shopOwner.upiId,
      phone: shopOwner.phone,
    });

    // Find or create an order for this farmer from this shop owner
    let order = await Order.findOne({ farmer: farmer._id, paymentStatus: 'PENDING' });
    if (!order) {
      const prod = await Product.findOne({ shopOwner: shopOwner._id });
      if (!prod) throw new Error('No product found for shop');
      order = await Order.create({
        orderNumber: `AGM-UPI-TEST-${Date.now().toString().slice(-4)}`,
        farmer: farmer._id,
        items: [
          {
            product: prod._id,
            shopOwner: shopOwner._id,
            productNameSnapshot: prod.name,
            price: prod.price,
            quantity: 1,
            unit: prod.unit,
            subtotal: prod.price,
          },
        ],
        totalAmount: prod.price,
        deliveryAddress: { street: 'Main St', city: 'Guntur', state: 'AP', pincode: '522002' },
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });
    }

    console.log('\nTesting GET /api/orders/' + order._id + ' as Farmer...');

    const resBody = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path: `/api/orders/${order._id}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${farmerToken}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }
      );
      req.on('error', reject);
      req.end();
    });

    console.log('Response Success:', resBody.success);
    console.log('Order Items:', JSON.stringify(resBody.order?.items, null, 2));

    const firstItem = resBody.order?.items?.[0];
    const shop = typeof firstItem?.shopOwner === 'object' ? firstItem.shopOwner : null;
    console.log('\nExtracted Shop Data in Frontend Simulation:');
    console.log('shop:', shop);
    console.log('shop?.upiId:', shop?.upiId);
    console.log('shop?.shopName:', shop?.shopName);
    console.log('shop?.name:', shop?.name);
    console.log('totalAmount:', resBody.order?.totalAmount);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
}

testUpiQrPipeline();
