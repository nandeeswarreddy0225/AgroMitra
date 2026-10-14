import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LogIn,
  Lock,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sprout,
  Store,
  Building2,
  Truck,
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPostLoginRedirectPath, UserRole } from '../types/auth';
import { AgroMitraLogo } from '../components/common/AgroMitraLogo';
import axios from 'axios';

// Image error fallback helper
const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
) => {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.src = fallbackSrc;
  }
};

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRoleParam = (searchParams.get('role') || searchParams.get('portal') || '').toUpperCase();
  const validRoles: UserRole[] = ['FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', 'MARKET_OWNER', 'DELIVERY_BOY', 'ADMIN'];
  const defaultPortal: UserRole = validRoles.includes(initialRoleParam as UserRole)
    ? (initialRoleParam as UserRole)
    : 'FARMER';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<UserRole>(defaultPortal);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync portal from URL query parameter if present
  useEffect(() => {
    if (initialRoleParam && validRoles.includes(initialRoleParam as UserRole)) {
      setSelectedPortal(initialRoleParam as UserRole);
    }
  }, [initialRoleParam]);

  const isEmailInput = phone.includes('@') || /[a-zA-Z]/.test(phone);

  const portals = [
    { role: 'FARMER' as UserRole, label: 'Farmer', icon: Sprout, desc: 'Inputs & AI health' },
    { role: 'SHOP_OWNER' as UserRole, label: 'Shop Owner', icon: Store, desc: 'Inventory & orders' },
    { role: 'AGRI_PARTNER' as UserRole, label: 'Agri Partner', icon: HeartHandshake, desc: 'Partner services' },
    { role: 'MARKET_OWNER' as UserRole, label: 'Market Owner', icon: Building2, desc: 'Mandi spot rates' },
    { role: 'DELIVERY_BOY' as UserRole, label: 'Delivery Boy', icon: Truck, desc: 'Field deliveries' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIdentifier = phone.trim();
    const cleanPassword = password.trim();
    if (!cleanIdentifier || !cleanPassword) {
      setErrorMsg('Please provide your phone number (or email) and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticatedUser = await login({
        phone: cleanIdentifier,
        email: cleanIdentifier,
        identifier: cleanIdentifier,
        password: cleanPassword,
        role: selectedPortal,
      });

      const rawRole =
        authenticatedUser?.role ||
        (authenticatedUser as any)?.user?.role ||
        (authenticatedUser as any)?.data?.role ||
        (authenticatedUser as any)?.data?.user?.role ||
        '';
      const userRole = rawRole.toString().trim().toUpperCase() as UserRole;

      // Strict enforcement: The authenticated account MUST match the selected portal
      if (userRole !== selectedPortal) {
        logout();
        setErrorMsg('These credentials are not registered for the selected portal. Please select the correct portal or use the matching account.');
        return;
      }

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const destination = getPostLoginRedirectPath(from, userRole);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) {
          setErrorMsg(err.response.data.message);
        } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
          setErrorMsg('Unable to connect to the AgroMitra backend server. Please verify that the backend is running on port 5000.');
        } else {
          setErrorMsg(err.message || 'Login failed. Please check your network connection.');
        }
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Invalid phone number or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Agricultural Visual Panel with Real Photography on Desktop */}
        {/* ========================================================================= */}
        <div className="relative lg:col-span-5 bg-stone-950 text-white p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
          {/* Real Agricultural Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
              alt="Lush green agricultural farmland in India at sunrise"
              onError={(e) => handleImageError(e)}
              className="w-full h-full object-cover object-center scale-105"
            />
            {/* Multi-stop forest green and emerald gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-stone-950/90 to-emerald-950/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-transparent to-transparent" />
          </div>

          {/* Top Brand & Tagline */}
          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center">
              <AgroMitraLogo variant="horizontal" size="md" showTagline={false} />
            </Link>

            <div className="space-y-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Next-Gen Agricultural Portal</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white leading-tight">
                Your Farm. Your Future.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                  Connected.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-md">
                AgroMitra unites rural agriculture into one intelligent platform — providing AI crop health, genuine inputs, and transparent mandi spot prices.
              </p>
            </div>
          </div>

          {/* Center: Three Concise Platform Benefits */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI-Powered Diagnostics</h4>
                <p className="text-[11px] text-stone-300 mt-0.5">Instant foliar pathology analysis and organic cure recommendations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">APMC Mandi Spot Prices</h4>
                <p className="text-[11px] text-stone-300 mt-0.5">Real-time modal and minimum spot rates across authorized market yards.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verified Agricultural Supply</h4>
                <p className="text-[11px] text-stone-300 mt-0.5">Certified seeds, bio-protection, and direct-to-farm dispatch logistics.</p>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-stone-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Role-Isolated Security</span>
            </span>
            <span className="font-mono text-[11px] text-stone-400">v2.0 SSL Protected</span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Sign-In Form & Portal Selection */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Sign In to AgroMitra
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              New to AgroMitra?{' '}
              <Link
                to={`/register?role=${selectedPortal}`}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* 5-Portal Selector Chips */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
              Select Your Agricultural Portal:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {portals.map((p) => {
                const Icon = p.icon;
                const isSel = selectedPortal === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => setSelectedPortal(p.role)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      isSel
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 font-bold shadow-sm scale-102'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-bold truncate max-w-full">{p.label}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-full hidden sm:inline">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Phone Number or Email Input */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number or Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs flex">
                <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                  {isEmailInput ? '📧 Email' : '🇮🇳 +91'}
                </span>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode={isEmailInput ? 'email' : 'tel'}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210 or user@example.com"
                    maxLength={100}
                    className="block w-full pl-9 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-r-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-700/20 text-sm font-heading font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition-all hover:-translate-y-0.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to {portals.find(p => p.role === selectedPortal)?.label || 'Portal'}</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Quick Help Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
            <span>Need portal assistance? </span>
            <Link to="/marketplace" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
              Explore AgroMitra Marketplace
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};
