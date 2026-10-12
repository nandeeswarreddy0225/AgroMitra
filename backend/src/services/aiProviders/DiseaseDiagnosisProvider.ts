import { ExistingModelProvider } from './ExistingModelProvider';
import { DiseaseDiagnosisResult, DiagnosisStatus, HealthStatus } from './types';
import * as jpeg from 'jpeg-js';

export const DEFAULT_DISCLAIMER =
  'AgroMitra Universal Leaf Scanner is an automated decision-support tool provided for informational guidance. ' +
  'Always consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist ' +
  'for field verification before applying chemical treatments.';

export interface OpenWorldPathologyRecord {
  disease: string;
  telugu: string;
  scientificPathogen: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  symptoms: string[];
  explanation: string;
  disease_management: string[];
  fertilizer: string[];
  prevention: string[];
}

export const OPEN_WORLD_PATHOLOGY_DATABASE: Record<string, Record<string, OpenWorldPathologyRecord>> = {
  Squash: {
    powdery_mildew: {
      disease: 'Powdery Mildew (బూడిద తెగులు - Podosphaera xanthii)',
      telugu: 'బూడిద తెగులు',
      scientificPathogen: 'Podosphaera xanthii',
      severity: 'Moderate',
      symptoms: [
        'Talcing white to grayish powdery fungal patches on upper leaf surfaces.',
        'Premature yellowing, chlorosis, and crinkling of older leaves.',
      ],
      explanation:
        'Powdery mildew is a prevalent fungal pathogen in Cucurbitaceae family. It spreads rapidly under warm, dry days with high relative humidity.',
      disease_management: [
        'Apply Wettable Sulfur (2.5g/L) or Potassium Bicarbonate (3g/L) at first sign of powdery spots.',
        'Apply bio-fungicides such as Bacillus subtilis or Ampelomyces quisqualis for organic management.',
        'Prune and destroy heavily infected lower canopy leaves to reduce inoculum.',
      ],
      fertilizer: [
        'Avoid excessive quick-release nitrogen fertilizers which generate lush, succulent foliage susceptible to infection.',
        'Ensure adequate potassium and silica to strengthen leaf epidermal cell walls.',
      ],
      prevention: [
        'Maintain proper plant spacing (1.5 - 2 meters between rows) to promote good air circulation.',
        'Avoid overhead sprinkler irrigation; use drip irrigation to keep foliage dry.',
      ],
    },
  },
  'Bell Pepper': {
    bacterial_spot: {
      disease: 'Bacterial Spot (బాక్టీరియా మచ్చ - Xanthomonas campestris pv. vesicatoria)',
      telugu: 'బాక్టీరియా మచ్చ తెగులు',
      scientificPathogen: 'Xanthomonas campestris pv. vesicatoria',
      severity: 'Moderate',
      symptoms: [
        'Small, circular to irregular dark brown lesions with water-soaked greasy borders.',
        'Leaves turn yellow around spots and drop prematurely causing defoliation.',
      ],
      explanation:
        'Bacterial spot is caused by Xanthomonas campestris in Capsicum species, spreading rapidly through splashing rain, sprinkler irrigation, and high humidity.',
      disease_management: [
        'Spray Copper Hydroxide (2g/L) combined with Streptocycline (100 ppm) during early stages.',
        'Apply Trichoderma viride or Pseudomonas fluorescens for biological suppression.',
      ],
      fertilizer: [
        'Maintain balanced N-P-K nutrition. Excessive nitrogen increases foliar succulence and lesion development.',
      ],
      prevention: [
        'Avoid working in wet fields to prevent spreading bacteria between plants.',
        'Use drip irrigation instead of overhead watering and rotate with non-solanaceous crops.',
      ],
    },
  },
  Guava: {
    anthracnose: {
      disease: 'Anthracnose (జామ మచ్చ తెగులు - Colletotrichum gloeosporioides)',
      telugu: 'జామ ఆంత్రక్నోస్ మచ్చ తెగులు',
      scientificPathogen: 'Colletotrichum gloeosporioides',
      severity: 'Moderate',
      symptoms: [
        'Pinhead-sized dark brown to black necrotic spots coalescing into large irregular blights on foliage.',
        'Dieback of young shoots and tender branches.',
      ],
      explanation:
        'Anthracnose affects Guava orchards in humid tropical conditions. The fungus attacks tender foliar tissue and young shoots.',
      disease_management: [
        'Prune dead and infected twigs 2 inches below infected area and burn them.',
        'Apply Copper Oxychloride (3g/L) or Carbendazim (1g/L) after pruning.',
      ],
      fertilizer: [
        'Apply micronutrient foliar spray (Zinc Sulfate 0.5% + Boric Acid 0.2%) to boost tree immunity.',
      ],
      prevention: [
        'Ensure good sunlight penetration through proper canopy pruning.',
        'Avoid creating injury on leaves during orchard maintenance.',
      ],
    },
  },
  Mango: {
    anthracnose: {
      disease: 'Anthracnose (మామిడి మచ్చ తెగులు - Colletotrichum gloeosporioides)',
      telugu: 'మామిడి ఆంత్రక్నోస్ తెగులు',
      scientificPathogen: 'Colletotrichum gloeosporioides',
      severity: 'Moderate',
      symptoms: [
        'Circular to irregular dark brown to black necrotic spots with chlorotic yellow halos on leaf blades.',
        'Blossom blight, leaf crinkling, and shoot dieback in humid tropical orchards.',
      ],
      explanation:
        'Mango anthracnose is caused by Colletotrichum gloeosporioides, spreading during rainy periods and warm temperatures.',
      disease_management: [
        'Prune and destroy infected panicles and dead twigs.',
        'Apply Copper Oxychloride 50 WP (3g/L) or Carbendazim 50 WP (1g/L) during flush and flowering.',
      ],
      fertilizer: [
        'Maintain balanced potassium and micronutrient foliar spray (Zinc + Boron).',
      ],
      prevention: [
        'Avoid overhead sprinkler irrigation and maintain open canopy for sun aeration.',
      ],
    },
  },
  Okra: {
    yellow_vein_mosaic: {
      disease: 'Yellow Vein Mosaic (బెండ పసుపు ఈనెల తెగులు - BYVMV)',
      telugu: 'బెండ పసుపు ఈనెల వైరస్ తెగులు',
      scientificPathogen: 'Bhendi Yellow Vein Mosaic Virus',
      severity: 'Severe',
      symptoms: [
        'Distinctive clear yellowing of veins alternating with green leaf blade interveinal tissue.',
        'Stunted growth, leaf puckering, and small fibrous bleached fruits.',
      ],
      explanation:
        'Bhendi yellow vein mosaic is transmitted by whiteflies (Bemisia tabaci). Early infection can cause total crop loss.',
      disease_management: [
        'Rogue out and destroy viral infected plants immediately.',
        'Control whitefly vectors using Neem Oil (5ml/L) or Acetamiprid 20 SP (0.2g/L).',
      ],
      fertilizer: [
        'Apply recommended nitrogen in splits and balanced potash to reduce sap-sucking susceptibility.',
      ],
      prevention: [
        'Sow BYVMV-resistant cultivars (e.g. Parbhani Kranti, Arka Anamika).',
        'Install yellow sticky traps (15-20 per acre) to monitor and catch whitefly vectors.',
      ],
    },
  },
  Papaya: {
    ringspot: {
      disease: 'Papaya Ring Spot Virus (బొప్పాయి రింగ్‌స్పాట్ వైరస్ - PRSV)',
      telugu: 'బొప్పాయి రింగ్‌స్పాట్ వైరస్',
      scientificPathogen: 'Papaya Ringspot Potyvirus',
      severity: 'Severe',
      symptoms: [
        'Severe yellow mosaic mottle and shoe-stringing on leaves with water-soaked oily streaks on petioles.',
      ],
      explanation:
        'Aphid-transmitted potyvirus causing severe leaf distortion and stunted fruit development.',
      disease_management: [
        'Rogue out infected papaya trees to stop orchard transmission.',
        'Spray insecticidal soap or Dimethoate (1.5ml/L) to manage aphid vectors.',
      ],
      fertilizer: ['Balanced micronutrient spray to maintain tree vigor.'],
      prevention: ['Plant barrier crops (corn or sorghum) around the papaya orchard.'],
    },
  },
  Coconut: {
    bud_rot: {
      disease: 'Bud Rot (కొబ్బరి మొవ్వు కుళ్ళు తెగులు - Phytophthora palmivora)',
      telugu: 'కొబ్బరి మొవ్వు కుళ్ళు తెగులు',
      scientificPathogen: 'Phytophthora palmivora',
      severity: 'Severe',
      symptoms: [
        'Yellowing and drooping of spear leaf / central spindle, rotting at crown base with foul odor.',
      ],
      explanation:
        'Soil- and water-borne oomycete pathogen attacking the central growing point of coconut palms during monsoons.',
      disease_management: [
        'Cut and clean rotting spindle tissues and apply Bordeaux paste (10%) to the crown.',
        'Place Copper Oxychloride sachets (5g) or spray Metalaxyl-M (2g/L).',
      ],
      fertilizer: ['Apply standard N-P-K + Magnesium Sulfate to palm root basins.'],
      prevention: ['Provide good drainage in coconut plantations during heavy monsoon rains.'],
    },
  },
  Wheat: {
    rust: {
      disease: 'Stem / Leaf Rust (గోధుమ తుప్పు తెగులు - Puccinia spp.)',
      telugu: 'గోధుమ తుప్పు తెగులు',
      scientificPathogen: 'Puccinia graminis / Puccinia triticina',
      severity: 'Severe',
      symptoms: [
        'Reddish-brown to orange powdery pustules bursting through leaf surfaces.',
        'Leaves dry up and turn brown rapidly in warm temperatures.',
      ],
      explanation:
        'Rust is a destructive fungal pathogen in wheat crops, windborne over long distances, thriving under moderate temperatures and moisture.',
      disease_management: [
        'Apply Propiconazole 25 EC (1ml/L) or Tebuconazole (1ml/L) at the appearance of first pustules.',
        'Mancozeb 75 WP (2g/L) can be sprayed as a protective measure.',
      ],
      fertilizer: [
        'Ensure balanced potash application (MOP) to improve crop resistance against rust pustules.',
      ],
      prevention: [
        'Sow rust-resistant recommended wheat cultivars for your agro-climatic zone.',
        'Practice early sowing to avoid peak fungal spore showers.',
      ],
    },
  },
};

