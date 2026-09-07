import React from 'react';

interface AgroMitraLogoProps {
  variant?: 'full' | 'horizontal' | 'mark' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  customSize?: number;
  className?: string;
  showTagline?: boolean;
}

export const AgroMitraEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="agmSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="agmLeftLeg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="agmRightLeg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="agmLeafLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <linearGradient id="agmLeafDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Rising Golden Agricultural Sun */}
      <circle cx="256" cy="175" r="50" fill="url(#agmSunGrad)" />
      <circle cx="256" cy="175" r="36" fill="#FDE68A" opacity="0.85" />

      {/* Left 'A' Architectural Leg */}
      <polygon points="256,80 288,118 144,415 92,415" fill="url(#agmLeftLeg)" />

      {/* Right 'A' Architectural Leg */}
      <polygon points="256,80 224,118 368,415 420,415" fill="url(#agmRightLeg)" />

      {/* Tiered Agricultural Crop Field Furrows */}
      <polygon points="165,280 256,255 347,280 335,305 256,280 177,305" fill="#34D399" />
      <polygon points="150,325 256,295 362,325 350,350 256,320 162,350" fill="#10B981" />
      <polygon points="135,370 256,335 377,370 365,395 256,360 147,395" fill="#047857" />

      {/* Sprouting Central Leaf */}
      <path
        d="M256,60 C298,135 282,230 256,260 C230,230 214,135 256,60 Z"
        fill="url(#agmLeafDark)"
      />
      <path
        d="M256,60 C298,135 282,230 256,260 Z"
        fill="url(#agmLeafLight)"
      />
      {/* Central Spine */}
      <line x1="256" y1="75" x2="256" y2="255" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
};

export const AgroMitraLogo: React.FC<AgroMitraLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  customSize,
  className = '',
  showTagline = true,
}) => {
  const getEmblemSize = () => {
    if (customSize) return customSize;
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 56;
      case 'xl':
        return 80;
      case 'md':
      default:
        return 42;
    }
  };

  const emblemSize = getEmblemSize();

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <AgroMitraEmblem size={emblemSize} />
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center text-center ${className}`}>
        <div className="p-2.5 rounded-2xl bg-slate-900/90 dark:bg-slate-900 border border-slate-800 shadow-lg shadow-emerald-950/20 mb-2">
          <AgroMitraEmblem size={emblemSize} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
            Agro<span className="text-emerald-600 dark:text-emerald-400">Mitra</span>
          </span>
          {showTagline && (
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium tracking-wide mt-1">
              Smart Farming. Better Crops. Better Future.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="p-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-900 border border-slate-800 shadow-md shadow-emerald-950/20 shrink-0">
        <AgroMitraEmblem size={emblemSize} />
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Agro<span className="text-emerald-600 dark:text-emerald-400">Mitra</span>
        </span>
        {showTagline && (
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide hidden sm:block">
            Smart Farming. Better Crops. Better Future.
          </span>
        )}
      </div>
    </div>
  );
};
