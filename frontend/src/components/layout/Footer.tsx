import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  ShieldCheck,
  Store,
  QrCode,
  HeartHandshake,
  Truck,
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 text-slate-300 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & Vision */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-green-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-heading font-extrabold tracking-tight text-white">
                  Agro<span className="text-emerald-400">Mitra</span>
                </span>
                <span className="text-[10px] text-emerald-400/90 font-bold tracking-wide uppercase -mt-0.5">
                  {t('brandTagline', 'Smart Farming • Better Decisions • Stronger Connections')}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              {t(
                'brandHeroSubtitle',
                'AgroMitra connects farmers, agri store partners and delivery partners in one intelligent agricultural platform.'
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Genuine Inputs</span>
              </div>
              <div className="flex items-center gap-1">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Direct UPI & Razorpay</span>
              </div>
              <div className="flex items-center gap-1">
                <HeartHandshake className="w-4 h-4 text-blue-400" />
                <span>Direct Farmer Connect</span>
              </div>
            </div>
          </div>

          {/* Col 2: For Farmers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              <span>For Farmers</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/marketplace" className="hover:text-emerald-400 transition-colors">
                  Agricultural Marketplace
                </Link>
              </li>
              <li>
                <Link to="/ai/crop-disease" className="hover:text-emerald-400 transition-colors">
                  AI Leaf Pathology Scanner
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Agro-Weather Advisory
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
                  APMC Mandi Spot Rates
                </Link>
              </li>
              <li>
                <Link to="/schemes" className="hover:text-emerald-400 transition-colors">
                  Government Subsidy Schemes
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Agri Store Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>Store Partners</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/shop/products" className="hover:text-amber-400 transition-colors">
                  Product Inventory Management
                </Link>
              </li>
              <li>
                <Link to="/shop/orders" className="hover:text-amber-400 transition-colors">
                  Farmer Order Fulfillment
                </Link>
              </li>
              <li>
                <Link to="/shop/orders" className="hover:text-amber-400 transition-colors">
                  Delivery Partner Assignment
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-amber-400 transition-colors">
                  Store Partner Registration
                </Link>
              </li>
            </ul>
          </div>


          {/* Col 4: For Delivery Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Delivery Partners</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/delivery/dashboard" className="hover:text-blue-400 transition-colors">
                  Delivery Dashboard
                </Link>
              </li>
              <li>
                <Link to="/delivery/dashboard" className="hover:text-blue-400 transition-colors">
                  Assigned Shipments
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-400 transition-colors">
                  Delivery Partner Registration
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} AgroMitra Platforms. Built for Indian Agriculture.</p>
          <div className="flex items-center space-x-6">
            <span>Smart Farming</span>
            <span>•</span>
            <span>Better Decisions</span>
            <span>•</span>
            <span>Stronger Connections</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
