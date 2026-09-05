import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({
  onVerify,
  onExpire,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Allow sitekey from environment variable or Cloudflare official public test sitekey
  const siteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  const resetWidget = () => {
    setIsVerified(false);
    setErrorMessage(null);
    if (onExpire) onExpire();

    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (err) {
        console.warn('[Captcha] Reset error:', err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (!isMounted) return;
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              if (!isMounted) return;
              setIsVerified(true);
              setErrorMessage(null);
              onVerify(token);
            },
            'expired-callback': () => {
              if (!isMounted) return;
              setIsVerified(false);
              setErrorMessage('Security challenge expired. Please verify again.');
              if (onExpire) onExpire();
            },
            'error-callback': () => {
              if (!isMounted) return;
              setIsVerified(false);
              setErrorMessage('Security challenge failed. Please reload or click retry.');
              if (onExpire) onExpire();
            },
            theme: 'auto',
          });
          setIsReady(true);
        } catch (err) {
          console.error('[Captcha] Turnstile render error:', err);
          if (!isMounted) return;
          setIsVerified(false);
          setErrorMessage('Unable to initialize security challenge. Please refresh the page.');
          if (onExpire) onExpire();
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      script.onerror = () => {
        console.error('[Captcha] Cloudflare Turnstile script failed to load.');
        if (!isMounted) return;
        setIsVerified(false);
        setErrorMessage('Security verification service could not be reached. Please check your internet connection.');
        if (onExpire) onExpire();
      };
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        renderWidget();
      } else {
        script.addEventListener('load', renderWidget);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, [siteKey, onVerify, onExpire]);

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[74px] ${className}`}>
      <div ref={containerRef} className="my-0.5" />

      {!isReady && !errorMessage && !isVerified && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Loading Cloudflare Security Verification...</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex flex-col items-center gap-1.5 text-center mt-1">
          <div className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={resetWidget}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry verification</span>
          </button>
        </div>
      )}

      {isVerified && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Security verification completed</span>
        </div>
      )}
    </div>
  );
};
