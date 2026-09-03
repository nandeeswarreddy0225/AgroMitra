import axios from 'axios';

async function main() {
  try {
    const res = await axios.get('http://localhost:5000/api/products');
    console.log('PRODUCTS COUNT:', res.data.products.length);
    for (const p of res.data.products) {
      console.log(`- [${p.id || p._id}] "${p.name}" | Category: "${p.category}" | Brand: "${p.brand}" | Price: ₹${p.price}`);
    }
  } catch (err: any) {
    console.error('Error querying products:', err.message);
  }
}

main();
