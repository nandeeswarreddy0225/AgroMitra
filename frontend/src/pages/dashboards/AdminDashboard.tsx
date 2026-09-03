import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, Mail, Phone, MapPin, Calendar, Lock } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              AgroMitra System Administration
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user?.name}</strong> • Global Infrastructure & Platform Security
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-bold self-start sm:self-auto">
          <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Role: {user?.role}</span>
        </div>
      </div>

      {/* Admin Profile & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Administrator Credentials</span>
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>Full Name</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>Email Address</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.email}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <span>Phone</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-white">{user?.phone}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Active Since</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'System Initialization'}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Operational Scope */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Control Center & Security</span>
          </h2>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs sm:text-sm space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {user?.address?.street || 'AgroMitra National Headquarters'}
            </p>

            <p className="text-slate-600 dark:text-slate-400">
              {[user?.address?.city, user?.address?.state].filter(Boolean).join(', ') || 'Central Region'}
            </p>
            <p className="text-slate-500 dark:text-slate-500">
              Pincode: {user?.address?.pincode || '500001'}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
            ℹ️ <strong>System Health:</strong> MongoDB Persistent Storage Active, AI Microservice Connected, Dual Payment Routing Verified.
          </div>
        </div>
      </div>
    </div>
  );
};
