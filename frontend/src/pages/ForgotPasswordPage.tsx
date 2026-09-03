import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { forgotPasswordApi, ForgotPasswordResponse } from '../services/api';
import { useTranslation } from '../context/LanguageContext';
import axios from 'axios';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<ForgotPasswordResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(t('invalidEmailError', 'Please enter a valid email address format (e.g. name@example.com).'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPasswordApi(trimmedEmail);
      if (res.success) {
        setSuccessData(res);
      } else {
        setErrorMsg(res.message || 'Unable to request password reset.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to process password reset request. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <KeyRound className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('forgotPasswordLink', 'Forgot Password')}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Enter your registered email to receive a secure password reset token
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10 space-y-6 transition-colors">
          
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successData ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white">Reset Token Generated</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  A secure 15-minute password reset token has been generated for <strong>{email}</strong>.
                </p>
              </div>

              {/* Direct Token Link Box */}
              {successData.resetToken && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-left space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Instant Password Reset Access</span>
                  </div>
                  
                  <Link
                    to={`/reset-password?token=${successData.resetToken}&email=${encodeURIComponent(email)}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
                  >
                    <span>Proceed to Set New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setEmail('');
                  }}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Request for a different email
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('emailLabel', 'Registered Account Email')}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. farmer@agromitra.in"

                    className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-2xl shadow-md text-xs font-heading font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Reset Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('alreadyRegistered', 'Back to Sign In')}</span>
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