export class DiseaseDiagnosisProvider {
  public static isSpeciesInExistingModel(species: string | null | undefined): boolean {
    return ExistingModelProvider.isSupportedSpecies(species);
  }

  /**
   * For open-world species outside the 18 specialist crops:
   * 1. Inspect visual morphology / foliar characteristics or multimodal input.
   * 2. Detect species-appropriate confirmed foliar disease if present.
   * 3. Return HEALTHY if evidence indicates clean healthy foliage.
   * 4. Return DISEASE_UNCERTAIN if symptoms cannot be reliably determined, without guessing.
   */
  public diagnoseOutsideSpecies(
    species: string,
    buffer?: Buffer,
    originalname: string = '',
    _mimetype: string = 'image/jpeg',
    rawDetails?: any
  ): DiseaseDiagnosisResult {
    // 1. Check if upstream multimodal vision plugin (e.g. Gemini, PythonFastAPI) already identified pathology
    if (rawDetails?.provider === 'GeminiVision' || rawDetails?.provider === 'PythonFastAPI') {
      if (rawDetails.isHealthy === true) {
        return this.createHealthyResponse(species, rawDetails.provider === 'PythonFastAPI' ? 0.90 : 0.92);
      }
      if (rawDetails.disease && typeof rawDetails.disease === 'string' && rawDetails.disease.trim().length > 0) {
        const diseaseName = rawDetails.disease;
        return {
          disease: diseaseName,
          confidence: rawDetails.provider === 'PythonFastAPI' ? 0.85 : 0.88,
          healthStatus: 'Disease Detected',
          diagnosisStatus: 'DIAGNOSED',
          isHealthy: false,
          severity: rawDetails.severity || 'Moderate',
          symptoms: rawDetails.symptoms || ['Visual foliar abnormalities identified by AI.'],
          recommendation: rawDetails.recommendation || {
            explanation: `Foliar pathology diagnosed on ${species}: ${diseaseName}.`,
            disease_management: [
              `Scout ${species} field and remove heavily infected foliage.`,
              'Apply species-safe bio-fungicides or agronomist-recommended protective spray.',
            ],
            fertilizer: ['Maintain balanced soil nutrition and avoid excess nitrogen.'],
            prevention: ['Improve air circulation and avoid overhead irrigation.'],
            safety_note: DEFAULT_DISCLAIMER,
          },
        };
      }
    }


    // 2. Open-World Species Outside Genuine Specialist Disease Models:
    // "For unsupported species, return a clear uncertain disease result unless a genuine, validated disease provider can diagnose it."
    // "Do not claim a plant is healthy merely because disease detection failed."
    // "Do not claim universal disease recognition without evidence."
    return {
      disease: null,
      confidence: null,
      healthStatus: 'Uncertain',
      diagnosisStatus: 'DISEASE_UNCERTAIN',
      isHealthy: false,
      severity: 'Unknown',
      symptoms: [
        `Visual foliar symptoms on ${species} cannot be matched with certainty against certified specialist pathology models.`,
      ],
      recommendation: {
        explanation: `Foliar pathology for ${species} is outside the certified specialist disease database. AgroMitra does not fabricate unverified disease diagnoses.`,
        disease_management: [
          'Scout foliage for visible insect pests, fungal mycelium, or spotting.',
          'Consult local Agricultural Extension Officer (AEO) or Krishi Vigyan Kendra (KVK) for laboratory-certified pathology confirmation.',
        ],
        fertilizer: [
          'Maintain balanced soil fertility and appropriate irrigation scheduling.',
        ],
        prevention: [
          'Isolate affected foliage to prevent potential spread to adjacent crops.',
        ],
        safety_note: DEFAULT_DISCLAIMER,
      },
    };
  }

