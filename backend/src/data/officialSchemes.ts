export interface OfficialSchemeData {
  name: string;
  code: string;
  governmentType: 'State' | 'Central';
  ministry: string;
  category:
    | 'Financial Assistance'
    | 'Crop Insurance'
    | 'Seeds'
    | 'Irrigation'
    | 'Farm Machinery'
    | 'Soil/Farming Practices'
    | 'Crop Loss';
  state: 'Andhra Pradesh' | 'Telangana' | 'All India';
  whoCanApply: string;
  beneficiaryCategory: string[];
  description: string;
  benefits: string;
  subsidyDetails: string;
  eligibility: string[];
  documentsRequired: string[];
  howToApply: string[];
  officialPortalUrl: string;
  applicationGuideUrl?: string;
  verifiedDate: string;
  isActive: boolean;
}

export const OFFICIAL_INDIAN_SCHEMES: OfficialSchemeData[] = [
  // =========================================================================
  // ANDHRA PRADESH SCHEMES
  // =========================================================================
  {
    name: 'Annadatha Sukhibhava / PM-KISAN (AP Farmers Income Support)',
    code: 'AP-ANNADATHA-SUKHIBHAVA',
    governmentType: 'State',
    ministry: 'Department of Agriculture & Farmers Welfare, Government of Andhra Pradesh',
    category: 'Financial Assistance',
    state: 'Andhra Pradesh',
    whoCanApply: 'All landholding farmers and registered tenant farmers holding CCRC in Andhra Pradesh',
    beneficiaryCategory: ['All Landholding Farmers', 'Small & Marginal Farmers', 'Tenant Farmers with CCRC'],
    description:
      'Flagship farmer investment and income support program of the Andhra Pradesh Government integrated with PM-KISAN, providing financial assistance to meet crop cultivation expenses and input purchases across Kharif, Rabi, and summer seasons.',
    benefits:
      '₹20,000 per year per eligible farmer family, delivered in seasonal tranches directly into Aadhaar-seeded bank accounts (combining ₹6,000 Central PM-KISAN + ₹14,000 AP State Government top-up assistance).',
    subsidyDetails: '₹20,000 / year total direct income assistance per eligible farming household.',
    eligibility: [
      'Cultivable land ownership registered under Meebhoomi / Webland 1B records in Andhra Pradesh.',
      'Tenant farmers belonging to SC, ST, BC, and Minority communities holding a valid Crop Cultivator Rights Card (CCRC).',
      'Aadhaar e-KYC authentication and Aadhaar-seeded active bank account.',
      'Exclusions: Institutional landholders, serving/retired government employees, income tax payees, and constitutional post holders.',
    ],
    documentsRequired: [
      'Aadhaar Card (Mandatory for all family members)',
      'Pattadar Passbook / Meebhoomi 1B Extract (Land Records)',
      'Crop Cultivator Rights Card (CCRC) for tenant farmers',
      'Aadhaar-seeded Bank Passbook with IFSC',
      'Active mobile number linked with Aadhaar',
    ],
    howToApply: [
      'Step 1: Verify your land records on the Meebhoomi portal (https://meebhoomi.ap.gov.in) or visit your local Rythu Bharosa Kendram (RBK).',
      'Step 2: Village Agriculture Assistant (VAA) verifies e-Crop enrollment and Aadhaar seed details.',
      'Step 3: Complete biometric/OTP e-KYC at the RBK kiosk.',
      'Step 4: Eligible beneficiaries list is displayed in the village social audit; payments are credited directly via DBT.',
    ],
    officialPortalUrl: 'https://annadathasukhibhava.ap.gov.in/',
    applicationGuideUrl: 'https://pmkisan.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Andhra Pradesh Micro Irrigation Project (APMIP - Drip & Sprinkler)',
    code: 'APMIP-DRIP-SPRINKLER',
    governmentType: 'State',
    ministry: 'Department of Horticulture, Government of Andhra Pradesh',
    category: 'Irrigation',
    state: 'Andhra Pradesh',
    whoCanApply: 'Small, Marginal, SC/ST, and All Landholding Farmers with assured water source in AP',
    beneficiaryCategory: ['SC/ST Farmers', 'Small & Marginal Farmers', 'Horticulture & Agriculture Farmers'],
    description:
      'Comprehensive micro-irrigation scheme implemented by APMIP to improve water-use efficiency, conserve water in drought-prone regions (such as Rayalaseema and coastal upland), and enhance crop yields through modern drip and sprinkler systems.',
    benefits:
      'Provides 90% subsidy for SC/ST and Small & Marginal farmers (up to 5 acres); 70% subsidy for Medium farmers (up to 12.5 acres); and 50% subsidy for other landholders on certified micro-irrigation equipment.',
    subsidyDetails: 'Up to 90% financial subsidy on approved BIS-standard Drip and Sprinkler systems.',
    eligibility: [
      'Farmers possessing cultivable agricultural/horticultural land with an assured water source (borewell, open well, farm pond, or canal).',
      'Valid land revenue records (1B / Pattadar Passbook) in Andhra Pradesh.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / 1B Record of Rights from Meebhoomi',
      'Caste Certificate (for SC/ST higher 90% subsidy)',
      'Water & Electricity source proof / NOC',
      'Bank Passbook copy',
    ],
    howToApply: [
      'Step 1: Visit the official APMIP portal (https://apmip.ap.gov.in) or visit your village Rythu Bharosa Kendram (RBK).',
      'Step 2: Submit application with survey numbers and select approved micro-irrigation manufacturer/vendor.',
      'Step 3: Micro Irrigation Officer (MIO) conducts farm survey and designs field layout estimation.',
      'Step 4: Pay the nominal farmer contribution share online and receive equipment installation with GPS tagging.',
    ],
    officialPortalUrl: 'https://apmip.ap.gov.in/',
    applicationGuideUrl: 'https://apmip.ap.gov.in/Registration',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Subsidized Certified Seed Distribution (AP State Seeds / RBK Network)',
    code: 'AP-SUBSIDIZED-SEEDS',
    governmentType: 'State',
    ministry: 'Andhra Pradesh State Seeds Development Corporation (APSSDC) & Department of Agriculture',
    category: 'Seeds',
    state: 'Andhra Pradesh',
    whoCanApply: 'All farmers in Andhra Pradesh cultivating notified seasonal crops (Paddy, Groundnut, Cotton, Pulses, Millets)',
    beneficiaryCategory: ['All Farmers', 'Small & Marginal Farmers', 'Tenant Farmers'],
    description:
      'Ensures timely supply of high-yielding, foundation, and certified seeds to farmers across Andhra Pradesh with price subsidies distributed transparently through the village Rythu Bharosa Kendram (RBK) network.',
    benefits:
      'Direct price subsidy ranging from 25% to 50% on certified seeds of Paddy, Groundnut, Bengalgram, Cotton, Blackgram, Greengram, and Green Manure seeds with guaranteed germination quality.',
    subsidyDetails: '25% to 50% direct price subsidy on certified seed bags.',
    eligibility: [
      'All farmers cultivating land in AP enrolled on the e-Panta / e-Crop portal.',
      'Valid Aadhaar card and registered mobile number.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / e-Crop Enrollment ID',
      'CCRC Card (for Tenant Farmers)',
    ],
    howToApply: [
      'Step 1: Visit your local village Rythu Bharosa Kendram (RBK) before the crop sowing season.',
      'Step 2: Choose desired seed variety and quantity based on landholding extent.',
      'Step 3: Authenticate identity via Aadhaar biometric/OTP on the D-Krishi / RBK terminal.',
      'Step 4: Pay the subsidized amount and collect certified seed bags with printed digital receipt.',
    ],
    officialPortalUrl: 'https://apagrisnet.gov.in/',
    applicationGuideUrl: 'https://apagrisnet.gov.in/seeds.php',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Farm Mechanization & Custom Hiring Centers (AP Mechanization Scheme)',
    code: 'AP-FARM-MECHANIZATION',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Andhra Pradesh & SMAM',
    category: 'Farm Machinery',
    state: 'Andhra Pradesh',
    whoCanApply: 'Individual Farmers, Farmer Groups, and Custom Hiring Centers (CHCs) at RBK level in AP',
    beneficiaryCategory: ['Individual Farmers', 'Women SHG Groups', 'Farmer Producer Groups (FPGs)'],
    description:
      'Aims to modernize agriculture in Andhra Pradesh by subsidizing farm machinery such as tractors, rotavators, power tillers, transplanters, sprayers, and establishing village-level Custom Hiring Centers (CHCs) at RBKs.',
    benefits:
      '40% to 50% subsidy for individual farmers on farm machinery; up to 80% subsidy for Custom Hiring Centers (CHCs) set up by farmer groups to provide equipment rentals at affordable rates.',
    subsidyDetails: '40% to 80% capital subsidy on approved agricultural equipment.',
    eligibility: [
      'Individual farmers holding cultivable agricultural land in Andhra Pradesh.',
      'Farmer groups / SHGs formed and registered under RBK jurisdiction.',
    ],
    documentsRequired: [
      'Aadhaar Card of applicant / group members',
      'Pattadar Passbook / 1B Land Record',
      'Authorized Dealer Machinery Quotation',
      'Bank Account Passbook with IFSC',
    ],
    howToApply: [
      'Step 1: Apply online via the Farm Mechanization / SMAM portal (https://agrimachinery.nic.in) or submit at your village RBK.',
      'Step 2: Select approved agricultural machinery and authorized manufacturer/dealer.',
      'Step 3: Department verifies eligibility and issues administrative sanction order.',
      'Step 4: Machinery is physically inspected and geotagged; subsidy is disbursed directly.',
    ],
    officialPortalUrl: 'https://agrimachinery.nic.in/',
    applicationGuideUrl: 'https://apagrisnet.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Andhra Pradesh Free Crop Insurance Scheme (e-Crop / PMFBY Integrated)',
    code: 'AP-FREE-CROP-INSURANCE',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Andhra Pradesh',
    category: 'Crop Insurance',
    state: 'Andhra Pradesh',
    whoCanApply: 'All farmers in AP cultivating notified crops enrolled on the e-Panta (e-Crop) portal',
    beneficiaryCategory: ['All Farmers', 'Tenant Farmers with CCRC'],
    description:
      'A 100% state-funded crop insurance scheme where the Andhra Pradesh Government pays the entire farmer premium share for notified food and commercial crops. Coverage is automatically linked to physical e-Crop booking at village RBKs.',
    benefits:
      'Complete insurance protection against crop loss caused by floods, cyclones, drought, and unseasonal rainfall with 100% state-paid premium (zero financial burden on the farmer).',
    subsidyDetails: '100% State-sponsored premium payment on behalf of farmers.',
    eligibility: [
      'Physical crop booking must be verified and enrolled on e-Panta / e-Crop by Village Agriculture Assistant.',
      'All notified crops during Kharif and Rabi seasons across all 26 districts of Andhra Pradesh.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'e-Crop Booking Digital Receipt / VAA Certification',
      'Aadhaar-linked Bank Account',
    ],
    howToApply: [
      'Step 1: Ensure your sown crop is digitally recorded on e-Crop (https://karshak.ap.gov.in/ecrop/) by the Village Agriculture Assistant.',
      'Step 2: Check your name in the social audit list displayed at your village RBK.',
      'Step 3: If eligible, insurance coverage is activated automatically without any separate premium payment.',
      'Step 4: Crop cutting experiments (CCE) determine yield loss; claim compensation is directly credited via DBT.',
    ],
    officialPortalUrl: 'https://karshak.ap.gov.in/ecrop/',
    applicationGuideUrl: 'https://pmfby.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Andhra Pradesh Community Managed Natural Farming (APCNF)',
    code: 'AP-NATURAL-FARMING',
    governmentType: 'State',
    ministry: 'Rythu Sadhikara Samstha (RySS), Government of Andhra Pradesh',
    category: 'Soil/Farming Practices',
    state: 'Andhra Pradesh',
    whoCanApply: 'Smallholders, women farmers, and landholders adopting chemical-free natural farming in AP',
    beneficiaryCategory: ['Small & Marginal Farmers', 'Women Farmers', 'Organic Farmer Groups'],
    description:
      'Globally recognized climate-resilient farming program promoting chemical-free agro-ecological practices (Jeevamrutham, Beejamrutham, Kashayams, Pre-Monsoon Dry Sowing) across all districts of Andhra Pradesh.',
    benefits:
      'Free bio-input preparation kits, indigenous cow shelter support, capacity training by Community Resource Persons (CRPs), and assistance with Pre-Monsoon Dry Sowing (PMDS) to improve soil organic carbon.',
    subsidyDetails: '100% Free technical training, input subsidies, and biological certification support.',
    eligibility: [
      'Farmers committed to transitioning part or all of their cultivable land to natural farming practices.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Land survey number / Pattadar passbook',
      'Self-declaration of natural farming adoption',
    ],
    howToApply: [
      'Step 1: Register with the Community Resource Person (CRP) at your village Rythu Bharosa Kendram.',
      'Step 2: Attend hands-on bio-formulation preparation workshops at the village Custom Hiring / Bio-Input Resource Center.',
      'Step 3: Implement natural farming protocols and receive certification via the APCNF network (https://apcnf.in).',
    ],
    officialPortalUrl: 'https://apcnf.in/',
    applicationGuideUrl: 'https://apcnf.in/about-us/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Soil Health Card & Nutrient Management (AP Agriculture)',
    code: 'AP-SOIL-HEALTH',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Andhra Pradesh',
    category: 'Soil/Farming Practices',
    state: 'Andhra Pradesh',
    whoCanApply: 'All agricultural and horticultural landholders in Andhra Pradesh',
    beneficiaryCategory: ['All Farmers'],
    description:
      'Free soil testing and customized nutrient advice program analyzing 12 chemical and biological parameters to prevent excessive chemical fertilizer usage and restore soil micro-nutrient fertility.',
    benefits:
      '100% Free laboratory testing of soil samples and printed Soil Health Cards with customized fertilizer dosage recommendations tailored to specific crops.',
    subsidyDetails: '100% Free testing, analysis, and digital Soil Health Card delivery.',
    eligibility: [
      'All farmers cultivating agricultural land in Andhra Pradesh.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Land Survey Number / Khatauni details',
      'Mobile Number',
    ],
    howToApply: [
      'Step 1: Contact your Village Agriculture Assistant at the local RBK to request soil sample collection.',
      'Step 2: Samples are tested at the District / Regional Soil Testing Laboratory.',
      'Step 3: Download digital Soil Health Card from https://soilhealth.dac.gov.in using your district and survey number.',
    ],
    officialPortalUrl: 'https://soilhealth.dac.gov.in/',
    applicationGuideUrl: 'https://apagrisnet.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Natural Calamity Input Subsidy / Crop Loss Relief (AP Disaster Relief)',
    code: 'AP-CROP-LOSS-RELIEF',
    governmentType: 'State',
    ministry: 'Disaster Management & Agriculture Department, Government of Andhra Pradesh',
    category: 'Crop Loss',
    state: 'Andhra Pradesh',
    whoCanApply: 'Farmers suffering >33% crop loss due to cyclone, flood, drought, or pest outbreak in AP',
    beneficiaryCategory: ['All Affected Farmers', 'Tenant Farmers with CCRC'],
    description:
      'Direct input subsidy and financial assistance provided by the Andhra Pradesh Government to farmers who have suffered crop losses exceeding 33% due to notified natural calamities (cyclones, floods, droughts).',
    benefits:
      'Direct-to-bank compensation: ₹17,000/ha for rainfed crops, ₹22,500/ha for irrigated crops, and ₹25,000/ha for perennial horticulture crops.',
    subsidyDetails: '100% Government direct financial grant for agricultural input restoration.',
    eligibility: [
      'Crop loss exceeding 33% verified through e-Crop booking and joint field enumeration.',
      'Mandal notified as calamity/drought-affected by the State Disaster Management Authority.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'e-Crop Booking Record',
      'Bank Account details linked with Aadhaar',
    ],
    howToApply: [
      'Step 1: Revenue and Agriculture officers conduct joint field enumeration after the natural calamity.',
      'Step 2: Verify your name and assessed damage percentage on the social audit list at your village RBK.',
      'Step 3: Input subsidy is directly deposited into your Aadhaar-linked bank account.',
    ],
    officialPortalUrl: 'https://apagrisnet.gov.in/',
    applicationGuideUrl: 'https://karshak.ap.gov.in/ecrop/',
    verifiedDate: 'August 2026',
    isActive: true,
  },

  // =========================================================================
  // TELANGANA SCHEMES
  // =========================================================================
  {
    name: 'Rythu Bharosa (Telangana State Investment Support Scheme)',
    code: 'TG-RYTHU-BHAROSA',
    governmentType: 'State',
    ministry: 'Department of Agriculture & Farmers Welfare, Government of Telangana',
    category: 'Financial Assistance',
    state: 'Telangana',
    whoCanApply: 'All landowning farmers and eligible tenant cultivators holding certified rights in Telangana',
    beneficiaryCategory: ['All Landholding Farmers', 'Small & Marginal Farmers', 'Tenant Farmers'],
    description:
      'The flagship investment assistance scheme of the Telangana Government (enhanced from Rythu Bandhu) providing direct cash support per acre to meet input expenses for fertilizers, seeds, and labor before sowing season.',
    benefits:
      '₹15,000 per acre per year (₹7,500 per acre per season for Kharif and Rabi) directly credited to the beneficiary farmer\'s bank account through Direct Benefit Transfer (DBT).',
    subsidyDetails: '₹15,000 / acre / year direct investment assistance without any loan deduction.',
    eligibility: [
      'Farmers possessing title agricultural land registered under Dharani portal records in Telangana.',
      'Tenant farmers holding certified identity and cultivation agreements.',
      'Aadhaar-linked active bank account.',
      'Exclusions: Non-agricultural land, real estate ventures, and institutional properties.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Dharani Portal Land Record Number',
      'Aadhaar-seeded Bank Account Passbook with IFSC',
      'Registered mobile number',
    ],
    howToApply: [
      'Step 1: Check your land ownership status on the official Dharani portal (https://dharani.telangana.gov.in).',
      'Step 2: Agriculture Extension Officer (AEO) verifies your land record at your local Rythu Vedika.',
      'Step 3: Bank account is validated and financial assistance is credited directly before each crop season.',
    ],
    officialPortalUrl: 'https://agri.telangana.gov.in/',
    applicationGuideUrl: 'https://dharani.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Rythu Bima (Telangana Farmers Group Life Insurance Scheme)',
    code: 'TG-RYTHU-BIMA',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Telangana & LIC of India',
    category: 'Financial Assistance',
    state: 'Telangana',
    whoCanApply: 'All landholding farmers in Telangana aged between 18 and 59 years',
    beneficiaryCategory: ['All Landholding Farmers aged 18-59'],
    description:
      'A unique 100% government-sponsored group life insurance scheme providing immediate financial security to the bereaved families of farmers in the event of a farmer\'s death due to natural or accidental causes.',
    benefits:
      'Assured life insurance payout of ₹5,00,000 (₹5 Lakh) disbursed within 10 days of claim submission directly to the designated nominee\'s bank account. 100% of the annual premium is paid by the Telangana Government.',
    subsidyDetails: '100% State-sponsored premium (Zero premium cost to farmers).',
    eligibility: [
      'Farmer must possess a valid Pattadar Passbook issued under Dharani in Telangana.',
      'Age must be between 18 and 59 years (as per Aadhaar record).',
    ],
    documentsRequired: [
      'Aadhaar Card of the farmer',
      'Pattadar Passbook (Dharani Title Deed)',
      'Nominee Aadhaar Card & Bank Account Passbook',
    ],
    howToApply: [
      'Step 1: Contact your Village Agriculture Extension Officer (AEO) at the local Rythu Vedika.',
      'Step 2: Submit Pattadar Passbook and fill the Rythu Bima enrollment & nominee nomination form.',
      'Step 3: Enrollment is verified online on the Rythu Bima portal (https://rythubima.telangana.gov.in).',
      'Step 4: In case of unfortunate death, nominee submits death certificate to AEO for express settlement.',
    ],
    officialPortalUrl: 'https://rythubima.telangana.gov.in/',
    applicationGuideUrl: 'https://agri.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Telangana Farm Mechanization Scheme (Telangana Agros)',
    code: 'TG-FARM-MECHANIZATION',
    governmentType: 'State',
    ministry: 'Telangana State Agro Industries Development Corporation (TSAIDCL)',
    category: 'Farm Machinery',
    state: 'Telangana',
    whoCanApply: 'Individual Farmers, SC/ST cultivators, Women Farmers, and FPOs in Telangana',
    beneficiaryCategory: ['SC/ST Farmers', 'Small & Marginal Farmers', 'FPOs'],
    description:
      'Promotes farm mechanization across Telangana by providing high-subsidy agricultural machinery including tractors, power tillers, paddy transplanters, laser land levelers, multi-crop threshers, and power weeders.',
    benefits:
      '50% subsidy for SC/ST, Women, and Small & Marginal farmers on approved agricultural implements; up to 80% subsidy for setting up village Custom Hiring Centers (CHCs).',
    subsidyDetails: '50% to 80% capital subsidy on approved farm machinery.',
    eligibility: [
      'Farmers possessing cultivable agricultural land registered in Telangana.',
      'Valid Pattadar passbook and Aadhaar card.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Dharani Survey details',
      'Caste Certificate (for SC/ST higher subsidy rate)',
      'Quotation from empanelled machinery dealer',
      'Bank Account details',
    ],
    howToApply: [
      'Step 1: Visit the official Telangana Agros portal (https://telanganaagros.org) or visit your Mandal Agriculture Office.',
      'Step 2: Select desired agricultural machinery from the approved list.',
      'Step 3: Department issues administrative sanction letter.',
      'Step 4: Purchase equipment, complete physical verification, and receive subsidy credit.',
    ],
    officialPortalUrl: 'https://telanganaagros.org/',
    applicationGuideUrl: 'https://agrimachinery.nic.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Subsidized Seed Distribution & Seed Chain (TSSDC Telangana)',
    code: 'TG-SUBSIDIZED-SEEDS',
    governmentType: 'State',
    ministry: 'Telangana State Seed Development Corporation (TSSDC) & Dept of Agriculture',
    category: 'Seeds',
    state: 'Telangana',
    whoCanApply: 'All farmers cultivating Paddy, Maize, Redgram, Bengalgram, and Green Manure in Telangana',
    beneficiaryCategory: ['All Farmers', 'Small & Marginal Farmers'],
    description:
      'Provides high-quality certified, foundation, and hybrid seeds at subsidized prices through Primary Agricultural Cooperative Societies (PACS), DCMS, and TSSDC outlets across all 33 districts of Telangana.',
    benefits:
      '25% to 50% subsidy on certified seeds including Paddy (BPT 5204, Telangana Sona, RNR 15048), Pulses (Redgram, Bengalgram), and Green Manure seeds (Dhaincha, Sunhemp, Pillipesara).',
    subsidyDetails: '25% to 50% price concession on foundation and certified seed bags.',
    eligibility: [
      'Registered farmers holding land records in Telangana.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Dharani Khata Number',
    ],
    howToApply: [
      'Step 1: Visit your nearest PACS / DCMS or TSSDC distribution center (https://tssdc.telangana.gov.in).',
      'Step 2: Present Pattadar Passbook and Aadhaar for biometric verification.',
      'Step 3: Collect subsidized seed quota with printed digital receipt.',
    ],
    officialPortalUrl: 'https://tssdc.telangana.gov.in/',
    applicationGuideUrl: 'https://agri.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Telangana State Micro Irrigation Project (TSMIP / PMKSY)',
    code: 'TG-TSMIP-MICRO-IRRIGATION',
    governmentType: 'State',
    ministry: 'Department of Horticulture, Government of Telangana',
    category: 'Irrigation',
    state: 'Telangana',
    whoCanApply: 'All farmers in Telangana possessing cultivable agricultural land with water source',
    beneficiaryCategory: ['SC/ST Farmers', 'Small & Marginal BC/OC Farmers', 'All Landholders'],
    description:
      'Provides massive financial subsidies for installation of Drip and Sprinkler irrigation systems to conserve water, reduce power usage, and boost crop productivity across Telangana.',
    benefits:
      '100% subsidy for SC/ST farmers (up to 5 acres), 90% subsidy for Small & Marginal BC/OC farmers, and 80% subsidy for other landholders on complete micro-irrigation sets.',
    subsidyDetails: '80% to 100% subsidy on Drip and Sprinkler irrigation systems.',
    eligibility: [
      'Farmers with cultivable land in Telangana having an assured water source (borewell, well, canal, or farm pond).',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / 1B Land Document',
      'Caste Certificate (for SC/ST 100% subsidy)',
      'Water source proof',
      'Bank Account Passbook copy',
    ],
    howToApply: [
      'Step 1: Apply online via the Telangana Horticulture / TSMIP portal (https://horticulture.telangana.gov.in) or visit the District Horticulture Office / Rythu Vedika.',
      'Step 2: Select approved micro-irrigation vendor and submit field survey details.',
      'Step 3: Horticulture Officer inspects farm site and approves technical estimate.',
      'Step 4: Pay non-subsidized farmer portion (if applicable) and get certified installation.',
    ],
    officialPortalUrl: 'https://horticulture.telangana.gov.in/',
    applicationGuideUrl: 'https://pmksy.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (Telangana PMFBY Crop Insurance)',
    code: 'TG-CROP-INSURANCE',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Telangana & Ministry of Agriculture',
    category: 'Crop Insurance',
    state: 'Telangana',
    whoCanApply: 'All farmers cultivating notified food crops, oilseeds, and commercial crops in Telangana',
    beneficiaryCategory: ['All Farmers', 'Tenant Farmers'],
    description:
      'Comprehensive insurance protection providing financial support to farmers suffering crop loss or damage arising out of natural calamities, unseasonal rainfall, pests, and drought.',
    benefits:
      'Comprehensive coverage from pre-sowing to post-harvest. Lowest farmer premium rates: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops. Remaining actuarial premium is fully subsidized by the Government.',
    subsidyDetails: 'Up to 90% actuarial premium subsidized jointly by Telangana State and Central Governments.',
    eligibility: [
      'All farmers growing notified crops in notified insurance units across Telangana.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Land Revenue Record',
      'Crop Sowing Certificate issued by AEO',
      'Bank Account details',
    ],
    howToApply: [
      'Step 1: Open the official PMFBY National Crop Insurance portal (https://pmfby.gov.in) or visit your nearest Bank / CSC center.',
      'Step 2: Enter Aadhaar, mobile number, land survey details, and sown crop.',
      'Step 3: Pay the subsidized farmer premium share online and download policy receipt.',
    ],
    officialPortalUrl: 'https://pmfby.gov.in/',
    applicationGuideUrl: 'https://pmfby.gov.in/farmerRegistrationForm',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Soil Health Card Scheme (Telangana Agriculture)',
    code: 'TG-SOIL-HEALTH',
    governmentType: 'State',
    ministry: 'Department of Agriculture, Government of Telangana',
    category: 'Soil/Farming Practices',
    state: 'Telangana',
    whoCanApply: 'All agricultural landholders across all 33 districts of Telangana',
    beneficiaryCategory: ['All Farmers'],
    description:
      'Provides free soil testing and digital Soil Health Cards with 12 nutrient status parameters to optimize fertilizer use and increase crop productivity in Telangana soils.',
    benefits:
      '100% Free laboratory testing of soil samples and customized chemical/organic fertilizer recommendations to prevent soil degradation and lower fertilizer expenses.',
    subsidyDetails: '100% Free collection, laboratory testing, and Soil Health Card issuance.',
    eligibility: [
      'All agricultural landholders in Telangana.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Survey Number',
      'Mobile Number',
    ],
    howToApply: [
      'Step 1: Request soil sampling from your Agriculture Extension Officer (AEO) at the Rythu Vedika.',
      'Step 2: Sample is analyzed at the District Soil Testing Laboratory.',
      'Step 3: Download digital Soil Health Card from https://soilhealth.dac.gov.in.',
    ],
    officialPortalUrl: 'https://soilhealth.dac.gov.in/',
    applicationGuideUrl: 'https://agri.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Rashtriya Krishi Vikas Yojana (RKVY - Telangana Agriculture Infra)',
    code: 'TG-RKVY-INFRASTRUCTURE',
    governmentType: 'State',
    ministry: 'Department of Agriculture & Horticulture, Government of Telangana',
    category: 'Soil/Farming Practices',
    state: 'Telangana',
    whoCanApply: 'Farmers, Farmer Groups, PACS, and FPOs in Telangana',
    beneficiaryCategory: ['Individual Farmers', 'FPOs', 'Primary Agricultural Credit Societies (PACS)'],
    description:
      'Provides financial assistance and capital subsidies for farm-level infrastructure including farm ponds, polyhouses, shade net structures, post-harvest drying yards, and primary processing units.',
    benefits:
      'Up to 75% subsidy for SC/ST farmers and 50% subsidy for other categories for polyhouses, shade net houses, and protected cultivation structures.',
    subsidyDetails: '50% to 75% project subsidy on protected cultivation and infrastructure.',
    eligibility: [
      'Farmers possessing land suitable for protected cultivation and farm infrastructure in Telangana.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook (Dharani)',
      'Project Proposal / Detailed Estimate',
      'Bank Account details',
    ],
    howToApply: [
      'Step 1: Apply through the Telangana Horticulture portal (https://horticulture.telangana.gov.in) under RKVY component.',
      'Step 2: Submit DPR and land documentation.',
      'Step 3: Department sanctions project and releases subsidy tranches upon milestone inspection.',
    ],
    officialPortalUrl: 'https://rkvy.nic.in/',
    applicationGuideUrl: 'https://horticulture.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
  {
    name: 'Natural Calamity / Input Subsidy for Crop Damage (Telangana Relief)',
    code: 'TG-CROP-LOSS-ASSISTANCE',
    governmentType: 'State',
    ministry: 'Revenue (Disaster Management) & Agriculture Dept, Govt of Telangana',
    category: 'Crop Loss',
    state: 'Telangana',
    whoCanApply: 'Farmers who suffered >33% crop loss due to hailstorms, heavy rains, or severe drought in Telangana',
    beneficiaryCategory: ['All Affected Farmers in Declared Mandals'],
    description:
      'Direct input subsidy provided by the Government of Telangana to farmers whose crops have suffered substantial damage exceeding 33% due to unseasonal hailstorms, excessive rainfall, or drought.',
    benefits:
      'Direct financial relief of ₹10,000 per acre credited into the affected farmers\' bank accounts to help recoup seasonal investment losses.',
    subsidyDetails: '₹10,000 / acre direct financial relief assistance via DBT.',
    eligibility: [
      'Calamity-affected agricultural lands verified through joint field survey by Revenue and Agriculture officials.',
    ],
    documentsRequired: [
      'Aadhaar Card',
      'Pattadar Passbook / Dharani Record',
      'Bank Passbook linked with Aadhaar',
    ],
    howToApply: [
      'Step 1: Revenue and Agriculture officers conduct field assessment after the natural calamity.',
      'Step 2: Verify your survey details in the eligible farmers list displayed at the Gram Panchayat / Rythu Vedika.',
      'Step 3: Input subsidy is transferred directly via DBT into your bank account.',
    ],
    officialPortalUrl: 'https://agri.telangana.gov.in/',
    applicationGuideUrl: 'https://agri.telangana.gov.in/',
    verifiedDate: 'August 2026',
    isActive: true,
  },
];
