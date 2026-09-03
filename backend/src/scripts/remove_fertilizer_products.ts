import axios from 'axios';

async function main() {
  try {
    const res = await axios.get('http://localhost:5000/api/products');
    const products = res.data.products || [];
    console.log(`Checking ${products.length} products...`);

    const fertilizerKeywords = ['fertilizer', 'urea', 'dap', 'potash', 'npk', 'bio fertilizer'];
    const fertilizerCategories = ['fertilizers', 'organic fertilizers', 'bio fertilizers'];

    const fertilizerProducts = products.filter((p: any) => {
      const catLower = (p.category || '').toLowerCase();
      const nameLower = (p.name || '').toLowerCase();
      const descLower = (p.description || '').toLowerCase();

      return (
        fertilizerCategories.includes(catLower) ||
        fertilizerKeywords.some((kw) => nameLower.includes(kw) || catLower.includes(kw))
      );
    });

    console.log(`Found ${fertilizerProducts.length} fertilizer products to remove.`);

    for (const fp of fertilizerProducts) {
      const prodId = fp.id || fp._id;
      const shopEmail = fp.shopOwner?.email;
      
      let token = '';
      for (const pass of ['Password123!', 'Password123', 'Secret123!']) {
        try {
          const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: shopEmail,
            password: pass,
          });
          if (loginRes.data.token) {
            token = loginRes.data.token;
            break;
          }
        } catch {
          // try next password
        }
      }

      if (token) {
        try {
          await axios.delete(`http://localhost:5000/api/products/${prodId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(`✅ Deleted fertilizer product [${prodId}]: "${fp.name}"`);
        } catch (delErr: any) {
          console.error(`Failed to delete [${prodId}]:`, delErr.response?.data?.message || delErr.message);
        }
      } else {
        console.warn(`Could not log in as owner for product ${prodId} (${shopEmail})`);
      }
    }

    // Verify remaining products
    const verifyRes = await axios.get('http://localhost:5000/api/products');
    console.log(`\n========================================`);
    console.log(`Remaining products in marketplace: ${verifyRes.data.products.length}`);
    for (const p of verifyRes.data.products) {
      console.log(`- [${p.id || p._id}] "${p.name}" | Category: "${p.category}"`);
    }
    console.log(`========================================`);
  } catch (err: any) {
    console.error('Error during cleanup:', err.response?.data || err.message);
  }
}

main();
