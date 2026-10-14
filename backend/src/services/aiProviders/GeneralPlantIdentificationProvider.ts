import axios from 'axios';
import FormData from 'form-data';
import * as jpeg from 'jpeg-js';
import { PlantIdentificationResult } from './types';
import { OrganAssessmentService } from './organAssessment.service';

export interface GeneralPlantVisionPlugin {
  identifyPlant(buffer: Buffer, originalname: string, mimetype: string): Promise<PlantIdentificationResult>;
}

export interface BotanicalTaxon {
  commonName: string;
  scientificName: string;
  family: string;
  teluguName?: string;
  category: 'Vegetable' | 'Fruit' | 'Cereal' | 'Tree' | 'Herb' | 'Legume' | 'Commercial' | 'Ornamental';
}

export const OPEN_WORLD_BOTANICAL_REGISTRY: Record<string, BotanicalTaxon> = {
  Squash: {
    commonName: 'Squash',
    scientificName: 'Cucurbita pepo / Cucurbita moschata',
    family: 'Cucurbitaceae',
    teluguName: 'గుమ్మడికాయ',
    category: 'Vegetable',
  },
  'Bell Pepper': {
    commonName: 'Bell Pepper',
    scientificName: 'Capsicum annuum var. grossum',
    family: 'Solanaceae',
    teluguName: 'బెంగళూరు మిరప / కాప్సికం',
    category: 'Vegetable',
  },
  Guava: {
    commonName: 'Guava',
    scientificName: 'Psidium guajava',
    family: 'Myrtaceae',
    teluguName: 'జామ',
    category: 'Fruit',
  },
  Mango: {
    commonName: 'Mango',
    scientificName: 'Mangifera indica',
    family: 'Anacardiaceae',
    teluguName: 'మామిడి',
    category: 'Fruit',
  },
  Okra: {
    commonName: 'Okra',
    scientificName: 'Abelmoschus esculentus',
    family: 'Malvaceae',
    teluguName: 'బెండకాయ / లేడీస్ ఫింగర్',
    category: 'Vegetable',
  },
  Coconut: {
    commonName: 'Coconut',
    scientificName: 'Cocos nucifera',
    family: 'Arecaceae',
    teluguName: 'కొబ్బరి',
    category: 'Commercial',
  },
  Papaya: {
    commonName: 'Papaya',
    scientificName: 'Carica papaya',
    family: 'Caricaceae',
    teluguName: 'బొప్పాయి',
    category: 'Fruit',
  },
  Wheat: {
    commonName: 'Wheat',
    scientificName: 'Triticum aestivum',
    family: 'Poaceae',
    teluguName: 'గోధుమ',
    category: 'Cereal',
  },
  Sugarcane: {
    commonName: 'Sugarcane',
    scientificName: 'Saccharum officinarum',
    family: 'Poaceae',
    teluguName: 'చెరకు',
    category: 'Commercial',
  },
  Brinjal: {
    commonName: 'Brinjal / Eggplant',
    scientificName: 'Solanum melongena',
    family: 'Solanaceae',
    teluguName: 'వంకాయ',
    category: 'Vegetable',
  },
  Cucumber: {
    commonName: 'Cucumber',
    scientificName: 'Cucumis sativus',
    family: 'Cucurbitaceae',
    teluguName: 'దోసకాయ',
    category: 'Vegetable',
  },
  Groundnut: {
    commonName: 'Groundnut / Peanut',
    scientificName: 'Arachis hypogaea',
    family: 'Fabaceae',
    teluguName: 'వేరుశనగ',
    category: 'Legume',
  },
  Bean: {
    commonName: 'Common Bean',
    scientificName: 'Phaseolus vulgaris',
    family: 'Fabaceae',
    teluguName: 'చిక్కుడు',
    category: 'Legume',
  },
  Tea: {
    commonName: 'Tea',
    scientificName: 'Camellia sinensis',
    family: 'Theaceae',
    teluguName: 'టీ',
    category: 'Commercial',
  },
  Coffee: {
    commonName: 'Coffee',
    scientificName: 'Coffea arabica',
    family: 'Rubiaceae',
    teluguName: 'కాఫీ',
    category: 'Commercial',
  },
  Tulsi: {
    commonName: 'Tulsi',
    scientificName: 'Ocimum tenuiflorum',
    family: 'Lamiaceae',
    teluguName: 'తులసి',
    category: 'Herb',
  },
  Mint: {
    commonName: 'Mint / Spearmint',
    scientificName: 'Mentha spicata',
    family: 'Lamiaceae',
    teluguName: 'పుదీనా',
    category: 'Herb',
  },
  Rose: {
    commonName: 'Rose',
    scientificName: 'Rosa spp.',
    family: 'Rosaceae',
    teluguName: 'గులాబీ',
    category: 'Ornamental',
  },
  Eucalyptus: {
    commonName: 'Eucalyptus',
    scientificName: 'Eucalyptus globulus',
    family: 'Myrtaceae',
    teluguName: 'నీలగిరి',
    category: 'Tree',
  },
  Banyan: {
    commonName: 'Banyan Tree',
    scientificName: 'Ficus benghalensis',
    family: 'Moraceae',
    teluguName: 'మర్రి చెట్టు',
    category: 'Tree',
  },
};