  public createOrganMismatchResponse(species: string, organ: string): DiseaseDiagnosisResult {
    const organName = organ.charAt(0).toUpperCase() + organ.slice(1);
    return {
      disease: null,
      confidence: null,
      healthStatus: 'Uncertain',
      diagnosisStatus: 'ORGAN_MISMATCH',
      isHealthy: false,
      severity: 'Unknown',
      symptoms: [
        `Image shows a ${species} ${organ}, not a foliar leaf specimen.`,
        'Certified disease pathology models are calibrated strictly on leaf foliage and cannot diagnose leaf diseases from fruits, flowers, or bark.',
      ],
      recommendation: {
        explanation: `Plant species identified as ${species} (${organName}). Certified disease pathology is trained exclusively on foliar leaf specimens and cannot diagnose leaf diseases from a ${organ}.`,
        disease_management: [
          `To check for foliar disease (such as blight, mildew, leaf spot, or rust), please take a clear close-up photo of a ${species} leaf blade.`,
          'Inspect fruits, flowers, and branches regularly for physical damage or pest punctures.',
        ],
        fertilizer: [
          'Maintain balanced soil fertility and appropriate irrigation scheduling.',
        ],
        prevention: [
          'Ensure adequate canopy airflow and prevent direct fruit-to-soil contact.',
        ],
        safety_note: DEFAULT_DISCLAIMER,
      },
    };
  }

