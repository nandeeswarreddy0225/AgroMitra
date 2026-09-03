import React, { useState, useEffect, useCallback } from 'react';
import {
  Sprout,
  Sparkles,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  FlaskConical,
  Save,
  CheckCircle2,
  Calendar,
  CloudSun,
  BookmarkCheck,
} from 'lucide-react';
import {
  getSeasonalCropsApi,
  generateCropPlanApi,
  saveFarmerCropPlanApi,
  getFarmerCropPlanApi,
} from '../../services/api';
import {
  CropSeason,
  EvaluatedCropItem,
  SeasonalAdvisorResponse,
  SOIL_TYPE_OPTIONS,
  ISoilTest,
  FullCropPlanResult,
} from '../../types/cropAdvisor';
import { WeatherData } from '../../types/weather';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface SeasonalCropAdvisorCardProps {
  weather?: WeatherData | null;
  className?: string;
}

export const SeasonalCropAdvisorCard: React.FC<SeasonalCropAdvisorCardProps> = ({
  weather,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<SeasonalAdvisorResponse | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<CropSeason | undefined>(undefined);
  const [selectedSoil, setSelectedSoil] = useState<string>(''); // Default empty = "Select your soil type"
  const [showSoilTestDrawer, setShowSoilTestDrawer] = useState<boolean>(false);

  // Optional soil test state
  const [soilTest, setSoilTest] = useState<ISoilTest>({});

  // Farmer's chosen crop for creating plan
  const [chosenCropId, setChosenCropId] = useState<string>('');
  const [activeCropPlan, setActiveCropPlan] = useState<FullCropPlanResult | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Modal for individual crop details
  const [selectedCropModal, setSelectedCropModal] = useState<EvaluatedCropItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // 1. Fetch Crop Recommendations whenever Season, Soil, Location, or Weather changes
  const fetchRecommendations = useCallback(
    async (season?: CropSeason, soil?: string, test?: ISoilTest) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const state = weather?.location?.state;
        const city = weather?.location?.city;
        const temp = weather?.temperature;
        const rainProb = weather?.rainProbability;

        const res = await getSeasonalCropsApi({
          season,
          soilType: soil || undefined,
          state,
          city,
          temperature: temp,
          rainProbability: rainProb,
          pH: test?.pH,
          nitrogen: test?.nitrogen,
          phosphorus: test?.phosphorus,
          potassium: test?.potassium,
          organicCarbon: test?.organicCarbon,
          electricalConductivity: test?.electricalConductivity,
        });

        if (res.success) {
          setData(res);
          if (!selectedSeason && res.currentSeason) {
            setSelectedSeason(res.currentSeason.code);
          }
        } else {
          setErrorMsg(res.message || 'Seasonal recommendations are temporarily unavailable.');
        }
      } catch (err: any) {
        setErrorMsg('Seasonal recommendations are temporarily unavailable.');
      } finally {
        setIsLoading(false);
      }
    },
    [weather?.location?.state, weather?.location?.city, weather?.temperature, weather?.rainProbability, selectedSeason]
  );

  // Initial load: Fetch recommendations & check for saved plan in MongoDB
  useEffect(() => {
    fetchRecommendations(selectedSeason, selectedSoil, soilTest);

    if (isAuthenticated) {
      getFarmerCropPlanApi()
        .then((res) => {
          if (res.success && res.plan) {
            setSelectedSoil(res.plan.soilType || '');
            if (res.plan.soilTest) {
              setSoilTest(res.plan.soilTest);
            }
            if (res.plan.selectedCropId) {
              setChosenCropId(res.plan.selectedCropId);
            }
            if (res.plan.detailedAnalysis) {
              setActiveCropPlan(res.plan.detailedAnalysis);
            }
          }
        })
        .catch((err) => {
          console.warn('[SeasonalCropAdvisor] Failed to load saved plan:', err.message);
        });
    }
  }, [selectedSeason, selectedSoil, weather?.location?.city, isAuthenticated, fetchRecommendations]);

  // Handle Soil Selection change
  const handleSoilChange = (soil: string) => {
    setSelectedSoil(soil);
    fetchRecommendations(selectedSeason, soil, soilTest);
  };

  // Handle Generating Crop Plan
  const handleGeneratePlan = async (cropIdToPlan?: string) => {
    const targetCropId = cropIdToPlan || chosenCropId;
    if (!targetCropId) return;

    setIsGeneratingPlan(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const res = await generateCropPlanApi({
        cropId: targetCropId,
        soilType: selectedSoil || 'Other / Not Sure',
        soilTest,
        season: selectedSeason || data?.currentSeason?.code,
        state: weather?.location?.state,
        city: weather?.location?.city,
        temperature: weather?.temperature,
        rainProbability: weather?.rainProbability,
      });

      if (res.success && res.plan) {
        setActiveCropPlan(res.plan);
        setChosenCropId(targetCropId);
      } else {
        setErrorMsg(res.message || 'Unable to generate crop plan.');
      }
    } catch (err: any) {
      setErrorMsg('Unable to generate crop plan at this time.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Handle Saving Crop Plan to MongoDB
  const handleSavePlan = async () => {
    if (!activeCropPlan) return;
    setIsSavingPlan(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await saveFarmerCropPlanApi({
        soilType: selectedSoil || 'Other / Not Sure',
        soilTest,
        selectedCropId: activeCropPlan.selectedCrop.id,
        selectedCropName: activeCropPlan.selectedCrop.name,
        selectedCropIcon: activeCropPlan.selectedCrop.icon,
        season: activeCropPlan.season,
        location: {
          city: weather?.location?.city,
          state: weather?.location?.state,
          latitude: weather?.location?.latitude,
          longitude: weather?.location?.longitude,
        },
      });

      if (res.success) {
        setSaveSuccessMsg('Crop plan saved to your farm profile!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.message || 'Could not save crop plan.');
      }
    } catch (err: any) {
      setErrorMsg('Please sign in to save your crop plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const getWaterBadgeColor = (req: string) => {
    switch (req) {
      case 'High':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Medium':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Low':
      default:
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors ${className}`}
    >
      {/* 1. Header Section: Title, Location & Season */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                🌱 My Farm Planner & Seasonal Advisor
              </h2>
              {data?.currentSeason && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <span>{data.currentSeason.icon}</span>
                  <span>{data.currentSeason.name} Season</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {weather?.location?.city
                    ? `${weather.location.city}, ${weather.location.state || 'India'}`
                    : 'Location Detected'}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Current Season: <strong>{data?.currentSeason?.name || 'Kharif'}</strong></span>
              </span>
              {weather && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                    <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                    <span>{weather.temperature}°C • {weather.condition}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs */}
        {data?.allSeasons && (
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 self-start lg:self-auto text-xs font-bold">
            {data.allSeasons.map((season) => {
              const isSelected = (selectedSeason || data.currentSeason.code) === season.code;
              return (
                <button
                  key={season.code}
                  onClick={() => {
                    setSelectedSeason(season.code);
                    fetchRecommendations(season.code, selectedSoil, soilTest);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{season.icon}</span>
                  <span>{season.name}</span>
                  {season.isCurrentSeason && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active Calendar Season" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Step 1: Farmer Soil Selection (Explicit Farmer Input) */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                Select Your Soil Type
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              GPS detects where your farm is, but <strong>you choose your exact soil</strong> for accurate crop suitability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSoilTestDrawer(!showSoilTestDrawer)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{showSoilTestDrawer ? 'Hide Soil Test Details' : '🧪 Add Soil Test (Optional)'}</span>
          </button>
        </div>

        {/* Soil Dropdown & Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="sm:col-span-2 lg:col-span-1">
            <select
              value={selectedSoil}
              onChange={(e) => handleSoilChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            >
              <option value="">-- Select your soil type --</option>
              {SOIL_TYPE_OPTIONS.map((soil) => (
                <option key={soil} value={soil}>
                  {soil}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 text-xs">
            {SOIL_TYPE_OPTIONS.map((soil) => (
              <button
                key={soil}
                type="button"
                onClick={() => handleSoilChange(soil)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedSoil === soil
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                {soil}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Soil Test Parameters Drawer */}
        {showSoilTestDrawer && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <span>Laboratory Soil Health Parameters (Optional)</span>
              </span>
              <span className="text-[11px] text-slate-400">Leave blank if unknown</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">pH Level</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 6.5"
                  value={soilTest.pH || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, pH: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nitrogen (N)</label>
                <input
                  type="number"
                  placeholder="kg/ha"
                  value={soilTest.nitrogen || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, nitrogen: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phosphorus (P)</label>
                <input
                  type="number"
                  placeholder="kg/ha"
                  value={soilTest.phosphorus || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, phosphorus: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Potassium (K)</label>
                <input
                  type="number"
                  placeholder="kg/ha"
                  value={soilTest.potassium || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, potassium: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Organic Carbon (%)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.55"
                  value={soilTest.organicCarbon || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, organicCarbon: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">EC (dS/m)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.8"
                  value={soilTest.electricalConductivity || ''}
                  onChange={(e) => setSoilTest({ ...soilTest, electricalConductivity: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSoilTest({});
                  fetchRecommendations(selectedSeason, selectedSoil, {});
                }}
                className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs"
              >
                Clear Test Values
              </button>
              <button
                type="button"
                onClick={() => fetchRecommendations(selectedSeason, selectedSoil, soilTest)}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Apply Soil Metrics
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Loading & Error States */}
      {isLoading && !data && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            🌾 Calculating crop suitability based on soil, season & live weather...
          </p>
        </div>
      )}

      {errorMsg && !data && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
          <button
            onClick={() => fetchRecommendations(selectedSeason, selectedSoil, soilTest)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4. Step 2: Suitable Crops For Your Conditions (Multi-Factor Ranked List) */}
      {data && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                  Suitable Crops For Your Conditions
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranked by <strong>{selectedSoil || 'General Soil'}</strong> + <strong>{data.currentSeason.name} Season</strong> + <strong>{weather?.location?.city || 'Local Region'}</strong> + <strong>Live Weather</strong>
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {data.recommendedCrops.length} crops evaluated
              </span>
            </div>
          </div>

          {/* Crops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.recommendedCrops.map((crop) => {
              const isChosen = chosenCropId === crop.id;
              return (
                <div
                  key={crop.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${
                    isChosen
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  {/* Top Ranking Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{crop.icon}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        crop.suitabilityTier === 'Highly Suitable'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          : crop.suitabilityTier === 'Suitable'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                      }`}
                    >
                      {crop.suitabilityBadge}
                    </span>
                  </div>

                  {/* Crop Info */}
                  <div className="space-y-2.5">
                    <div>
                      <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                        {crop.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">{crop.category}</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Water Need:</span>
                        <span className={`px-2 py-0.2 rounded font-bold text-[10px] border ${getWaterBadgeColor(crop.waterRequirement)}`}>
                          {crop.waterRequirement}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Sowing Period:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{crop.sowingPeriod}</span>
                      </div>
                    </div>

                    {/* Soil suitability summary */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span>🌱 Soil Fit:</span>
                        <span className="font-normal truncate">{selectedSoil || 'General Soil'}</span>
                      </div>
                      <p className="line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">
                        {crop.soilSuitabilityNote}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Select Crop / View Details */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setChosenCropId(crop.id);
                        handleGeneratePlan(crop.id);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        isChosen
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isChosen ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selected For Plan</span>
                        </>
                      ) : (
                        <span>Choose This Crop</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCropModal(crop)}
                      className="w-full py-1 text-center text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      View Agronomy Guide
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Step 3: Farmer Decision & Active Crop Plan */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    What do you want to grow?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The final farming decision belongs to you. Select your crop and generate a comprehensive seasonal plan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={chosenCropId}
                  onChange={(e) => {
                    setChosenCropId(e.target.value);
                    if (e.target.value) handleGeneratePlan(e.target.value);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose your crop --</option>
                  {data.recommendedCrops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name} ({c.suitabilityBadge.split(' ')[1]})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!chosenCropId || isGeneratingPlan}
                  onClick={() => handleGeneratePlan()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isGeneratingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Create My Crop Plan</span>
                </button>
              </div>
            </div>

            {/* Generated & Persisted Farm Plan Display */}
            {activeCropPlan && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeCropPlan.selectedCrop.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                          🌱 My Active Crop Plan: {activeCropPlan.selectedCrop.name}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          {activeCropPlan.season} Season
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configured for <strong>{activeCropPlan.soilType}</strong> • {activeCropPlan.location.city || 'Local Farm'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {saveSuccessMsg && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <BookmarkCheck className="w-4 h-4" />
                        <span>{saveSuccessMsg}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isSavingPlan}
                      onClick={handleSavePlan}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
                      title="Save plan to MongoDB farm profile"
                    >
                      {isSavingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save To Profile</span>
                    </button>
                  </div>
                </div>

                {/* Plan Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">🌾 Sowing Guidance</span>
                    <p className="text-slate-700 dark:text-slate-300">{activeCropPlan.sowingGuidance}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">💧 Irrigation Strategy</span>
                    <p className="text-slate-700 dark:text-slate-300">{activeCropPlan.irrigationGuidance}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">🧪 Soil & Nutrient Management</span>
                    <p className="text-slate-700 dark:text-slate-300">{activeCropPlan.nutrientGuidance}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">🐛 Pest Monitoring & Safety</span>
                    <p className="text-slate-700 dark:text-slate-300">{activeCropPlan.pestMonitoringGuidance}</p>
                  </div>
                </div>

                {/* Growth Stage Milestones */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      📅 Key Lifecycle Growth Stages for {activeCropPlan.selectedCrop.name}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold">
                      Expected Harvest: {activeCropPlan.expectedHarvestPeriod}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {activeCropPlan.growthStages.map((stage) => (
                      <div
                        key={stage.stage}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1"
                      >
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px]">
                          {stage.stage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">{stage.timeline}</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{stage.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Safe Chemical Notice & AI Leaf Scanner Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">🛡️ Agricultural Advisory & Chemical Safety Disclaimer:</span>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">{data.safeChemicalNotice}</p>
              </div>
            </div>
            <Link
              to="/ai/crop-disease"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition-colors shadow-xs self-start sm:self-auto"
            >

              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Leaf Scanner</span>
            </Link>
          </div>
        </div>
      )}

      {/* 6. Agronomy Detail Modal */}
      {selectedCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCropModal.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                      {selectedCropModal.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                      {selectedCropModal.suitabilityBadge}
                    </span>
                  </div>
                  {selectedCropModal.scientificName && (
                    <span className="text-xs text-slate-400 italic">
                      {selectedCropModal.scientificName} • {selectedCropModal.category}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCropModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Advantages & Key Considerations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block">✨ Key Advantages:</span>
                <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
                  {selectedCropModal.advantages?.map((adv, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <span className="font-bold text-amber-900 dark:text-amber-200 block">⚠️ Things to Consider:</span>
                <ul className="space-y-1 text-amber-800 dark:text-amber-300">
                  {selectedCropModal.thingsToConsider?.map((th, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{th}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setChosenCropId(selectedCropModal.id);
                  handleGeneratePlan(selectedCropModal.id);
                  setSelectedCropModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                Select {selectedCropModal.name} & Create Plan
              </button>

              <button
                onClick={() => setSelectedCropModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