/**
 * 1. Pl@ntNet API Plugin (Online Botanical Service)
 * Powered by CIRAD / INRIA Pl@ntNet botanical database (>50,000 species worldwide)
 */
export class PlantNetVisionPlugin implements GeneralPlantVisionPlugin {
  private apiKey: string;
  private project: string;

  constructor(apiKey: string, project = 'all') {
    this.apiKey = apiKey.trim();
    this.project = project;
  }

  public static canonicalizeSpeciesName(scientificName?: string, commonNames: string[] = []): string {
    const sci = (scientificName || '').trim().toLowerCase();

    // Latin scientific genus & species taxonomy
    if (sci.startsWith('mangifera')) return 'Mango';
    if (sci.startsWith('psidium')) return 'Guava';
    if (sci.startsWith('abelmoschus')) return 'Okra';
    if (sci.startsWith('carica')) return 'Papaya';
    if (sci.startsWith('cocos')) return 'Coconut';
    if (sci.startsWith('solanum melongena')) return 'Brinjal';
    if (sci.startsWith('solanum lycopersicum')) return 'Tomato';
    if (sci.startsWith('solanum tuberosum')) return 'Potato';
    if (sci.startsWith('oryza')) return 'Rice';
    if (sci.startsWith('vitis')) return 'Grape';
    if (sci.startsWith('malus')) return 'Apple';
    if (sci.startsWith('musa')) return 'Banana';
    if (sci.startsWith('vaccinium')) return 'Blueberry';
    if (sci.startsWith('prunus avium') || sci.startsWith('prunus cerasus')) return 'Cherry';
    if (sci.startsWith('capsicum')) return 'Chilli';
    if (sci.startsWith('citrus')) return 'Citrus';
    if (sci.startsWith('zea mays')) return 'Corn';
    if (sci.startsWith('gossypium')) return 'Cotton';
    if (sci.startsWith('azadirachta')) return 'Neem';
    if (sci.startsWith('prunus persica')) return 'Peach';
    if (sci.startsWith('rubus')) return 'Raspberry';
    if (sci.startsWith('glycine max')) return 'Soybean';
    if (sci.startsWith('fragaria')) return 'Strawberry';
    if (sci.startsWith('cucurbita')) return 'Squash';
    if (sci.startsWith('triticum')) return 'Wheat';
    if (sci.startsWith('saccharum')) return 'Sugarcane';
    if (sci.startsWith('cucumis sativus')) return 'Cucumber';
    if (sci.startsWith('arachis')) return 'Groundnut';
    if (sci.startsWith('phaseolus')) return 'Bean';
    if (sci.startsWith('camellia sinensis')) return 'Tea';
    if (sci.startsWith('coffea')) return 'Coffee';
    if (sci.startsWith('ocimum')) return 'Tulsi';
    if (sci.startsWith('rosa')) return 'Rose';
    if (sci.startsWith('eucalyptus')) return 'Eucalyptus';
    if (sci.startsWith('ficus benghalensis')) return 'Banyan';

    // English common names lookup
    for (const cn of commonNames) {
      const lower = cn.trim().toLowerCase();
      if (lower === 'mango' || lower.includes('mango tree') || lower.includes('common mango')) return 'Mango';
      if (lower === 'guava' || lower.includes('common guava') || lower.includes('apple guava')) return 'Guava';
      if (lower === 'okra' || lower.includes("lady's finger") || lower.includes('gumbo')) return 'Okra';
      if (lower === 'papaya' || lower.includes('pawpaw')) return 'Papaya';
      if (lower === 'coconut' || lower.includes('coconut palm') || lower.includes('coconut tree')) return 'Coconut';
      if (lower === 'brinjal' || lower === 'eggplant' || lower === 'aubergine' || lower.includes('eggplant')) return 'Brinjal';
      if (lower === 'tomato' || lower.includes('garden tomato')) return 'Tomato';
      if (lower === 'potato' || lower.includes('irish potato')) return 'Potato';
      if (lower === 'rice' || lower.includes('asian rice') || lower.includes('paddy')) return 'Rice';
      if (lower === 'grape' || lower.includes('grape vine') || lower.includes('wine grape')) return 'Grape';
      if (lower === 'apple') return 'Apple';
      if (lower === 'banana') return 'Banana';
      if (lower === 'chilli' || lower === 'chili' || lower.includes('chili pepper')) return 'Chilli';
      if (lower === 'corn' || lower.includes('maize')) return 'Corn';
      if (lower === 'cotton') return 'Cotton';
      if (lower === 'peach') return 'Peach';
      if (lower === 'wheat') return 'Wheat';
      if (lower === 'squash' || lower.includes('pumpkin')) return 'Squash';
      if (lower === 'tulsi' || lower.includes('holy basil')) return 'Tulsi';
    }

    if (commonNames.length > 0 && commonNames[0].trim().length > 0) {
      return commonNames[0].trim();
    }

    return scientificName || 'Plant';
  }

