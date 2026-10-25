import React from 'react';
import { Droplet, ShieldCheck, AlertTriangle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      {/* Important Medical Disclaimer Notice */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Clinical & Safety Disclaimer:</strong> LifeFlow is a coordination and emergency discovery network designed to facilitate timely donor outreach during critical blood shortages. This platform does not perform clinical compatibility determination, medical suitability screening, disease testing, or direct blood transfusions. All blood donations, cross-matching, and patient safety checks must be conducted at licensed hospitals or certified blood bank facilities.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                <Droplet className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Life<span className="text-rose-500">Flow</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Real-time emergency blood donation matching and coordination system. Connecting verified donors, emergency coordinators, and blood bank administrators through proximity-based matching.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              MongoDB 2dsphere Geospatial Indexing & RBAC Protected
            </div>
          </div>

          {/* User Roles */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Access Roles
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Registered Blood Donors</li>
              <li>• Emergency Hospital Requesters</li>
              <li>• Blood Bank Administrators</li>
              <li>• Voluntary Coordinator Networks</li>
            </ul>
          </div>

          {/* Quick Demo Credentials */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Demo Test Logins
            </h4>
            <div className="text-xs space-y-2 text-slate-400">
              <div>
                <strong className="text-slate-200">Admin:</strong> admin@bloodnetwork.org
              </div>
              <div>
                <strong className="text-slate-200">Requester:</strong> dr.sharma@citycare.org
              </div>
              <div>
                <strong className="text-slate-200">Donor (O+):</strong> rahul.verma@example.com
              </div>
              <div>
                <strong className="text-slate-200">Donor (O-):</strong> sneha.rao@example.com
              </div>
              <div className="text-rose-400 pt-1">
                Password: <em>admin123 / requester123 / donor123</em>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LifeFlow Emergency Matching System. Full-stack College Project.</p>
          <p className="mt-2 sm:mt-0">Built with React, Express, MongoDB Atlas & Leaflet OSM</p>
        </div>
      </div>
    </footer>
  );
};