  private createDiagnosedResponse(
    _species: string,
    record: OpenWorldPathologyRecord,
    confidence: number
  ): DiseaseDiagnosisResult {
    return {
      disease: record.disease,
      confidence,
      healthStatus: 'Disease Detected',
      diagnosisStatus: 'DIAGNOSED',
      isHealthy: false,
      severity: record.severity,
      symptoms: record.symptoms,
      recommendation: {
        explanation: record.explanation,
        disease_management: record.disease_management,
        fertilizer: record.fertilizer,
        prevention: record.prevention,
        safety_note: DEFAULT_DISCLAIMER,
      },
    };
  }

  private createHealthyResponse(species: string, confidence: number): DiseaseDiagnosisResult {
    return {
      disease: 'Healthy Leaf',
      confidence,
      healthStatus: 'Healthy',
      diagnosisStatus: 'HEALTHY',
      isHealthy: true,
      severity: 'None',
      symptoms: [
        'Vibrant green foliar color with uniform chlorophyll distribution and no visible lesions.',
      ],
      recommendation: {
        explanation: `${species} foliage exhibits robust vegetative vigor with no visible disease or pest damage detected.`,
        disease_management: [
          'No chemical or curative pathology treatment is needed at this time.',
        ],
        fertilizer: [
          'Apply balanced N-P-K fertilizer and micronutrients according to Soil Health Card guidelines for optimal vegetative development.',
        ],
        prevention: [
          'Conduct periodic crop scouting to detect any early onset of foliar pests or leaf spots.',
          'Maintain optimal irrigation scheduling to prevent moisture stress or waterlogging.',
        ],
        safety_note: DEFAULT_DISCLAIMER,
      },
    };
  }
}

export const diseaseDiagnosisProvider = new DiseaseDiagnosisProvider();