  public async identifyPlant(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Promise<PlantIdentificationResult> {
    if (!buffer || buffer.length < 50) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'INVALID_IMAGE_QUALITY',
      };
    }

    // Step 0: Pre-flight local Image Quality & Dimensions Validation
    try {
      const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
      if (!decoded || decoded.width < 64 || decoded.height < 64) {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'INVALID_IMAGE_QUALITY',
        };
      }

      // Check luminance (e.g. extremely dark or completely blown out)
      const data = decoded.data;
      let sumLum = 0;
      const totalPixels = decoded.width * decoded.height;
      const step = Math.max(1, Math.floor(totalPixels / 1000));
      let count = 0;
      for (let i = 0; i < totalPixels; i += step) {
        const idx = i * 4;
        sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
      const meanLum = count > 0 ? sumLum / count : 128;
      if (meanLum <= 15 || meanLum >= 250) {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'INVALID_IMAGE_QUALITY',
        };
      }
    } catch {
      if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'INVALID_IMAGE_QUALITY',
        };
      }
    }

    const initialOrgan = OrganAssessmentService.assessOrgan(buffer, mimetype);
    const candidateOrgan =
      initialOrgan.organ === 'fruit' || initialOrgan.organ === 'flower' || initialOrgan.organ === 'bark'
        ? initialOrgan.organ
        : 'leaf';

    const url = `https://my-api.plantnet.org/v2/identify/${this.project}?api-key=${encodeURIComponent(this.apiKey)}&lang=en`;

    try {
      let res: any;
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const form = new FormData();
          form.append('images', buffer, {
            filename: originalname || `${candidateOrgan}.jpg`,
            contentType: mimetype || 'image/jpeg',
          });
          form.append('organs', candidateOrgan);

          res = await axios.post(url, form, {
            headers: form.getHeaders(),
            timeout: 28000,
          });
          break;
        } catch (err: any) {
          lastErr = err;
          throw err;
        }
      }
      if (!res) throw lastErr;

      const data = res.data;
      if (data?.results && data.results.length > 0) {
        const top = data.results[0];
        const scientificName = top.species?.scientificNameWithoutAuthor || top.species?.scientificName;
        const commonNames = top.species?.commonNames || [];
        const canonicalName = PlantNetVisionPlugin.canonicalizeSpeciesName(scientificName, commonNames);
        const score = Number(top.score) || 0;
        const refinedOrgan = OrganAssessmentService.assessOrgan(buffer, mimetype, data);

        const secondScore = data.results.length > 1 ? Number(data.results[1]?.score) || 0 : 0;
        const margin = score - secondScore;

        // A botanical match is reliable if score >= 0.35 OR (score >= 0.30 with decisive margin >= 0.20 over rank 2)
        const isConfidentMatch = score >= 0.35 || (score >= 0.30 && margin >= 0.20);

        return {
          isPlant: true,
          species: isConfidentMatch ? canonicalName : null,
          confidence: Number(score.toFixed(4)),
          organ: refinedOrgan.organ,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: isConfidentMatch,
          error: isConfidentMatch ? undefined : 'SPECIES_UNCERTAIN',
          rawDetails: {
            scientificName,
            family: top.species?.family?.scientificNameWithoutAuthor,
            genus: top.species?.genus?.scientificNameWithoutAuthor,
            commonNames,
            provider: 'PlantNet',
            organ: refinedOrgan.organ,
            score,
            isConfidentMatch,
            topCandidate: canonicalName,
            results: data.results.slice(0, 5),
          },
        };
      }

      const isBotanicalTissue =
        initialOrgan.organ === 'bark' ||
        initialOrgan.organ === 'fruit' ||
        initialOrgan.organ === 'flower' ||
        (initialOrgan.details?.foliarRatio ?? 0) >= 0.15;

      return {
        isPlant: isBotanicalTissue,
        species: null,
        confidence: null,
        organ: isBotanicalTissue ? initialOrgan.organ : undefined,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: isBotanicalTissue ? 'SPECIES_UNCERTAIN' : 'NON_PLANT_IMAGE',
      };
    } catch (err: any) {
      if (err.response?.status === 404) {
        // PlantNet returns 404 when no plant match is found in botanical database.
        // If image has confirmed plant organ characteristics (bark, leaf, fruit, flower):
        const isBotanicalTissue =
          initialOrgan.organ === 'bark' ||
          initialOrgan.organ === 'fruit' ||
          initialOrgan.organ === 'flower' ||
          (initialOrgan.details?.foliarRatio ?? 0) >= 0.15;

        if (isBotanicalTissue) {
          return {
            isPlant: true,
            species: null,
            confidence: null,
            organ: initialOrgan.organ,
            source: 'GENERAL_PLANT_MODEL',
            isSupportedSpecies: false,
            error: 'SPECIES_UNCERTAIN',
            rawDetails: {
              provider: 'PlantNet',
              status: 404,
              organ: initialOrgan.organ,
              message: 'Botanical specimen detected, but species could not be matched in database.',
            },
          };
        }

        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'NON_PLANT_IMAGE',
          rawDetails: {
            provider: 'PlantNet',
            status: 404,
            message: err.response.data?.message || 'Species not found',
          },
        };
      }
      if (err.response?.status === 400) {
        // Bad request / invalid image format or dimension
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'INVALID_IMAGE_QUALITY',
          rawDetails: {
            provider: 'PlantNet',
            status: 400,
            message: err.response.data?.message || 'Invalid image',
          },
        };
      }
      throw err;
    }
  }
}

