import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Search,
  Check,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  Loader2,
  Info,
  ShieldCheck,
  FileText,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';
import { getGovernmentSchemesApi } from '../../services/api';
import { Scheme } from '../../types/scheme';
import axios from 'axios';

const SCHEME_CATEGORIES = [
  'All Schemes',
  'Direct Income Support',
  'Crop Insurance & Relief',
  'Irrigation & Solar Pumps',
  'Subsidized Farm Machinery',
  'Certified Seeds & Inputs',
  'Organic & Horticulture',
];

export const GovernmentSchemesPage: React.FC = () => {
  const [selectedState, setSelectedState] = useState<'Andhra Pradesh' | 'Telangana'>('Andhra Pradesh');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Schemes');
  const [searchQuery, setSearchQuery] = useState('');
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  const fetchSchemes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getGovernmentSchemesApi({
        state: selectedState,
        category: selectedCategory === 'All Schemes' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
      });

      if (res.success && Array.isArray(res.schemes)) {
        setSchemes(res.schemes);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to fetch verified government schemes. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [selectedState, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchemes();
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Direct Income Support':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'Crop Insurance & Relief':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'Irrigation & Solar Pumps':
        return 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
      case 'Subsidized Farm Machinery':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'Certified Seeds & Inputs':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'Organic & Horticulture':
        return 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs font-bold border border-white/15">
            <Landmark className="w-3.5 h-3.5" />
            <span>Official DBT Subsidies & Grants Database (2025–2026)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold tracking-tight">
            Government Agriculture Schemes
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Verified agricultural schemes, cash support programs, equipment subsidies, and free crop insurance for farmers in <strong>Andhra Pradesh</strong> and <strong>Telangana</strong>.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schemes (e.g., Rythu Bharosa, Annadatha Sukhibhava, Drip, Seeds, Insurance)..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md font-medium border border-slate-200 dark:border-slate-700"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-heading font-extrabold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <span>Search Schemes</span>
            </button>
          </form>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Prominent State Switcher Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
            <span>Select Farmer State:</span>
          </div>

          {/* State Switcher Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 sm:max-w-xl">
            <button
              onClick={() => {
                setSelectedState('Andhra Pradesh');
                setSelectedCategory('All Schemes');
              }}
              className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border ${
                selectedState === 'Andhra Pradesh'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-transparent shadow-md'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">🌾</span>
              <div className="text-left">
                <span className="block leading-tight font-heading">Andhra Pradesh</span>
                <span className={`text-[10px] font-normal ${selectedState === 'Andhra Pradesh' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                  ఆంధ్రప్రదేశ్ పథకాలు
                </span>
              </div>
              {selectedState === 'Andhra Pradesh' && <Check className="w-4 h-4 ml-auto text-emerald-200" />}
            </button>

            <button
              onClick={() => {
                setSelectedState('Telangana');
                setSelectedCategory('All Schemes');
              }}
              className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border ${
                selectedState === 'Telangana'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-transparent shadow-md'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">🌾</span>
              <div className="text-left">
                <span className="block leading-tight font-heading">Telangana</span>
                <span className={`text-[10px] font-normal ${selectedState === 'Telangana' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                  తెలంగాణ పథకాలు
                </span>
              </div>
              {selectedState === 'Telangana' && <Check className="w-4 h-4 ml-auto text-emerald-200" />}
            </button>
          </div>

          <button
            onClick={fetchSchemes}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SCHEME_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active State Header Banner */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Showing verified schemes for:
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-xs font-black">
            {selectedState}
          </span>
          {selectedCategory !== 'All Schemes' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
              • {selectedCategory}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {schemes.length} Scheme{schemes.length !== 1 ? 's' : ''} Available
        </span>
      </div>

      {/* Schemes Grid */}
      {isLoading ? (
        <div className="min-h-[350px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Loading verified {selectedState} agriculture schemes...</p>
        </div>
      ) : schemes.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-sm">
          <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white">No schemes found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            No active schemes matched your filter criteria for {selectedState}. Try resetting your category or search query.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Schemes');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <div
              key={scheme.id || scheme.code}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 dark:hover:border-emerald-700 group"
            >
              {/* Card Top */}
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeColor(
                      scheme.category
                    )}`}
                  >
                    {scheme.category}
                  </span>

                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold font-mono">
                    {scheme.state}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-heading font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {scheme.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {scheme.ministry}
                  </p>
                </div>

                {/* Who Can Apply Snippet */}
                {scheme.whoCanApply && (
                  <div className="flex items-start gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 font-medium">
                      <strong>Who can apply:</strong> {scheme.whoCanApply}
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {scheme.description}
                </p>

                {/* Highlight Benefit Box */}
                <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Benefit / Financial Grant</span>
                  </div>
                  <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 line-clamp-2">
                    {scheme.subsidyDetails}
                  </p>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedScheme(scheme)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                >
                  <span>View Details & Guide</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={scheme.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                  title="Open official government portal in a new tab"
                >
                  <span>Official Portal</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step-by-Step "How to Apply" Section for AP & Telangana Farmers */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-heading font-bold text-slate-900 dark:text-white">
              How to Apply for {selectedState} Agriculture Schemes (రైతు దరఖాస్తు మార్గదర్శి)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standard 4-step application procedure for agricultural subsidies, seed distribution, and DBT programs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Keep Land & ID Documents Ready',
              desc: selectedState === 'Andhra Pradesh'
                ? 'Keep your Aadhaar Card, Meebhoomi 1B / Pattadar Passbook, and CCRC card (for tenant farmers) ready in digital format.'
                : 'Keep your Aadhaar Card, Dharani Passbook / Title Deed, and active bank account passbook ready in digital format.',
            },
            {
              step: '02',
              title: 'Village Level Verification',
              desc: selectedState === 'Andhra Pradesh'
                ? 'Visit your village Rythu Bharosa Kendram (RBK) to complete e-Crop enrollment and biometric Aadhaar authentication with the VAA.'
                : 'Visit your local Rythu Vedika to confirm enrollment with your Agriculture Extension Officer (AEO) and Dharani land records.',
            },
            {
              step: '03',
              title: 'Submit on Official Portal',
              desc: 'Click "Official Portal" to open the verified state portal (.ap.gov.in / .telangana.gov.in), select equipment or subsidy component, and enter survey details.',
            },
            {
              step: '04',
              title: 'Direct Bank Transfer (DBT)',
              desc: 'Subsidies and cash support are deposited directly into your Aadhaar-linked bank account without middleman deductions.',
            },
          ].map((item) => (
            <div key={item.step} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 relative">
              <span className="text-2xl font-heading font-black text-emerald-300 dark:text-emerald-700 font-mono block">{item.step}</span>
              <h3 className="text-xs sm:text-sm font-heading font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comprehensive Scheme Detail Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto transition-colors">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeColor(
                      selectedScheme.category
                    )}`}
                  >
                    {selectedScheme.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-[10px] font-bold">
                    {selectedScheme.state} State Scheme
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold font-mono">
                    {selectedScheme.code}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white">
                  {selectedScheme.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {selectedScheme.ministry}
                </p>
              </div>

              <button
                onClick={() => setSelectedScheme(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Benefit & Subsidy Highlight Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white space-y-1 shadow-md">
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                Financial Benefits & Subsidy Details
              </span>
              <p className="text-sm sm:text-base font-black leading-snug">
                {selectedScheme.benefits}
              </p>
            </div>

            {/* Who Can Apply */}
            {selectedScheme.whoCanApply && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>Target Beneficiaries / Who Can Apply</span>
                </span>
                <p className="font-medium leading-relaxed">{selectedScheme.whoCanApply}</p>
              </div>
            )}

            {/* Scheme Overview */}
            <div className="space-y-2">
              <h4 className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Scheme Overview</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedScheme.description}
              </p>
            </div>

            {/* Eligibility Criteria */}
            <div className="space-y-2">
              <h4 className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Eligibility Criteria & Exclusions</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {selectedScheme.eligibility.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Required Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Required Documents Checklist</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                {selectedScheme.documentsRequired.map((doc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Apply Step-by-Step */}
            <div className="space-y-2">
              <h4 className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Step-by-Step Application Instructions</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {selectedScheme.howToApply.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified timestamp & Official Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Verified from Official Gazette: <strong>{selectedScheme.verifiedDate}</strong></span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>

                <a
                  href={selectedScheme.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  <span>Apply on Official Portal</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
