export type CropSeason = 'KHARIF' | 'RABI' | 'ZAID';
export type WaterRequirement = 'Low' | 'Medium' | 'High';

export const VALID_SOIL_TYPES = [
  'Red Soil',
  'Black Soil',
  'Alluvial Soil',
  'Sandy Soil',
  'Clay Soil',
  'Loamy Soil',
  'Laterite Soil',
  'Silty Soil',
  'Other / Not Sure',
] as const;

export type SoilType = typeof VALID_SOIL_TYPES[number];

export interface SeasonalCropItem {
  id: string;
  name: string;
  scientificName?: string;
  icon: string;
  category: string;
  season: CropSeason;
  sowingPeriod: string;
  harvestPeriod: string;
  durationMonths: string;
  waterRequirement: WaterRequirement;
  soilTypes: string[];
  suitableStates: string[];
  advantages: string[];
  thingsToConsider: string[];
  agronomicTip: string;
  stages: {
    beforePlanting: string;
    duringPlanting: string;
    duringGrowth: string;
    beforeHarvest: string;
  };
}

export const SEASONAL_CROPS_DATA: SeasonalCropItem[] = [
  // --- KHARIF CROPS (Monsoon: June – October) ---
  {
    id: 'paddy-rice',
    name: 'Paddy (Rice)',
    scientificName: 'Oryza sativa',
    icon: '🌾',
    category: 'Cereals',
    season: 'KHARIF',
    sowingPeriod: 'June – July',
    harvestPeriod: 'November – December',
    durationMonths: '3.5 – 4.5 months (110–140 days)',
    waterRequirement: 'High',
    soilTypes: ['Clay Soil', 'Clayey Loam', 'Alluvial Soil', 'Black Soil', 'Silty Soil'],
    suitableStates: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Punjab', 'West Bengal', 'All India'],
    advantages: [
      'High staple market demand & assured government MSP procurement',
      'Thrives in heavy moisture-retentive soils during monsoon rains',
      'Standardized cultivation packages & mechanical transplanting available',
    ],
    thingsToConsider: [
      'Requires assured water supply or heavy seasonal rainfall',
      'Susceptible to blast and stem borer under excessive nitrogen application',
    ],
    agronomicTip: 'Maintain 2–3 cm standing water during tillering stage; avoid standing water at grain ripening.',
    stages: {
      beforePlanting: 'Puddle the field well, level thoroughly, and test seed germination rate (>85%).',
      duringPlanting: 'Transplant 20–25 day old seedlings with 20x10 cm or 15x15 cm spacing.',
      duringGrowth: 'Apply split nitrogen doses at active tillering and panicle initiation. Scout for stem borer and blast.',
      beforeHarvest: 'Drain field water 10–12 days before harvest when 80% grains turn golden yellow.',
    },
  },
  {
    id: 'ragi-finger-millet',
    name: 'Ragi (Finger Millet)',
    scientificName: 'Eleusine coracana',
    icon: '🥣',
    category: 'Millets',
    season: 'KHARIF',
    sowingPeriod: 'June – August',
    harvestPeriod: 'October – December',
    durationMonths: '3 – 3.5 months (95–115 days)',
    waterRequirement: 'Low',
    soilTypes: ['Red Soil', 'Red Loam', 'Sandy Soil', 'Sandy Loam', 'Laterite Soil', 'Loamy Soil'],
    suitableStates: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'Maharashtra', 'All India'],
    advantages: [
      'Exceptional drought tolerance and low input/fertilizer cost',
      'Growing health food & superfood market with premium prices',
      'Ideal for red and shallow soils with erratic rainfall',
    ],
    thingsToConsider: [
      'Fine seeds require shallow sowing (2–3 cm) to prevent poor emergence',
      'Scout for blast disease in humid micro-climates',
    ],
    agronomicTip: 'Highly drought-tolerant and rich in calcium; thrives with moderate rainfall and minimal chemical fertilizers.',
    stages: {
      beforePlanting: 'Plough 2–3 times to fine tilth and incorporate farmyard manure (5 tonnes/acre).',
      duringPlanting: 'Sow at 22.5–30 cm row spacing with seed depth of 2–3 cm; avoid deep sowing.',
      duringGrowth: 'Perform first weeding at 20–25 days; thin out excess seedlings for uniform density.',
      beforeHarvest: 'Harvest earheads when ear grains turn brown and hard; dry to 10–12% moisture.',
    },
  },
  {
    id: 'maize-corn',
    name: 'Maize (Hybrid Corn)',
    scientificName: 'Zea mays',
    icon: '🌽',
    category: 'Cereals',
    season: 'KHARIF',
    sowingPeriod: 'June – July',
    harvestPeriod: 'September – October',
    durationMonths: '3 – 3.5 months (90–110 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Loamy Soil', 'Red Soil', 'Alluvial Soil', 'Black Soil', 'Sandy Loam'],
    suitableStates: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Bihar', 'Rajasthan', 'All India'],
    advantages: [
      'High biomass yield and strong feed/starch industry demand',
      'Adaptable to varied soil textures with good internal drainage',
      'Short duration allows multi-cropping rotations',
    ],
    thingsToConsider: [
      'Cannot tolerate water stagnation for more than 24 hours',
      'Requires vigilant monitoring for Fall Armyworm (FAW)',
    ],
    agronomicTip: 'Ensure excellent field drainage; maize is sensitive to waterlogging during early seedling stages.',
    stages: {
      beforePlanting: 'Deep plough and make ridges & furrows at 60 cm spacing for efficient moisture control.',
      duringPlanting: 'Dibble 1 seed per hill at 60x20 cm spacing at 3–4 cm depth.',
      duringGrowth: 'Critical irrigation periods: tasseling and silking stages. Monitor fall armyworm regularly.',
      beforeHarvest: 'Harvest when husk leaves turn dry & papery and a black layer forms at the grain base.',
    },
  },
  {
    id: 'cotton-kapas',
    name: 'Cotton (Kapas / Bt Cotton)',
    scientificName: 'Gossypium hirsutum',
    icon: '☁️',
    category: 'Fiber Crops',
    season: 'KHARIF',
    sowingPeriod: 'May – July',
    harvestPeriod: 'November – February',
    durationMonths: '5 – 6 months (150–180 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Black Soil', 'Clayey Loam', 'Deep Black Soil', 'Alluvial Soil', 'Loamy Soil'],
    suitableStates: ['Karnataka', 'Maharashtra', 'Gujarat', 'Telangana', 'Andhra Pradesh', 'All India'],
    advantages: [
      'High commercial value and direct cash crop returns',
      'Deep taproot taps subsoil moisture in deep black soils',
      'Well-developed market with spinning mills and APMC mandis',
    ],
    thingsToConsider: [
      'Longer duration crop requiring continuous insect pest scouting',
      'Excess moisture during boll bursting can discolour fiber quality',
    ],
    agronomicTip: 'Deep taproot system requires well-aerated black soils. Avoid excess nitrogen which causes vegetative lodging.',
    stages: {
      beforePlanting: 'Deep summer ploughing to eradicate perennial weeds and expose pest pupae.',
      duringPlanting: 'Maintain 90x60 cm or 120x45 cm spacing depending on soil fertility and hybrid vigor.',
      duringGrowth: 'Install yellow & blue sticky traps for sucking pests (whitefly, thrips, jassids). Interculture at 30 & 60 DAS.',
      beforeHarvest: 'Pick clean, fully burst bolls in morning hours after dew evaporates; keep free from dry leaf trash.',
    },
  },
  {
    id: 'groundnut-peanut',
    name: 'Groundnut (Peanut)',
    scientificName: 'Arachis hypogaea',
    icon: '🥜',
    category: 'Oilseeds',
    season: 'KHARIF',
    sowingPeriod: 'June – July',
    harvestPeriod: 'October – November',
    durationMonths: '3.5 – 4 months (105–125 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Red Soil', 'Sandy Soil', 'Sandy Loam', 'Loamy Soil', 'Red Sandy Soil'],
    suitableStates: ['Andhra Pradesh', 'Karnataka', 'Gujarat', 'Tamil Nadu', 'Maharashtra', 'All India'],
    advantages: [
      'Fixes atmospheric nitrogen, improving subsequent crop yields',
      'High market demand for oil extraction and direct confectionery use',
      'Excellent performance in light red and sandy soils',
    ],
    thingsToConsider: [
      'Avoid heavy clay soils where peg penetration and digging are difficult',
      'Apply gypsum at pegging for full kernel filling and shell hardness',
    ],
    agronomicTip: 'Loose, friable soil is essential for smooth peg entry and healthy pod development. Apply Gypsum at 45 DAS.',
    stages: {
      beforePlanting: 'Treat kernels with Trichoderma viride or Rhizobium bio-inoculant before sowing.',
      duringPlanting: 'Sow at 30x10 cm spacing at 4–5 cm depth in moist soil.',
      duringGrowth: 'Apply gypsum (200 kg/acre) around pegging zone at 40–45 days after sowing for shell hardening.',
      beforeHarvest: 'Check 5–10 random pods; harvest when inner pod shell shows dark black/brown netting.',
    },
  },
  {
    id: 'soybean',
    name: 'Soybean',
    scientificName: 'Glycine max',
    icon: '🌱',
    category: 'Pulses & Oilseeds',
    season: 'KHARIF',
    sowingPeriod: 'June – July',
    harvestPeriod: 'September – October',
    durationMonths: '3 – 3.5 months (90–105 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Black Soil', 'Clay Soil', 'Clay Loam', 'Alluvial Soil', 'Loamy Soil'],
    suitableStates: ['Madhya Pradesh', 'Maharashtra', 'Karnataka', 'Rajasthan', 'Telangana', 'All India'],
    advantages: [
      'Short duration enabling early Rabi wheat or chickpea sowing',
      'Enriches soil nitrogen naturally through active root nodulation',
      'High industrial demand for edible oil and soy-meal export',
    ],
    thingsToConsider: [
      'Maintain seed viability with gentle handling and cool storage',
      'Avoid sowing in crusted or waterlogged soils',
    ],
    agronomicTip: 'High protein legume that enriches soil nitrogen. Avoid sowing if soil temperature is too low or waterlogged.',
    stages: {
      beforePlanting: 'Test seed germination; inoculate with Bradyrhizobium japonicum culture.',
      duringPlanting: 'Sow at 45x5 cm spacing using seed drill at 3–4 cm depth.',
      duringGrowth: 'Critical moisture stages: flowering and pod elongation. Scout for girdle beetle and pod borer.',
      beforeHarvest: 'Harvest when 90% leaves drop off and pods make a rattling sound when shaken.',
    },
  },
  {
    id: 'red-gram-tur',
    name: 'Red Gram (Pigeon Pea / Tur)',
    scientificName: 'Cajanus cajan',
    icon: '🥣',
    category: 'Pulses',
    season: 'KHARIF',
    sowingPeriod: 'June – July',
    harvestPeriod: 'December – January',
    durationMonths: '5 – 6 months (140–180 days)',
    waterRequirement: 'Low',
    soilTypes: ['Red Soil', 'Loamy Soil', 'Black Soil', 'Red Sandy Loam', 'Laterite Soil'],
    suitableStates: ['Karnataka', 'Maharashtra', 'Andhra Pradesh', 'Telangana', 'Madhya Pradesh', 'All India'],
    advantages: [
      'Excellent drought resistance with deep root system',
      'Ideal for intercropping with Soybean, Groundnut, or Maize',
      'High protein pulse commanding strong market prices',
    ],
    thingsToConsider: [
      'Long crop duration; monitor for pod borer (Helicoverpa) at flowering',
      'Nip top shoots at 45–50 days to promote lateral branches',
    ],
    agronomicTip: 'Excellent intercrop with Maize, Groundnut, or Soybean. Highly drought tolerant due to deep root system.',
    stages: {
      beforePlanting: 'Deep plough and apply phosphorus-rich fertilizer/DAP to support early nodulation.',
      duringPlanting: 'Sow at 90x20 cm spacing (sole crop) or as 1:4 / 1:6 intercrop with soybean or groundnut.',
      duringGrowth: 'Nip terminal shoots at 45–50 days to promote branching and increase pod count.',
      beforeHarvest: 'Harvest when 75–80% pods turn brown and dry; thresh and clean thoroughly.',
    },
  },
  {
    id: 'chilli-peppers',
    name: 'Chilli (Hot Pepper / Mirchi)',
    scientificName: 'Capsicum annuum',
    icon: '🌶️',
    category: 'Spices / Commercial',
    season: 'KHARIF',
    sowingPeriod: 'June – August',
    harvestPeriod: 'October – February',
    durationMonths: '4 – 5.5 months (120–160 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Black Soil', 'Loamy Soil', 'Red Soil', 'Sandy Loam', 'Alluvial Soil'],
    suitableStates: ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Maharashtra', 'Madhya Pradesh', 'All India'],
    advantages: [
      'High income per acre for premium dried red and green chillies',
      'Continuous harvesting over multiple flushes',
      'Active commercial spice trade across Guntur, Byadgi, and Khammam',
    ],
    thingsToConsider: [
      'Requires intensive protection against sucking pests (thrips & mites)',
      'Needs good soil drainage to prevent wilt and root rot',
    ],
    agronomicTip: 'Susceptible to leaf curl virus and thrips/mites. Use blue/yellow sticky traps and reflective mulch.',
    stages: {
      beforePlanting: 'Raise vigorous nursery seedlings; treat nursery beds with bio-fungicide to prevent damping-off.',
      duringPlanting: 'Transplant 35-day seedlings on ridges at 60x45 cm spacing during evening hours.',
      duringGrowth: 'Apply micronutrient sprays (Boron & Zinc) during flowering to prevent flower drop.',
      beforeHarvest: 'Harvest mature red ripe pods in multiple pickings; shade-dry on clean tarpaulins.',
    },
  },

  // --- RABI CROPS (Winter: October – March/April) ---
  {
    id: 'wheat',
    name: 'Wheat',
    scientificName: 'Triticum aestivum',
    icon: '🌾',
    category: 'Cereals',
    season: 'RABI',
    sowingPeriod: 'October – November',
    harvestPeriod: 'March – April',
    durationMonths: '3.5 – 4.5 months (110–135 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Alluvial Soil', 'Loamy Soil', 'Clayey Loam', 'Black Soil', 'Silty Soil'],
    suitableStates: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Karnataka', 'All India'],
    advantages: [
      'Principal winter staple crop with guaranteed procurement',
      'High response to balanced NPK fertilisation and timely irrigation',
      'Mechanised harvesting and post-harvest handling widely accessible',
    ],
    thingsToConsider: [
      'Requires cool temperatures during tillering and grain filling',
      'Terminal heat stress can reduce grain weight if sown late',
    ],
    agronomicTip: 'First irrigation at Crown Root Initiation (CRI) stage (20–25 DAS) is critical for high tiller count.',
    stages: {
      beforePlanting: 'Prepare clean, weed-free seedbed with fine tilth and apply balanced basal NPK.',
      duringPlanting: 'Sow at 20–22.5 cm row spacing at 4–5 cm depth using seed-cum-fertilizer drill.',
      duringGrowth: 'Critical irrigation stages: CRI (21 DAS), Tillering (40 DAS), Jointing (60 DAS), Flowering (85 DAS).',
      beforeHarvest: 'Harvest when grains are hard and moisture content drops below 14% to prevent storage spoilage.',
    },
  },
  {
    id: 'chickpea-gram',
    name: 'Chickpea (Bengal Gram / Chana)',
    scientificName: 'Cicer arietinum',
    icon: '🫘',
    category: 'Pulses',
    season: 'RABI',
    sowingPeriod: 'October – November',
    harvestPeriod: 'February – March',
    durationMonths: '3 – 3.5 months (95–115 days)',
    waterRequirement: 'Low',
    soilTypes: ['Black Soil', 'Clayey Loam', 'Loamy Soil', 'Alluvial Soil', 'Red Soil'],
    suitableStates: ['Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Andhra Pradesh', 'Rajasthan', 'All India'],
    advantages: [
      'Excellent performance on residual soil moisture after Kharif rains',
      'Low irrigation requirements; enriches soil fertility',
      'Consistent demand and good storage stability',
    ],
    thingsToConsider: [
      'Excessive irrigation can cause vegetative overgrowth and collar rot',
      'Scout for pod borer during pod formation',
    ],
    agronomicTip: 'Requires residual soil moisture; excessive irrigation causes wilt and excessive vegetative growth at the expense of pods.',
    stages: {
      beforePlanting: 'Treat seeds with Trichoderma viride and Rhizobium culture for wilt prevention.',
      duringPlanting: 'Sow at 30x10 cm spacing at 5–8 cm depth into moist soil zone.',
      duringGrowth: 'Nip apical shoots at 30–35 days to encourage bushy lateral branching and more flowers.',
      beforeHarvest: 'Harvest when leaves turn yellow and drop and pods turn straw-colored and dry.',
    },
  },
  {
    id: 'mustard-sarson',
    name: 'Mustard (Sarson / Rapeseed)',
    scientificName: 'Brassica juncea',
    icon: '🌼',
    category: 'Oilseeds',
    season: 'RABI',
    sowingPeriod: 'October – November',
    harvestPeriod: 'February – March',
    durationMonths: '3.5 – 4 months (105–125 days)',
    waterRequirement: 'Low',
    soilTypes: ['Loamy Soil', 'Alluvial Soil', 'Sandy Loam', 'Silty Soil', 'Sandy Soil'],
    suitableStates: ['Rajasthan', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'West Bengal', 'All India'],
    advantages: [
      'High oil content with strong industrial and domestic oil demand',
      'Requires only 2–3 light irrigations throughout growth',
      'Suitable for light to medium loamy soils',
    ],
    thingsToConsider: [
      'Cloudy and humid weather during flowering promotes aphid infestation',
      'Harvest timely in morning hours to prevent pod shattering',
    ],
    agronomicTip: 'Cool and dry climate during pod filling enhances oil percentage. Apply Sulphur (20 kg/acre) as basal dose.',
    stages: {
      beforePlanting: 'Plough to fine seedbed; ensure conserved moisture from receding monsoon.',
      duringPlanting: 'Sow at 30x10 cm spacing at 2–3 cm depth; thin out dense seedlings at 15–20 DAS.',
      duringGrowth: 'Monitor aphid populations during flowering/cloudy weather; install yellow sticky traps.',
      beforeHarvest: 'Harvest early in the morning when 75% siliquae turn golden yellow to avoid pod shattering.',
    },
  },

  // --- ZAID CROPS (Summer: March – June) ---
  {
    id: 'watermelon-tarbooj',
    name: 'Watermelon (Tarbooj)',
    scientificName: 'Citrullus lanatus',
    icon: '🍉',
    category: 'Cucurbits / Fruits',
    season: 'ZAID',
    sowingPeriod: 'February – March',
    harvestPeriod: 'May – June',
    durationMonths: '2.5 – 3 months (75–90 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Sandy Soil', 'Sandy Loam', 'Loamy Soil', 'Alluvial Soil', 'Red Soil'],
    suitableStates: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Uttar Pradesh', 'All India'],
    advantages: [
      'High summer market demand and fast cash turnover in 75–85 days',
      'Excellent performance under drip irrigation and plastic mulch',
      'Thrives in warm, dry weather with abundant sunshine',
    ],
    thingsToConsider: [
      'Avoid heavy waterlogging or overhead sprinkler watering',
      'Monitor fruit flies and powdery mildew during humid spells',
    ],
    agronomicTip: 'Warm, dry weather with abundant sunshine produces sweetest fruits with high TSS sugar content. Use drip fertigation.',
    stages: {
      beforePlanting: 'Make broad beds with silver-black mulch sheet and drip lines for water economy.',
      duringPlanting: 'Sow 2 seeds per hill at 1.5–2.0 m row spacing and 45–60 cm plant spacing.',
      duringGrowth: 'Maintain regular drip irrigation; avoid overhead watering to prevent powdery mildew.',
      beforeHarvest: 'Check ground spot (turns creamy yellow) and metallic thumping sound for peak sweetness.',
    },
  },
  {
    id: 'cucumber-kheera',
    name: 'Cucumber (Kheera)',
    scientificName: 'Cucumis sativus',
    icon: '🥒',
    category: 'Vegetables',
    season: 'ZAID',
    sowingPeriod: 'February – April',
    harvestPeriod: 'April – June',
    durationMonths: '2 – 2.5 months (60–75 days)',
    waterRequirement: 'Medium',
    soilTypes: ['Loamy Soil', 'Sandy Loam', 'Alluvial Soil', 'Red Soil'],
    suitableStates: ['Karnataka', 'Andhra Pradesh', 'Maharashtra', 'Haryana', 'All India'],
    advantages: [
      'Rapid growth with first picking starting in 45–50 days',
      'Continuous daily harvesting brings steady cash flow for farmers',
      'High summer consumption across urban markets',
    ],
    thingsToConsider: [
      'Trellis/staking gives higher percentage of straight, unblemished fruit',
      'Requires frequent light watering during hot dry afternoons',
    ],
    agronomicTip: 'Fast-growing summer crop. Staking or trellis support improves fruit straightness, yield, and pest resistance.',
    stages: {
      beforePlanting: 'Prepare raised beds rich in decomposed compost (10 tonnes/acre).',
      duringPlanting: 'Sow at 1.5 m row spacing and 45 cm plant spacing at 1.5–2 cm depth.',
      duringGrowth: 'Irrigate every 3–4 days during peak summer; pinch side branches up to 5th node.',
      beforeHarvest: 'Harvest tender green fruits every alternate day before seeds harden.',
    },
  },
  {
    id: 'green-gram-moong',
    name: 'Green Gram (Moong / Mungbean)',
    scientificName: 'Vigna radiata',
    icon: '🥣',
    category: 'Pulses',
    season: 'ZAID',
    sowingPeriod: 'March – April',
    harvestPeriod: 'May – June',
    durationMonths: '2 – 2.5 months (60–70 days)',
    waterRequirement: 'Low',
    soilTypes: ['Loamy Soil', 'Sandy Loam', 'Alluvial Soil', 'Black Soil', 'Red Soil'],
    suitableStates: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Madhya Pradesh', 'Punjab', 'All India'],
    advantages: [
      'Ultra short duration (60–65 days) catch crop between seasons',
      'Adds valuable nitrogen and organic matter for next Kharif crop',
      'Low water and fertilizer requirement',
    ],
    thingsToConsider: [
      'Yellow Mosaic Virus (YMV) resistant varieties recommended',
      'Harvest when pods mature to prevent field shattering in summer heat',
    ],
    agronomicTip: 'Short-duration summer catch crop that restores soil nitrogen before next Kharif season.',
    stages: {
      beforePlanting: 'Treat seeds with Rhizobium and PSB biofertilizers; ensure pre-sowing irrigation.',
      duringPlanting: 'Sow at 25x10 cm spacing using seed drill at 3–4 cm depth.',
      duringGrowth: 'Irrigate at 20–25 DAS and during pod development; avoid irrigation during peak flowering.',
      beforeHarvest: 'Harvest when 80% pods turn dark brown/black; pick in morning to prevent pod shattering.',
    },
  },
];