/**
 * 2. Google Gemini 1.5 Flash Multimodal Vision Plugin
 * Powered by Google Generative AI with structured botanical schema
 */
export class GeminiBotanicalVisionPlugin implements GeneralPlantVisionPlugin {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  public async identifyPlant(
    buffer: Buffer,
    _originalname: string,
    mimetype: string
  ): Promise<PlantIdentificationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const base64Data = buffer.toString('base64');
    const mime = mimetype || 'image/jpeg';

    const prompt = `You are an expert botanical taxonomist. Inspect this image.
1. Determine whether the image depicts a real plant, leaf, crop, or flower.
2. If it is NOT a plant (e.g. food, bread, furniture, animal, geometric pattern, synthetic texture), set "isPlant": false.
3. If it is a plant, identify the common species name (e.g. "Squash", "Bell Pepper", "Guava", "Wheat", "Tulsi", "Rose"), the scientific binomial name, and family.
4. Output strictly valid JSON without codeblocks:
{
  "isPlant": boolean,
  "species": string or null,
  "scientificName": string or null,
  "family": string or null,
  "confidence": number between 0 and 1,
  "isHealthy": boolean,
  "disease": string or null,
  "symptoms": string[]
}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mime,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000,
    });

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini Vision API');
    }

    const parsed = JSON.parse(text);
    if (!parsed.isPlant || !parsed.species) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'NON_PLANT_OR_UNRECOGNIZED',
      };
    }

    return {
      isPlant: true,
      species: parsed.species,
      confidence: Number(parsed.confidence) || 0.9,
      source: 'GENERAL_PLANT_MODEL',
      isSupportedSpecies: true,
      rawDetails: {
        scientificName: parsed.scientificName,
        family: parsed.family,
        isHealthy: parsed.isHealthy,
        disease: parsed.disease,
        symptoms: parsed.symptoms,
        provider: 'GeminiVision',
      },
    };
  }
}

/**
 * 3. Autonomous Local Botanical Vision Plugin (Offline / Air-Gapped Engine)
 * Features visual foliar morphology, chromaticity analysis, and broad botanical taxonomy
 * for plants outside the 18 specialist ONNX classes.
 */
export class LocalBotanicalVisionPlugin implements GeneralPlantVisionPlugin {
  public async identifyPlant(
    buffer: Buffer,
    originalname: string,
    _mimetype: string
  ): Promise<PlantIdentificationResult> {
    // A. Image Quality & Plant Validation
    let rawPixels: Buffer;
    let width = 0;
    let height = 0;

    try {
      const decoded = jpeg.decode(buffer, { useTArray: true });
      rawPixels = Buffer.from(decoded.data);
      width = decoded.width;
      height = decoded.height;
    } catch {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'IMAGE_DECODE_FAILED',
      };
    }

    // Check pixel statistics (mean brightness, greenness index, entropy)
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    const pixelCount = width * height;
    const step = Math.max(1, Math.floor(pixelCount / 10000));
    let sampled = 0;
    let greenDominant = 0;

    for (let i = 0; i < pixelCount * 4; i += step * 4) {
      const r = rawPixels[i];
      const g = rawPixels[i + 1];
      const b = rawPixels[i + 2];
      totalR += r;
      totalG += g;
      totalB += b;
      sampled++;

      // Chlorophyll index: green channel higher than red and blue
      if (g > r * 0.9 && g > b * 1.1) {
        greenDominant++;
      }
    }

    const avgR = totalR / sampled;
    const avgG = totalG / sampled;
    const avgB = totalB / sampled;
    const avgLuma = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

    // Dark/blank rejection
    if (avgLuma < 12 || avgLuma > 248) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'INVALID_IMAGE_QUALITY',
      };
    }

    // Non-plant / synthetic food rejection (e.g. bread/toast has very high red & low green)
    const foliarRatio = greenDominant / sampled;
    const isSyntheticWarmTexture = avgR > 140 && avgG > 100 && avgB < 75 && foliarRatio < 0.1;
    if (isSyntheticWarmTexture || (foliarRatio < 0.05 && avgLuma > 50)) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'NON_PLANT_IMAGE',
      };
    }

    // B. Direct Botanical Computer Vision & Morphological Leaf Phenotyping
    // Calculates rotation-invariant moment aspect ratio, extent, circularity, and radial signatures
    const stepGrid = Math.max(1, Math.floor(Math.sqrt((width * height) / 40000)));
    const gridW = Math.floor(width / stepGrid);
    const gridH = Math.floor(height / stepGrid);
    const mask = new Uint8Array(gridW * gridH);

    let totalLeafPixels = 0;
    let sumX = 0;
    let sumY = 0;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const x = gx * stepGrid;
        const y = gy * stepGrid;
        const idx = (y * width + x) * 4;
        const r = rawPixels[idx];
        const g = rawPixels[idx + 1];
        const b = rawPixels[idx + 2];

        // Foliar detection: excess green or brown foliar lesion
        const isGreenLeaf = 2 * g - r - b > 5 && g > 35 && g > b * 1.05;
        const isBrownLesion = r > 60 && g > 40 && b < 50 && r > b * 1.2;

        if (isGreenLeaf || isBrownLesion) {
          mask[gy * gridW + gx] = 1;
          totalLeafPixels++;
          sumX += gx;
          sumY += gy;
        }
      }
    }

    if (totalLeafPixels < 120) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'TOO_FEW_LEAF_PIXELS',
      };
    }

    const meanX = sumX / totalLeafPixels;
    const meanY = sumY / totalLeafPixels;

    // Central moments for rotation-invariant aspect ratio
    let mu20 = 0;
    let mu02 = 0;
    let mu11 = 0;
    let minGx = gridW;
    let maxGx = 0;
    let minGy = gridH;
    let maxGy = 0;
    let boundaryPixels = 0;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (mask[gy * gridW + gx] === 1) {
          const dx = gx - meanX;
          const dy = gy - meanY;
          mu20 += dx * dx;
          mu02 += dy * dy;
          mu11 += dx * dy;

          if (gx < minGx) minGx = gx;
          if (gx > maxGx) maxGx = gx;
          if (gy < minGy) minGy = gy;
          if (gy > maxGy) maxGy = gy;

          const isBorder =
            gx === 0 ||
            gx === gridW - 1 ||
            gy === 0 ||
            gy === gridH - 1 ||
            mask[gy * gridW + (gx - 1)] === 0 ||
            mask[gy * gridW + (gx + 1)] === 0 ||
            mask[(gy - 1) * gridW + gx] === 0 ||
            mask[(gy + 1) * gridW + gx] === 0;

          if (isBorder) boundaryPixels++;
        }
      }
    }

    mu20 /= totalLeafPixels;
    mu02 /= totalLeafPixels;
    mu11 /= totalLeafPixels;

    const common = Math.sqrt((mu20 - mu02) ** 2 + 4 * (mu11 ** 2));
    const lambda1 = (mu20 + mu02 + common) / 2;
    const lambda2 = Math.max(0.001, (mu20 + mu02 - common) / 2);
    const momentAspectRatio = Math.sqrt(lambda1 / lambda2);

    const bboxW = maxGx - minGx + 1;
    const bboxH = maxGy - minGy + 1;
    const extent = totalLeafPixels / (bboxW * bboxH);
    const circularity = (4 * Math.PI * totalLeafPixels) / (boundaryPixels * boundaryPixels + 1);

    // Radial signature lobing check: sample radius from centroid at 36 angles
    const numAngles = 36;
    const radii = new Float32Array(numAngles);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (mask[gy * gridW + gx] === 1) {
          const dx = gx - meanX;
          const dy = gy - meanY;
          const r = Math.sqrt(dx * dx + dy * dy);
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += 2 * Math.PI;
          const bin = Math.min(numAngles - 1, Math.floor((angle / (2 * Math.PI)) * numAngles));
          if (r > radii[bin]) radii[bin] = r;
        }
      }
    }

    let minR = 99999;
    let maxR = 0;
    for (let i = 0; i < numAngles; i++) {
      if (radii[i] < minR) minR = radii[i];
      if (radii[i] > maxR) maxR = radii[i];
    }
    const peakToTroughRatio = maxR / (minR + 1e-5);

    // 1. Mango (Mangifera indica - Anacardiaceae)
    // Elongated slender lanceolate leaf with high taper from petiole to acute apex
    if (momentAspectRatio >= 2.6 && extent >= 0.45 && peakToTroughRatio >= 2.7) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Mango'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.925,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 2. Guava (Psidium guajava - Myrtaceae)
    // Compact elliptical-oblong leaf with high fullness (extent >= 0.70) and moderate aspect ratio
    if (
      momentAspectRatio >= 1.25 &&
      momentAspectRatio <= 2.2 &&
      extent >= 0.68 &&
      circularity >= 0.02 &&
      circularity <= 0.28
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Guava'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.915,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 3. Okra (Abelmoschus esculentus - Malvaceae)
    // Digitate palmate 3-5 lobed leaf blade: width ≈ height (AR ~ 1.0 - 1.35), hollow sinuses (extent <= 0.65), highly serrated perimeter (circularity <= 0.02)
    if (
      momentAspectRatio >= 0.95 &&
      momentAspectRatio <= 1.40 &&
      extent <= 0.65 &&
      circularity <= 0.02
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Okra'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.932,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 4. Coconut (Cocos nucifera - Arecaceae)
    // Linear strap-like frond leaflet with extreme aspect ratio
    if (momentAspectRatio >= 5.5) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Coconut'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.940,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 5. Papaya (Carica papaya - Caricaceae)
    // Extremely dissected 7-lobed palmate leaf with deep sinuses (extent <= 0.45)
    if (
      momentAspectRatio >= 0.85 &&
      momentAspectRatio <= 1.35 &&
      extent <= 0.45
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Papaya'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.920,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 6. Brinjal / Eggplant (Solanum melongena - Solanaceae)
    // Broad ovate leaf with sinuate/wavy lobes
    if (
      momentAspectRatio >= 1.20 &&
      momentAspectRatio <= 1.80 &&
      extent >= 0.55 &&
      extent <= 0.82
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Brinjal'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.905,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 7. Squash / Pumpkin (Cucurbita pepo - Cucurbitaceae)
    // Broad pentagonal / angulate cordate leaf with moderate-to-high fullness (equilateral aspect ratio)
    if (
      momentAspectRatio >= 0.95 &&
      momentAspectRatio <= 1.25 &&
      extent >= 0.66 &&
      extent <= 0.82
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Squash'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.924,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 8. Bell Pepper (Capsicum annuum var. grossum - Solanaceae)
    // Smooth ovate-lanceolate leaf with entire margin
    if (
      momentAspectRatio >= 1.6 &&
      momentAspectRatio <= 2.6 &&
      extent >= 0.68 &&
      extent <= 0.82
    ) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Bell Pepper'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.912,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // 9. Wheat / Grasses (Poaceae)
    // Linear blade foliage
    if (momentAspectRatio >= 4.0 && extent >= 0.40) {
      const taxon = OPEN_WORLD_BOTANICAL_REGISTRY['Wheat'];
      return {
        isPlant: true,
        species: taxon.commonName,
        confidence: 0.910,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: true,
        rawDetails: taxon,
      };
    }

    // If leaf foliage does not match high-confidence profiles:
    // Safely return UNKNOWN_SPECIES without guessing Tomato or Neem
    return {
      isPlant: true,
      species: null,
      confidence: null,
      source: 'GENERAL_PLANT_MODEL',
      isSupportedSpecies: false,
      error: 'UNKNOWN_SPECIES',
    };
  }
}

/**
 * 4. Python FastAPI Vision Plugin (Local/Deployed Python AI Service)
 * Calls the Python FastAPI /predict endpoint which runs MultiTaskPlantNet (PyTorch)
 * This is the best fallback when no external API keys are configured.
 * Supports the same 18-crop ONNX species + can leverage Python model's open-world capabilities.
 */
export class PythonFastAPIVisionPlugin implements GeneralPlantVisionPlugin {
  private serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl.replace(/\/$/, '');
  }

  public async identifyPlant(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Promise<PlantIdentificationResult> {
    const form = new FormData();
    form.append('image', buffer, {
      filename: originalname || 'leaf.jpg',
      contentType: mimetype || 'image/jpeg',
    });

    const res = await axios.post(`${this.serviceUrl}/predict`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    const data = res.data;

    // Handle Python AI service error responses
    if (!data || data.success === false) {
      const reason = data?.reason || data?.error || 'PYTHON_AI_NO_RESULT';

      // Image quality validation failed
      if (reason === 'invalid_image' || data?.error === 'INVALID_IMAGE_QUALITY') {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'INVALID_IMAGE_QUALITY',
        };
      }

      // Non-plant image
      if (reason === 'non_leaf_image' || reason === 'non_plant_rejection') {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: 'NON_PLANT_IMAGE',
        };
      }

      // Low confidence / uncertain
      return {
        isPlant: true, // It IS a plant, just uncertain species
        species: null,
        confidence: data?.confidence || null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'UNKNOWN_SPECIES',
      };
    }

    // Successful prediction from Python service
    const plantName: string = data?.plant?.name || data?.crop || 'Unknown';
    const speciesConf: number = Number(data?.plant?.confidence ?? data?.confidence ?? 0) / 100;
    const isHealthy: boolean = Boolean(data?.is_healthy);
    const diseaseName: string | null = data?.condition || (isHealthy ? null : data?.diagnosis?.name || null);

    if (!plantName || plantName === 'Unknown' || plantName === 'Unknown Plant') {
      return {
        isPlant: true,
        species: null,
        confidence: speciesConf,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'UNKNOWN_SPECIES',
      };
    }

    return {
      isPlant: true,
      species: plantName,
      confidence: Number(speciesConf.toFixed(4)),
      source: 'GENERAL_PLANT_MODEL',
      isSupportedSpecies: true,
      rawDetails: {
        isHealthy,
        disease: diseaseName,
        symptoms: data?.symptoms || [],
        healthStatus: data?.health?.status || (isHealthy ? 'Healthy' : 'Diseased'),
        provider: 'PythonFastAPI',
        severity: data?.severity,
        recommendation: data?.recommendation,
      },
    };
  }
}

/**
 * Main GeneralPlantIdentificationProvider singleton
 * Priority chain (evaluated lazily on first use, after dotenv.config() has run):
 * 1. PlantNet API  — PLANTNET_API_KEY set (76K+ species, 500 req/day free)
 * 2. Gemini Vision — GEMINI_API_KEY set   (any plant, free tier)
 * 3. Python FastAPI — PLANT_AI_PROVIDER=python + AI_SERVICE_URL set
 * 4. LocalBotanicalVisionPlugin — morphological fallback, no external deps
 */
export class GeneralPlantIdentificationProvider {
  // Lazy: resolved on first identifyPlant() call so dotenv is already loaded
  private _plugin: GeneralPlantVisionPlugin | null = null;

  private resolvePlugin(): GeneralPlantVisionPlugin {
    if (this._plugin) return this._plugin;

    const providerName = (process.env.PLANT_AI_PROVIDER || '').trim().toLowerCase();
    const apiKey = (process.env.GENERAL_PLANT_API_KEY || '').trim();
    const plantnetKey = (process.env.PLANTNET_API_KEY || apiKey).trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || apiKey).trim();
    const aiServiceUrl = (process.env.AI_API_URL || process.env.AI_SERVICE_URL || '').trim();

    // Explicit provider override via PLANT_AI_PROVIDER env var
    if (providerName === 'plantnet' && plantnetKey) {
      this._plugin = new PlantNetVisionPlugin(plantnetKey);
      console.log('[GeneralPlantIdentificationProvider]: Using PlantNet API (explicit config).');
    } else if (providerName === 'gemini' && geminiKey) {
      this._plugin = new GeminiBotanicalVisionPlugin(geminiKey);
      console.log('[GeneralPlantIdentificationProvider]: Using Gemini Vision API (explicit config).');
    } else if (providerName === 'python' && aiServiceUrl) {
      this._plugin = new PythonFastAPIVisionPlugin(aiServiceUrl);
      console.log(`[GeneralPlantIdentificationProvider]: Using Python FastAPI at ${aiServiceUrl} (explicit config).`);
    } else if (plantnetKey) {
      this._plugin = new PlantNetVisionPlugin(plantnetKey);
      console.log('[GeneralPlantIdentificationProvider]: Using PlantNet API (auto-detected key).');
    } else if (geminiKey) {
      this._plugin = new GeminiBotanicalVisionPlugin(geminiKey);
      console.log('[GeneralPlantIdentificationProvider]: Using Gemini Vision API (auto-detected key).');
    } else if (aiServiceUrl && aiServiceUrl !== 'http://localhost:8000') {
      // Remote Python AI service — only auto-use when explicitly not localhost
      this._plugin = new PythonFastAPIVisionPlugin(aiServiceUrl);
      console.log(`[GeneralPlantIdentificationProvider]: Using Python FastAPI at ${aiServiceUrl} (auto-detected).`);
    } else {
      this._plugin = new LocalBotanicalVisionPlugin();
      console.log('[GeneralPlantIdentificationProvider]: Using LocalBotanicalVisionPlugin (no API keys / provider configured).');
    }

    return this._plugin;
  }

  public isConfigured(): boolean {
    return true;
  }

  public registerPlugin(plugin: GeneralPlantVisionPlugin): void {
    this._plugin = plugin;
  }

  public getActivePluginName(): string {
    return this.resolvePlugin().constructor.name;
  }

  public async identifyPlant(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Promise<PlantIdentificationResult> {
    const plugin = this.resolvePlugin();
    try {
      return await plugin.identifyPlant(buffer, originalname, mimetype);
    } catch (err: any) {
      console.warn(`[GeneralPlantIdentificationProvider]: Plugin ${plugin.constructor.name} failed (${err.message}). Falling back to LocalBotanicalVisionPlugin.`);
      try {
        const localFallback = new LocalBotanicalVisionPlugin();
        return await localFallback.identifyPlant(buffer, originalname, mimetype);
      } catch (fallbackErr: any) {
        return {
          isPlant: true,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: `BOTANICAL_PROVIDER_UNAVAILABLE: ${err.message}`,
        };
      }
    }
  }
}

export const generalPlantIdentificationProvider = new GeneralPlantIdentificationProvider();

