import dotenv from 'dotenv';
dotenv.config();
import { connectDB, disconnectDB } from '../config/db';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';

const REAL_CATALOG_PRODUCTS = [
  // 1. Seeds (3 products)
  {
    name: 'Kaveri ATM Cotton Hybrid Seed',
    brand: 'Kaveri Seeds',
    category: 'Seeds',
    description: 'Hybrid cotton seed developed for Indian cotton-growing conditions. Suitable selection should depend on local agronomic recommendations and crop conditions.',
    price: 850,
    unit: 'packet',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Kaveri Drona Maize Hybrid Seed',
    brand: 'Kaveri Seeds',
    category: 'Seeds',
    description: "Kaveri maize hybrid seed intended for commercial maize cultivation. Farmers should follow the manufacturer's cultivation and agronomic recommendations.",
    price: 1250,
    unit: 'packet',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Kaveri KPH-473 Rice Seed',
    brand: 'Kaveri Seeds',
    category: 'Seeds',
    description: 'High-yielding hybrid paddy seed suited for irrigated wetland and transitional field conditions with robust grain structure.',
    price: 1650,
    unit: 'bag',
    stock: 30,
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 2. Fertilizers (3 products)
  {
    name: 'IFFCO Neem Coated Urea',
    brand: 'IFFCO',
    category: 'Fertilizers',
    description: 'High-efficiency neem coated nitrogenous fertilizer providing sustained nitrogen release for extensive crop canopy development.',
    price: 300,
    unit: 'bag (45 kg)',
    stock: 100,
    images: ['https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO NPK 10:26:26',
    brand: 'IFFCO',
    category: 'Fertilizers',
    description: 'Complex fertilizer containing balanced primary plant nutrients ideal for basal application and root proliferation across commercial crops.',
    price: 1550,
    unit: 'bag (50 kg)',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO Water Soluble Fertilizer',
    brand: 'IFFCO',
    category: 'Fertilizers',
    description: '100% water-soluble foliar grade fertilizer blend ensuring rapid nutrient absorption and direct correction of deficiency during peak vegetative stages.',
    price: 2200,
    unit: 'bag (25 kg)',
    stock: 25,
    images: ['https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 3. Bio-Fertilizers (3 products)
  {
    name: 'IFFCO Rhizobium Biofertilizer',
    brand: 'IFFCO',
    category: 'Bio-Fertilizers',
    description: 'Specialized bacterial inoculant that enhances atmospheric nitrogen fixation in symbiotic association with legume root systems.',
    price: 180,
    unit: 'bottle (500 ml)',
    stock: 75,
    images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO Potassium Mobilizing Biofertilizer',
    brand: 'IFFCO',
    category: 'Bio-Fertilizers',
    description: 'Biological inoculant containing potassium mobilizing bacteria (Frateuria aurantia) to solubilize insoluble potassium in the soil.',
    price: 280,
    unit: 'bottle (500 ml)',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO NPK Liquid Consortia',
    brand: 'IFFCO',
    category: 'Bio-Fertilizers',
    description: 'High potency multi-strain biofertilizer consortium providing balanced biological nitrogen fixation, phosphate solubilization, and potassium mobilization.',
    price: 450,
    unit: 'bottle (1 litre)',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 4. Soil Conditioners (3 products)
  {
    name: 'Agricultural Gypsum',
    brand: 'National Fertilizers',
    category: 'Soil Conditioners',
    description: 'Natural calcium sulfate soil amendment specifically designed to remediate sodic soils, improve water infiltration, and replenish exchangeable calcium and sulfur.',
    price: 350,
    unit: 'bag (50 kg)',
    stock: 80,
    images: ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Humic Acid Soil Conditioner',
    brand: 'AgroCare',
    category: 'Soil Conditioners',
    description: 'Premium humic and fulvic acid concentrate that revitalizes soil microbial flora, increases cation exchange capacity, and enhances root growth.',
    price: 650,
    unit: 'bottle (1 litre)',
    stock: 45,
    images: ['https://images.unsplash.com/photo-1592417817098-8f3d69102a5c?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Sagarika Granular Soil Conditioner',
    brand: 'IFFCO Sagarika',
    category: 'Soil Conditioners',
    description: 'Seaweed-fortified granular soil amendment enriching soil with organic carbon, micronutrients, and plant growth promoting substances.',
    price: 950,
    unit: 'bucket (10 kg)',
    stock: 35,
    images: ['https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 5. Growth Promoters (3 products)
  {
    name: 'Sagarika Liquid',
    brand: 'IFFCO Sagarika',
    category: 'Growth Promoters',
    description: 'Concentrated seaweed extract derived from red and brown algae, acting as a metabolic bio-activator to enhance flowering and fruit retention.',
    price: 350,
    unit: 'bottle (500 ml)',
    stock: 70,
    images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Sagarika Z++ Granular',
    brand: 'IFFCO Sagarika',
    category: 'Growth Promoters',
    description: 'Fortified seaweed-based plant biostimulant granular formulation enriched with amino acids, betaines, and trace minerals for robust crop vigor.',
    price: 750,
    unit: 'bag (8 kg)',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Sagarika Premium Agricultural Biostimulant',
    brand: 'IFFCO Sagarika',
    category: 'Growth Promoters',
    description: 'Advanced biostimulant formulation engineered to boost chlorophyll synthesis, abiotic stress tolerance, and overall crop productivity.',
    price: 1200,
    unit: 'pack (2 litre)',
    stock: 30,
    images: ['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 6. Pesticides (3 products)
  {
    name: 'UPL CAPTAN 50',
    brand: 'UPL',
    category: 'Pesticides',
    description: 'Broad-spectrum contact protective fungicide and pesticide for control of scab, rot, and foliar diseases across horticulture crops.',
    price: 450,
    unit: 'pack (500 g)',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Saaf',
    brand: 'UPL',
    category: 'Pesticides',
    description: 'Proven synergistic combination fungicide/pesticide (Carbendazim 12% + Mancozeb 63% WP) offering both systemic and contact protection against anthracnose, blast, and leaf spot.',
    price: 650,
    unit: 'pack (1 kg)',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Tridium',
    brand: 'UPL',
    category: 'Pesticides',
    description: 'High-performance three-way systemic and protectant fungicide/pesticide formulated to deliver exceptional broad-spectrum resistance management.',
    price: 1100,
    unit: 'pack (1 kg)',
    stock: 30,
    images: ['https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 7. Insecticides (3 products)
  {
    name: 'UPL Inizio',
    brand: 'UPL',
    category: 'Insecticides',
    description: 'Targeted broad-spectrum insecticide providing quick knockdown and persistent control against sucking pests, aphids, and thrips.',
    price: 550,
    unit: 'bottle (250 ml)',
    stock: 45,
    images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Start Up Reno',
    brand: 'UPL',
    category: 'Insecticides',
    description: 'Advanced contact and stomach action insecticide formulation effective against lepidopteran caterpillars, borers, and foliage feeders.',
    price: 850,
    unit: 'bottle (500 ml)',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'Bayer Trance',
    brand: 'Bayer',
    category: 'Insecticides',
    description: 'High-potency systemic insecticide engineered for rapid translocation and translaminar protection against stubborn resistant pest complexes.',
    price: 1450,
    unit: 'bottle (1 litre)',
    stock: 25,
    images: ['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 8. Fungicides (3 products)
  {
    name: 'UPL Mancozeb Uthane M 45',
    brand: 'UPL',
    category: 'Fungicides',
    description: 'Trusted contact dithiocarbamate fungicide with multi-site action providing broad preventive disease control on fruits, vegetables, and field crops.',
    price: 400,
    unit: 'pack (500 g)',
    stock: 65,
    images: ['https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Saaf Fungicide',
    brand: 'UPL',
    category: 'Fungicides',
    description: 'Systemic and contact fungicide (Carbendazim 12% + Mancozeb 63% WP) for root rot, seed treatment, and foliar disease prevention.',
    price: 650,
    unit: 'pack (1 kg)',
    stock: 55,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Tridium Fungicide',
    brand: 'UPL',
    category: 'Fungicides',
    description: 'Premium triple action fungicide combining systemic mobility and protective shield against early and late blights.',
    price: 1100,
    unit: 'pack (1 kg)',
    stock: 35,
    images: ['https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 9. Herbicides (3 products)
  {
    name: 'UPL Sweep (Glyphosate 41% SL)',
    brand: 'UPL',
    category: 'Herbicides',
    description: 'Non-selective systemic post-emergence herbicide for effective management of annual and perennial grasses and broadleaf weeds in non-cropped and plantation areas.',
    price: 450,
    unit: 'bottle (1 litre)',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Iris (Fomesafen 11.1% + Quizalofop 5.5% EC)',
    brand: 'UPL',
    category: 'Herbicides',
    description: 'Advanced selective post-emergence herbicide formulation delivering comprehensive control over broadleaf weeds and grassy weeds in soybean and groundnut crops.',
    price: 850,
    unit: 'bottle (1 litre)',
    stock: 35,
    images: ['https://images.unsplash.com/photo-1592417817098-8f3d69102a5c?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'UPL Dost (Pendimethalin 30% EC)',
    brand: 'UPL',
    category: 'Herbicides',
    description: 'Broad-spectrum pre-emergence selective herbicide that inhibits cell division and cell elongation, preventing emergence of troublesome annual grasses and broadleaves.',
    price: 550,
    unit: 'bottle (1 litre)',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },

  // 10. Bio Products (3 products)
  {
    name: 'IFFCO Sagarika Liquid',
    brand: 'IFFCO Sagarika',
    category: 'Bio Products',
    description: '100% natural organic seaweed biostimulant formulated to enhance soil health, vegetative growth, and harvest quality naturally without synthetic chemicals.',
    price: 350,
    unit: 'bottle (500 ml)',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO Sagarika Granular',
    brand: 'IFFCO Sagarika',
    category: 'Bio Products',
    description: 'Certified organic seaweed granule formulation enriched with naturally occurring plant hormones, carbohydrates, and minerals.',
    price: 750,
    unit: 'bag (8 kg)',
    stock: 45,
    images: ['https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
  {
    name: 'IFFCO Rhizobium',
    brand: 'IFFCO',
    category: 'Bio Products',
    description: 'Eco-friendly bio-inoculant containing nitrogen-fixing bacteria to improve soil biology and reduce reliance on synthetic fertilizers.',
    price: 180,
    unit: 'bottle (500 ml)',
    stock: 55,
    images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80'],
    location: {
      street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      pincode: '515001',
    },
    isActive: true,
  },
];

async function seedRealProducts() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // Find the Admin user to own these products
    let owner = await User.findOne({ role: 'ADMIN' });
    if (!owner) {
      owner = await User.findOne({});
    }

    if (!owner) {
      console.error('Error: No user account found in database to assign as product owner.');
      process.exit(1);
    }

    console.log(`Using owner: ${owner.name} (${owner.role}) ID: ${owner._id}`);

    // Clean existing products to ensure clean seed
    const deleteResult = await Product.deleteMany({});
    console.log(`Cleared existing products count: ${deleteResult.deletedCount}`);

    // Insert 30 real catalog products with owner
    const productsToInsert = REAL_CATALOG_PRODUCTS.map((p) => ({
      ...p,
      shopOwner: owner._id,
    }));

    const inserted = await Product.insertMany(productsToInsert);
    console.log(`✅ Successfully seeded ${inserted.length} real agricultural products across 10 categories!`);

    // Verify category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const prod of inserted) {
      categoryCounts[prod.category] = (categoryCounts[prod.category] || 0) + 1;
    }

    console.log('\n📊 Category Breakdown:');
    for (const [cat, cnt] of Object.entries(categoryCounts)) {
      console.log(`  • ${cat}: ${cnt} products`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding products:', err);
    process.exit(1);
  }
}

seedRealProducts();
