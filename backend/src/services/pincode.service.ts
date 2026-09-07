import axios from 'axios';

export interface PincodeLookupResult {
  success: boolean;
  pincode: string;
  state: string;
  district: string;
  city: string;
  postOfficeName?: string;
  offices?: string[];
  source?: string;
  message?: string;
}

// In-memory cache for fast, repeated lookups
const pincodeCache = new Map<string, { data: PincodeLookupResult; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Common agricultural / district seeds for guaranteed instant offline fallback
const LOCAL_PINCODE_SEEDS: Record<string, { state: string; district: string; city: string }> = {
  // Andhra Pradesh
  '518001': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Kurnool' },
  '518002': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Kurnool' },
  '518003': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Kurnool' },
  '518004': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Kurnool' },
  '518301': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Adoni' },
  '518302': { state: 'Andhra Pradesh', district: 'Kurnool', city: 'Adoni' },
  '518501': { state: 'Andhra Pradesh', district: 'Nandyal', city: 'Nandyal' },
  '522001': { state: 'Andhra Pradesh', district: 'Guntur', city: 'Guntur' },
  '522002': { state: 'Andhra Pradesh', district: 'Guntur', city: 'Guntur' },
  '522003': { state: 'Andhra Pradesh', district: 'Guntur', city: 'Guntur' },
  '520001': { state: 'Andhra Pradesh', district: 'Krishna', city: 'Vijayawada' },
  '515001': { state: 'Andhra Pradesh', district: 'Anantapur', city: 'Anantapur' },
  '516001': { state: 'Andhra Pradesh', district: 'YSR Kadapa', city: 'Kadapa' },
  '517501': { state: 'Andhra Pradesh', district: 'Tirupati', city: 'Tirupati' },
  '530001': { state: 'Andhra Pradesh', district: 'Visakhapatnam', city: 'Visakhapatnam' },
  '533001': { state: 'Andhra Pradesh', district: 'Kakinada', city: 'Kakinada' },
  '534001': { state: 'Andhra Pradesh', district: 'Eluru', city: 'Eluru' },
  '524001': { state: 'Andhra Pradesh', district: 'Nellore', city: 'Nellore' },

  // Karnataka
  '560001': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru' },
  '560002': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru' },
  '560038': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru' },
  '561203': { state: 'Karnataka', district: 'Bangalore Rural', city: 'Doddaballapura' },
  '583227': { state: 'Karnataka', district: 'Koppal', city: 'Gangavathi' },
  '583231': { state: 'Karnataka', district: 'Koppal', city: 'Koppal' },
  '584128': { state: 'Karnataka', district: 'Raichur', city: 'Sindhanur' },
  '584101': { state: 'Karnataka', district: 'Raichur', city: 'Raichur' },
  '577598': { state: 'Karnataka', district: 'Chitradurga', city: 'Hiriyur' },
  '577501': { state: 'Karnataka', district: 'Chitradurga', city: 'Chitradurga' },
  '585327': { state: 'Karnataka', district: 'Bidar', city: 'Basavakalyan' },
  '585401': { state: 'Karnataka', district: 'Bidar', city: 'Bidar' },
  '583101': { state: 'Karnataka', district: 'Ballari', city: 'Ballari' },
  '570001': { state: 'Karnataka', district: 'Mysuru', city: 'Mysuru' },
  '580001': { state: 'Karnataka', district: 'Dharwad', city: 'Hubballi' },
  '590001': { state: 'Karnataka', district: 'Belagavi', city: 'Belagavi' },
  '586101': { state: 'Karnataka', district: 'Vijayapura', city: 'Vijayapura' },

  // Telangana
  '500001': { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad' },
  '500081': { state: 'Telangana', district: 'Ranga Reddy', city: 'Hyderabad' },
  '506001': { state: 'Telangana', district: 'Warangal', city: 'Warangal' },
  '505001': { state: 'Telangana', district: 'Karimnagar', city: 'Karimnagar' },
  '508001': { state: 'Telangana', district: 'Nalgonda', city: 'Nalgonda' },
  '507001': { state: 'Telangana', district: 'Khammam', city: 'Khammam' },
  '503001': { state: 'Telangana', district: 'Nizamabad', city: 'Nizamabad' },
  '509001': { state: 'Telangana', district: 'Mahabubnagar', city: 'Mahabubnagar' },

  // Maharashtra
  '400001': { state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai' },
  '411001': { state: 'Maharashtra', district: 'Pune', city: 'Pune' },
  '440001': { state: 'Maharashtra', district: 'Nagpur', city: 'Nagpur' },
  '422001': { state: 'Maharashtra', district: 'Nashik', city: 'Nashik' },
  '431001': { state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar', city: 'Chhatrapati Sambhajinagar' },
  '444601': { state: 'Maharashtra', district: 'Amravati', city: 'Amravati' },
  '444001': { state: 'Maharashtra', district: 'Akola', city: 'Akola' },
  '416001': { state: 'Maharashtra', district: 'Kolhapur', city: 'Kolhapur' },
  '413001': { state: 'Maharashtra', district: 'Solapur', city: 'Solapur' },
  '414001': { state: 'Maharashtra', district: 'Ahmednagar', city: 'Ahmednagar' },

  // Tamil Nadu, Delhi, Punjab, MP, etc.
  '600001': { state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai' },
  '641001': { state: 'Tamil Nadu', district: 'Coimbatore', city: 'Coimbatore' },
  '110001': { state: 'Delhi', district: 'New Delhi', city: 'New Delhi' },
  '141001': { state: 'Punjab', district: 'Ludhiana', city: 'Ludhiana' },
  '462001': { state: 'Madhya Pradesh', district: 'Bhopal', city: 'Bhopal' },
  '452001': { state: 'Madhya Pradesh', district: 'Indore', city: 'Indore' },
  '302001': { state: 'Rajasthan', district: 'Jaipur', city: 'Jaipur' },
  '380001': { state: 'Gujarat', district: 'Ahmedabad', city: 'Ahmedabad' },
  '226001': { state: 'Uttar Pradesh', district: 'Lucknow', city: 'Lucknow' },
};

export class PincodeService {
  /**
   * Validate Indian 6-digit Pincode format
   */
  public static isValidPincode(pincode: string): boolean {
    const clean = (pincode || '').toString().trim();
    return /^[1-9][0-9]{5}$/.test(clean);
  }

  /**
   * Lookup Indian Pincode with Multi-Tier Fallback Engine
   */
  public static async lookup(rawPincode: string): Promise<PincodeLookupResult> {
    const pincode = (rawPincode || '').toString().trim();

    if (!this.isValidPincode(pincode)) {
      return {
        success: false,
        pincode,
        state: '',
        district: '',
        city: '',
        message: 'Invalid pincode. Please enter a valid 6-digit Indian PIN code.',
      };
    }

    // 1. Check in-memory cache
    const cached = pincodeCache.get(pincode);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data };
    }

    // 2. Tier 1: Official India Post API (api.postalpincode.in)
    try {
      const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
        timeout: 4500,
        headers: {
          'User-Agent': 'AgroMitra-PincodeLookup/2.0',
        },
      });

      const resData = response.data;
      if (Array.isArray(resData) && resData.length > 0) {
        const item = resData[0];
        if (item.Status === 'Success' && Array.isArray(item.PostOffice) && item.PostOffice.length > 0) {
          const poList = item.PostOffice;
          const primary = poList[0];

          const state = primary.State || primary.Circle || '';
          const district = primary.District || primary.Division || '';
          const city = primary.Block || primary.Name || primary.Division || district;
          const offices = poList.map((p: any) => p.Name).filter(Boolean);

          const result: PincodeLookupResult = {
            success: true,
            pincode,
            state,
            district,
            city,
            postOfficeName: primary.Name,
            offices: offices.slice(0, 8),
            source: 'India Post Official API',
          };

          pincodeCache.set(pincode, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
          return result;
        }
      }
    } catch (err: any) {
      console.warn(`[PincodeService] Tier 1 API error for ${pincode}:`, err.message);
    }

    // 3. Tier 2: Zippopotam.us Fallback
    try {
      const zippoRes = await axios.get(`https://api.zippopotam.us/in/${pincode}`, {
        timeout: 4000,
      });

      if (zippoRes.data?.places && zippoRes.data.places.length > 0) {
        const place = zippoRes.data.places[0];
        const state = place.state || '';
        const city = place['place name'] || '';
        const district = place['state abbreviation'] || city;

        const result: PincodeLookupResult = {
          success: true,
          pincode,
          state,
          district: district || city,
          city,
          postOfficeName: city,
          offices: [city],
          source: 'Zippopotam Geocoder',
        };

        pincodeCache.set(pincode, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
      }
    } catch (err: any) {
      console.warn(`[PincodeService] Tier 2 API error for ${pincode}:`, err.message);
    }

    // 4. Tier 3: Local Regional Seed Match
    if (LOCAL_PINCODE_SEEDS[pincode]) {
      const seed = LOCAL_PINCODE_SEEDS[pincode];
      const result: PincodeLookupResult = {
        success: true,
        pincode,
        state: seed.state,
        district: seed.district,
        city: seed.city,
        postOfficeName: seed.city,
        offices: [seed.city],
        source: 'Regional Postal Directory',
      };
      pincodeCache.set(pincode, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }

    // 5. Postal Prefix Heuristic Fallback (e.g. 518xxx -> Kurnool, 560xxx -> Bengaluru, 500xxx -> Hyderabad, etc.)
    const prefix3 = pincode.substring(0, 3);
    const prefix2 = pincode.substring(0, 2);

    let heuristicState = '';
    let heuristicDistrict = '';

    if (prefix2 === '51' || prefix2 === '52' || prefix2 === '53') {
      heuristicState = 'Andhra Pradesh';
      if (prefix3 === '518') heuristicDistrict = 'Kurnool';
      else if (prefix3 === '522') heuristicDistrict = 'Guntur';
      else if (prefix3 === '520') heuristicDistrict = 'Krishna';
      else if (prefix3 === '515') heuristicDistrict = 'Anantapur';
    } else if (prefix2 === '56' || prefix2 === '57' || prefix2 === '58' || prefix2 === '59') {
      heuristicState = 'Karnataka';
      if (prefix3 === '560') heuristicDistrict = 'Bengaluru';
      else if (prefix3 === '561') heuristicDistrict = 'Bangalore Rural / Chikkaballapura';
      else if (prefix3 === '562') heuristicDistrict = 'Ramanagara / Bangalore Rural';
      else if (prefix3 === '563') heuristicDistrict = 'Kolar';
      else if (prefix3 === '570') heuristicDistrict = 'Mysuru';
      else if (prefix3 === '577') heuristicDistrict = 'Chitradurga';
      else if (prefix3 === '580') heuristicDistrict = 'Dharwad';
      else if (prefix3 === '583') heuristicDistrict = 'Koppal / Ballari';
      else if (prefix3 === '584') heuristicDistrict = 'Raichur';
      else if (prefix3 === '585') heuristicDistrict = 'Bidar';
      else if (prefix3 === '586') heuristicDistrict = 'Vijayapura';
      else if (prefix3 === '590') heuristicDistrict = 'Belagavi';
    } else if (prefix2 === '50') {
      heuristicState = 'Telangana';
      if (prefix3 === '500') heuristicDistrict = 'Hyderabad';
      else if (prefix3 === '506') heuristicDistrict = 'Warangal';
    } else if (prefix2 === '40' || prefix2 === '41' || prefix2 === '42' || prefix2 === '43' || prefix2 === '44') {
      heuristicState = 'Maharashtra';
      if (prefix3 === '400') heuristicDistrict = 'Mumbai';
      else if (prefix3 === '411') heuristicDistrict = 'Pune';
      else if (prefix3 === '440') heuristicDistrict = 'Nagpur';
    } else if (prefix2 === '60' || prefix2 === '61' || prefix2 === '62' || prefix2 === '63' || prefix2 === '64') {
      heuristicState = 'Tamil Nadu';
      if (prefix3 === '600') heuristicDistrict = 'Chennai';
      else if (prefix3 === '641') heuristicDistrict = 'Coimbatore';
      else if (prefix3 === '625') heuristicDistrict = 'Madurai';
    } else if (prefix2 === '67' || prefix2 === '68' || prefix2 === '69') {
      heuristicState = 'Kerala';
      if (prefix3 === '682') heuristicDistrict = 'Ernakulam / Kochi';
      else if (prefix3 === '695') heuristicDistrict = 'Thiruvananthapuram';
      else if (prefix3 === '673') heuristicDistrict = 'Kozhikode';
    } else if (prefix2 === '11') {
      heuristicState = 'Delhi';
      heuristicDistrict = 'Delhi / New Delhi';
    } else if (prefix2 === '12' || prefix2 === '13') {
      heuristicState = 'Haryana';
      if (prefix3 === '122') heuristicDistrict = 'Gurugram';
      else if (prefix3 === '121') heuristicDistrict = 'Faridabad';
      else if (prefix3 === '133' || prefix3 === '134') heuristicDistrict = 'Ambala / Panchkula';
    } else if (prefix2 === '14' || prefix2 === '15' || prefix2 === '16') {
      heuristicState = 'Punjab';
      if (prefix3 === '141') heuristicDistrict = 'Ludhiana';
      else if (prefix3 === '143') heuristicDistrict = 'Amritsar';
      else if (prefix3 === '160') heuristicDistrict = 'Chandigarh / Mohali';
    } else if (prefix2 === '17') {
      heuristicState = 'Himachal Pradesh';
      if (prefix3 === '171') heuristicDistrict = 'Shimla';
    } else if (prefix2 === '18' || prefix2 === '19') {
      heuristicState = 'Jammu and Kashmir';
      if (prefix3 === '190') heuristicDistrict = 'Srinagar';
      else if (prefix3 === '180') heuristicDistrict = 'Jammu';
    } else if (prefix2 === '45' || prefix2 === '46' || prefix2 === '47' || prefix2 === '48') {
      heuristicState = 'Madhya Pradesh';
      if (prefix3 === '462') heuristicDistrict = 'Bhopal';
      else if (prefix3 === '452') heuristicDistrict = 'Indore';
      else if (prefix3 === '482') heuristicDistrict = 'Jabalpur';
    } else if (prefix2 === '49') {
      heuristicState = 'Chhattisgarh';
      if (prefix3 === '492') heuristicDistrict = 'Raipur';
      else if (prefix3 === '495') heuristicDistrict = 'Bilaspur';
    } else if (prefix2 === '30' || prefix2 === '31' || prefix2 === '32' || prefix2 === '33' || prefix2 === '34') {
      heuristicState = 'Rajasthan';
      if (prefix3 === '302') heuristicDistrict = 'Jaipur';
      else if (prefix3 === '342') heuristicDistrict = 'Jodhpur';
      else if (prefix3 === '313') heuristicDistrict = 'Udaipur';
    } else if (prefix2 === '36' || prefix2 === '37' || prefix2 === '38' || prefix2 === '39') {
      heuristicState = 'Gujarat';
      if (prefix3 === '380') heuristicDistrict = 'Ahmedabad';
      else if (prefix3 === '395') heuristicDistrict = 'Surat';
      else if (prefix3 === '390') heuristicDistrict = 'Vadodara';
      else if (prefix3 === '360') heuristicDistrict = 'Rajkot';
    } else if (prefix2 === '20' || prefix2 === '21' || prefix2 === '22' || prefix2 === '23' || prefix2 === '24' || prefix2 === '25' || prefix2 === '26' || prefix2 === '27' || prefix2 === '28') {
      if (prefix3 === '248' || prefix3 === '249' || prefix3 === '263') {
        heuristicState = 'Uttarakhand';
        if (prefix3 === '248') heuristicDistrict = 'Dehradun';
        else if (prefix3 === '249') heuristicDistrict = 'Haridwar';
      } else {
        heuristicState = 'Uttar Pradesh';
        if (prefix3 === '226') heuristicDistrict = 'Lucknow';
        else if (prefix3 === '201') heuristicDistrict = 'Ghaziabad / Noida';
        else if (prefix3 === '208') heuristicDistrict = 'Kanpur';
        else if (prefix3 === '221') heuristicDistrict = 'Varanasi';
        else if (prefix3 === '282') heuristicDistrict = 'Agra';
      }
    } else if (prefix2 === '70' || prefix2 === '71' || prefix2 === '72' || prefix2 === '73' || prefix2 === '74') {
      heuristicState = 'West Bengal';
      if (prefix3 === '700') heuristicDistrict = 'Kolkata';
      else if (prefix3 === '711') heuristicDistrict = 'Howrah';
      else if (prefix3 === '734') heuristicDistrict = 'Siliguri / Darjeeling';
    } else if (prefix2 === '75' || prefix2 === '76' || prefix2 === '77') {
      heuristicState = 'Odisha';
      if (prefix3 === '751') heuristicDistrict = 'Bhubaneswar';
      else if (prefix3 === '753') heuristicDistrict = 'Cuttack';
    } else if (prefix2 === '78' || prefix2 === '79') {
      heuristicState = 'Assam & North East';
      if (prefix3 === '781') heuristicDistrict = 'Guwahati';
    } else if (prefix2 === '80' || prefix2 === '81' || prefix2 === '82' || prefix2 === '83' || prefix2 === '84' || prefix2 === '85') {
      if (prefix2 === '83' || prefix3 === '828' || prefix3 === '834' || prefix3 === '831') {
        heuristicState = 'Jharkhand';
        if (prefix3 === '834') heuristicDistrict = 'Ranchi';
        else if (prefix3 === '831') heuristicDistrict = 'Jamshedpur';
      } else {
        heuristicState = 'Bihar';
        if (prefix3 === '800') heuristicDistrict = 'Patna';
        else if (prefix3 === '823') heuristicDistrict = 'Gaya';
      }
    } else if (prefix3 === '403') {
      heuristicState = 'Goa';
      heuristicDistrict = 'North/South Goa';
    }

    if (heuristicState) {
      return {
        success: true,
        pincode,
        state: heuristicState,
        district: heuristicDistrict || 'Regional District',
        city: heuristicDistrict || 'Regional Area',
        message: 'Postal region identified. Please verify or update district/city if needed.',
        source: 'Postal Region Zone Heuristic',
      };
    }

    return {
      success: false,
      pincode,
      state: '',
      district: '',
      city: '',
      message: 'Unable to resolve pincode details automatically. Please enter state and district manually.',
    };
  }
}

export default PincodeService;
