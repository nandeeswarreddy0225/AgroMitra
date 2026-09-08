import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Sprout,
  Store,
  Truck,
  Building2,
  HeartHandshake,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { AgroMitraLogo } from '../components/common/AgroMitraLogo';
import { LocationAutofillWidget } from '../components/common/LocationAutofillWidget';
import axios from 'axios';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRoleParam = (searchParams.get('role') || '').toUpperCase();
  const validRoles: Array<'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'MARKET_OWNER'> = [
    'FARMER',
    'SHOP_OWNER',
    'AGRI_PARTNER',
    'DELIVERY_BOY',
    'MARKET_OWNER',
  ];
  const defaultRole = validRoles.includes(initialRoleParam as any)
    ? (initialRoleParam as 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'MARKET_OWNER')
    : 'FARMER';

  const [role, setRole] = useState<'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'MARKET_OWNER'>(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketName, setMarketName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field unlock tracking: keeps fields readOnly on initial render to block Chrome auto-injection
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});

  const unlockField = (fieldKey: string) => {
    setUnlockedFields((prev) => (prev[fieldKey] ? prev : { ...prev, [fieldKey]: true }));
  };

  const { register, getRoleDashboardPath } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Ensure all form fields are completely empty whenever RegisterPage is mounted
  useEffect(() => {
    setName('');
    setEmail('');
    setPhone('');
    setMarketName('');
    setPassword('');
    setConfirmPassword('');
    setStreet('');
    setCity('');
    setState('');
    setPincode('');
    setUnlockedFields({});
    setErrorMsg(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(t('invalidEmailError', 'Please enter a valid email address.'));
      return;
    }

    if (trimmedPhone.length < 8) {
      setErrorMsg(t('phoneLengthError', 'Please provide a valid phone number (minimum 8 digits).'));
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t('passwordLengthError', 'Password must be at least 6 characters long.'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t('passwordsDoNotMatch', 'Passwords do not match. Please re-enter your password.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticatedUser = await register({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        role,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        marketName: role === 'MARKET_OWNER' ? (marketName.trim() || `${trimmedName} APMC Mandi`) : undefined,
      });

      // Clear the form fields upon successful registration
      setName('');
      setEmail('');
      setPhone('');
      setMarketName('');
      setPassword('');
      setConfirmPassword('');
      setStreet('');
      setCity('');
      setState('');
      setPincode('');
      setUnlockedFields({});

      const destination = getRoleDashboardPath(authenticatedUser.role);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Registration failed. Please check your information and try again.');
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
          {t('createAccountTitle', 'Create an AgroMitra Account')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('alreadyRegistered', 'Already registered?')}{' '}
          <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('navSignIn', 'Sign In')}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10 transition-colors">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('registerAs', 'Register as:')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('FARMER')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    role === 'FARMER'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sprout className={`w-5 h-5 mb-1 ${role === 'FARMER' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">{t('roleFarmer', 'Farmer')}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-center">
                    Inputs & AI health
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SHOP_OWNER')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    role === 'SHOP_OWNER'
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Store className={`w-5 h-5 mb-1 ${role === 'SHOP_OWNER' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-center">Shop Owner</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-center">
                    Store inventory & sales
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('AGRI_PARTNER')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    role === 'AGRI_PARTNER'
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/70 text-teal-950 dark:text-teal-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <HeartHandshake className={`w-5 h-5 mb-1 ${role === 'AGRI_PARTNER' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-center">Agri Partner</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-center">
                    Partner services
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('MARKET_OWNER')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    role === 'MARKET_OWNER'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-1 ${role === 'MARKET_OWNER' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-center">Market Owner</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-center">
                    Mandi spot rates
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('DELIVERY_BOY')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                    role === 'DELIVERY_BOY'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/70 text-blue-950 dark:text-blue-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Truck className={`w-5 h-5 mb-1 ${role === 'DELIVERY_BOY' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">Delivery Boy</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-center">
                    Field deliveries
                  </span>
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="agri_reg_fullname" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('fullNameLabel', 'Full Name / Business Name')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="agri_reg_fullname"
                    name="agri_reg_fullname"
                    type="text"
                    autoComplete="off"
                    readOnly={!unlockedFields['name']}
                    onFocus={() => unlockField('name')}
                    onPointerDown={() => unlockField('name')}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'SHOP_OWNER' || role === 'AGRI_PARTNER' ? 'e.g. Sri Venkateswara Krishi Seva' : 'e.g. Ramesh Reddy'}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="agri_reg_phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('phoneLabel', 'Phone Number')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="agri_reg_phone"
                    name="agri_reg_phone"
                    type="tel"
                    autoComplete="off"
                    readOnly={!unlockedFields['phone']}
                    onFocus={() => unlockField('phone')}
                    onPointerDown={() => unlockField('phone')}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9848012345"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="agri_reg_email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('emailLabel', 'Email Address')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="agri_reg_email"
                  name="agri_reg_email"
                  type="email"
                  autoComplete="off"
                  readOnly={!unlockedFields['email']}
                  onFocus={() => unlockField('email')}
                  onPointerDown={() => unlockField('email')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@agromitra.in"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Market Owner specific fields */}
            {role === 'MARKET_OWNER' && (
              <div>
                <label htmlFor="agri_reg_market_name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandi / Market Yard Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="agri_reg_market_name"
                    name="agri_reg_market_name"
                    type="text"
                    autoComplete="off"
                    readOnly={!unlockedFields['marketName']}
                    onFocus={() => unlockField('marketName')}
                    onPointerDown={() => unlockField('marketName')}
                    required={role === 'MARKET_OWNER'}
                    value={marketName}
                    onChange={(e) => setMarketName(e.target.value)}
                    placeholder="e.g. Guntur APMC Market Yard / Azadpur Mandi"
                    className="block w-full pl-10 pr-3 py-2.5 border border-purple-300 dark:border-purple-700 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Address Details with PIN Auto-fill and On-Demand GPS */}
            <LocationAutofillWidget
              street={street}
              setStreet={setStreet}
              city={city}
              setCity={setCity}
              state={state}
              setState={setState}
              pincode={pincode}
              setPincode={setPincode}
              unlockedFields={unlockedFields}
              unlockField={unlockField}
              className="pt-2 border-t border-slate-100 dark:border-slate-800"
            />

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label htmlFor="agri_reg_password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('passwordLabel', 'Password')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="agri_reg_password"
                    name="agri_reg_password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    readOnly={!unlockedFields['password']}
                    onFocus={() => unlockField('password')}
                    onPointerDown={() => unlockField('password')}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="agri_reg_confirm_password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('confirmPasswordLabel', 'Confirm Password')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="agri_reg_confirm_password"
                    name="agri_reg_confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    readOnly={!unlockedFields['confirmPassword']}
                    onFocus={() => unlockField('confirmPassword')}
                    onPointerDown={() => unlockField('confirmPassword')}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{t('createAccountTitle', 'Create an AgroMitra Account')}</span>
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
