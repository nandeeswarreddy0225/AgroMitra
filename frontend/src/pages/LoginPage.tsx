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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { getPostLoginRedirectPath, UserRole } from '../types/auth';
import { AgroMitraLogo } from '../components/common/AgroMitraLogo';
import axios from 'axios';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // On LoginPage mount, sync portal from URL query parameter if present
  useEffect(() => {
    if (initialRoleParam && validRoles.includes(initialRoleParam as UserRole)) {
      setSelectedPortal(initialRoleParam as UserRole);
    }
  }, [initialRoleParam]);

  const isEmailInput = phone.includes('@') || /[a-zA-Z]/.test(phone);

  const portals = [
    { role: 'FARMER' as UserRole, label: 'Farmer', icon: Sprout, color: 'emerald', desc: 'Inputs & AI health' },
    { role: 'SHOP_OWNER' as UserRole, label: 'Shop Owner', icon: Store, color: 'amber', desc: 'Inventory & sales' },
    { role: 'AGRI_PARTNER' as UserRole, label: 'Agri Partner', icon: HeartHandshake, color: 'teal', desc: 'Partner services' },
    { role: 'MARKET_OWNER' as UserRole, label: 'Market Owner', icon: Building2, color: 'indigo', desc: 'Mandi spot rates' },
    { role: 'DELIVERY_BOY' as UserRole, label: 'Delivery Boy', icon: Truck, color: 'blue', desc: 'Field deliveries' },
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
        setErrorMsg('These credentials are not registered for the selected portal. Please select the correct portal or use the correct account.');
        return;
      }

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const destination = getPostLoginRedirectPath(from, userRole);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
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
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="flex justify-center mb-2">
          <AgroMitraLogo variant="stacked" size="lg" showTagline={false} />
        </div>
        <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('signInTitle', 'Sign in to AgroMitra')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('newToKrishiSetu', 'New to AgroMitra? Create account')}{' '}
          <Link to={`/register?role=${selectedPortal}`} className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('navRegister', 'Register')}
          </Link>
        </p>

        {/* 5-Portal Selector Chips */}
        <div className="mt-6 px-2 sm:px-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Select Your Agricultural Portal:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {portals.map((p) => {
              const Icon = p.icon;
              const isSel = selectedPortal === p.role;
              return (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => setSelectedPortal(p.role)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    isSel
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs scale-102'
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
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10 transition-colors">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Phone Number or Email Input */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('phoneLabel', 'Phone Number or Email')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
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
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-r-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('passwordLabel', 'Password')} <span className="text-rose-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                >
                  {t('forgotPasswordLink', 'Forgot Password?')}
                </Link>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-heading font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{t('navSignIn', 'Sign In with Phone')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
