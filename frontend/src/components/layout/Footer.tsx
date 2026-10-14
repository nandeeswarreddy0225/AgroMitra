import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  ShieldCheck,
  Store,
  QrCode,
  HeartHandshake,
  Truck,
  Building2,
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { AgroMitraLogo } from '../common/AgroMitraLogo';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 text-slate-300 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & Vision */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center">
              <AgroMitraLogo variant="horizontal" size="md" showTagline={true} />
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
                <span>{t('footerGenuineBadge', '100% Genuine Inputs')}</span>
              </div>
              <div className="flex items-center gap-1">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>{t('footerUpiBadge', 'Direct UPI & Razorpay')}</span>
              </div>
              <div className="flex items-center gap-1">
                <HeartHandshake className="w-4 h-4 text-blue-400" />
                <span>{t('footerConnectBadge', 'Direct Farmer Connect')}</span>
              </div>
            </div>
          </div>

          {/* Col 2: For Farmers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('footerFarmersTitle', 'For Farmers')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/marketplace" className="hover:text-emerald-400 transition-colors">
                  {t('navMarketplace', 'Agricultural Marketplace')}
                </Link>
              </li>
              <li>
                <Link to="/ai/crop-disease" className="hover:text-emerald-400 transition-colors">
                  {t('navLeafScanner', 'AI Leaf Pathology Scanner')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
                  {t('navWeather', 'Agro-Weather Advisory')}
                </Link>
              </li>
              <li>
                <Link to="/market/prices" className="hover:text-emerald-400 transition-colors">
                  {t('mandiRatesTitle', 'APMC Mandi Spot Rates')}
                </Link>
              </li>
              <li>
                <Link to="/schemes" className="hover:text-emerald-400 transition-colors">
                  {t('navSchemes', 'Government Subsidy Schemes')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Agri Store Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('footerStoresTitle', 'Store Partners')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/shop/products" className="hover:text-amber-400 transition-colors">
                  {t('navInventory', 'Product Inventory Management')}
                </Link>
              </li>
              <li>
                <Link to="/shop/orders" className="hover:text-amber-400 transition-colors">
                  {t('navFulfillOrders', 'Farmer Order Fulfillment')}
                </Link>
              </li>
              <li>
                <Link to="/register?role=SHOP_OWNER" className="hover:text-amber-400 transition-colors">
                  {t('roleShopOwner', 'Store Partner Registration')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: For Market Owners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('footerMandiTitle', 'Market Owners')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/market-owner/dashboard" className="hover:text-indigo-400 transition-colors">
                  {t('navMandiDashboard', 'Mandi Owner Dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/market/prices" className="hover:text-indigo-400 transition-colors">
                  {t('navMandi', 'Mandi Price Comparisons')}
                </Link>
              </li>
              <li>
                <Link to="/register?role=MARKET_OWNER" className="hover:text-indigo-400 transition-colors">
                  {t('roleMarketOwner', 'Market Owner Registration')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: For Delivery Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('footerDeliveryTitle', 'Delivery Partners')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/delivery/dashboard" className="hover:text-blue-400 transition-colors">
                  {t('deliveryHubTitle', 'Delivery Dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/register?role=DELIVERY_BOY" className="hover:text-blue-400 transition-colors">
                  {t('roleDelivery', 'Delivery Partner Registration')}
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {t('brandName', 'AgroMitra')}. {t('footerRightsReserved', 'Dedicated to the Prosperity of Indian Agriculture.')}</p>
          <div className="flex items-center space-x-6">
            <span>{t('trustSmartFarming', 'Smart Farming')}</span>
            <span>•</span>
            <span>{t('trustMarketIntel', 'Market Intelligence')}</span>
            <span>•</span>
            <span>{t('trustLiveWeather', 'Live Weather')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
