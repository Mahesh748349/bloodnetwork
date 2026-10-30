import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplet, Heart, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { BloodGroupBadge } from '../components/BloodGroupBadge';

const RECIPIENT_RULES = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
};

const DONOR_RULES = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CompatibilityCalculatorPage = () => {
  const [activeTab, setActiveTab] = useState('recipient'); // 'recipient' | 'donor'
  const [selectedGroup, setSelectedGroup] = useState('O+');

  const compatibleList =
    activeTab === 'recipient'
      ? RECIPIENT_RULES[selectedGroup] || []
      : DONOR_RULES[selectedGroup] || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
          <Droplet className="w-3.5 h-3.5" /> Interactive Clinical Tool
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Blood Group <span className="text-rose-600">Compatibility</span> Calculator
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto">
          Explore ABO & Rh antigen compatibility for emergency transfusions. Understand universal
          donor types and component-level distribution rules.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('recipient')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'recipient'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            As a Recipient (Patient)
          </button>
          <button
            onClick={() => setActiveTab('donor')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'donor'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplet className="w-4 h-4" />
            As a Blood Donor
          </button>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-8">
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
            {activeTab === 'recipient'
              ? 'Select Patient Blood Group:'
              : 'Select Donor Blood Group:'}
          </h2>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 max-w-2xl mx-auto">
            {ALL_BLOOD_GROUPS.map((bg) => {
              const isSelected = bg === selectedGroup;
              return (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg)}
                  className={`py-3 px-2 rounded-2xl font-black text-sm transition text-center border ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30 scale-105'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50/80 via-white to-slate-50 border border-rose-100">
          <div className="text-center space-y-3">
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              {activeTab === 'recipient'
                ? `Patient with Blood Group ${selectedGroup} can receive blood from:`
                : `Donor with Blood Group ${selectedGroup} can donate blood to:`}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {compatibleList.map((bg) => (
                <div
                  key={bg}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-rose-200 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-black text-sm text-slate-800">{bg}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-500 pt-3">
              {activeTab === 'recipient' && selectedGroup === 'AB+' && (
                <span className="font-semibold text-purple-700">
                  Universal Recipient: Can receive red blood cells from any blood type.
                </span>
              )}
              {activeTab === 'donor' && selectedGroup === 'O-' && (
                <span className="font-semibold text-rose-700">
                  Universal Red Cell Donor: Critical in emergency trauma when typing cannot wait.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Component-Specific Transfusion Breakdown */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            Component-Specific Compatibility Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Packed Red Blood Cells (PRBC)</div>
              <p className="text-slate-600">
                Antibodies in recipient plasma must not destroy transfused RBC antigens. O- is the
                universal red cell donor.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Fresh Frozen Plasma (FFP)</div>
              <p className="text-slate-600">
                Opposite of red cells! AB plasma contains neither anti-A nor anti-B antibodies,
                making AB the universal plasma donor.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Platelets (Apheresis)</div>
              <p className="text-slate-600">
                ABO-identical platelets are preferred to optimize count increments and avoid
                alloimmunization in repeat transfusion recipients.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-xl font-bold">Ready to make a difference?</h3>
          <p className="text-xs text-slate-300 max-w-md">
            Join thousands of registered donors connected across multiple hospitals. Get notified
            only when your compatible blood group is needed.
          </p>
        </div>
        <Link
          to="/register"
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition shrink-0"
        >
          Register as Donor <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

