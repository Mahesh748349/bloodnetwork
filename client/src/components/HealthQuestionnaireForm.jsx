import React, { useState } from 'react';
import { questionnaireService } from '../services/questionnaireService';
import { ShieldCheck, AlertCircle, CheckCircle, FileText, X } from 'lucide-react';

export const HealthQuestionnaireForm = ({ onClose, onSuccess, bloodRequestId = null }) => {
  const [formData, setFormData] = useState({
    recentIllness: false,
    recentIllnessDetails: '',
    recentMedications: false,
    recentMedicationsDetails: '',
    recentTravel: false,
    recentTravelCountries: '',
    weightKg: 65,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    hemoglobinSelfReport: 14.0,
    lastMealHoursAgo: 3,
    alcoholLast24h: false,
    tattooPiercingLast6m: false,
    pregnantOrRecentBirth: false,
    consentToScreening: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consentToScreening) {
      setError('You must confirm and consent to the health declaration.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        bloodRequestId,
        recentIllness: {
          hasIllness: formData.recentIllness,
          details: formData.recentIllnessDetails,
        },
        recentMedications: {
          onMedications: formData.recentMedications,
          details: formData.recentMedicationsDetails,
        },
        recentTravel: {
          hasTraveled: formData.recentTravel,
          countries: formData.recentTravelCountries,
        },
        weightKg: Number(formData.weightKg),
        bloodPressureSystolic: Number(formData.bloodPressureSystolic),
        bloodPressureDiastolic: Number(formData.bloodPressureDiastolic),
        hemoglobinSelfReport: Number(formData.hemoglobinSelfReport),
        lastMealHoursAgo: Number(formData.lastMealHoursAgo),
        alcoholLast24h: formData.alcoholLast24h,
        tattooPiercingLast6m: formData.tattooPiercingLast6m,
        pregnantOrRecentBirth: formData.pregnantOrRecentBirth,
        consentToScreening: true,
      };

      const res = await questionnaireService.submitQuestionnaire(payload);
      if (res.success) {
        setResult(res);
        if (onSuccess) onSuccess(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error submitting questionnaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="text-lg font-bold text-slate-900">Pre-Donation Health Screening</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="py-6 text-center space-y-4">
            {result.screeningResult === 'passed' ? (
              <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="w-12 h-12" />
              </div>
            ) : (
              <div className="inline-flex p-4 rounded-full bg-amber-100 text-amber-600">
                <AlertCircle className="w-12 h-12" />
              </div>
            )}

            <h4 className="text-xl font-bold text-slate-900">
              {result.screeningResult === 'passed'
                ? 'Pre-Donation Clearance Approved!'
                : 'Clinical Review Flagged'}
            </h4>

            <p className="text-sm text-slate-600 max-w-md mx-auto">{result.message}</p>

            {result.flaggedReasons?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-w-md mx-auto text-xs text-amber-900 space-y-1">
                <div className="font-bold mb-1">Flagged Factors for Staff Evaluation:</div>
                {result.flaggedReasons.map((reason, idx) => (
                  <div key={idx}>• {reason}</div>
                ))}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Close & Continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs text-slate-700">
            <p className="text-slate-500 text-xs">
              This digital pre-screening questionnaire follows standard National Blood Transfusion
              Council guidelines to protect both you and the recipient.
            </p>

            {/* Screening Questions Grid */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span>Any fever, cold, or illness in the past 7 days?</span>
                <input
                  type="checkbox"
                  name="recentIllness"
                  checked={formData.recentIllness}
                  onChange={handleChange}
                  className="w-4 h-4 text-rose-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Alcohol consumption within the last 24 hours?</span>
                <input
                  type="checkbox"
                  name="alcoholLast24h"
                  checked={formData.alcoholLast24h}
                  onChange={handleChange}
                  className="w-4 h-4 text-rose-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Tattoo, acupuncture, or piercing in the last 6 months?</span>
                <input
                  type="checkbox"
                  name="tattooPiercingLast6m"
                  checked={formData.tattooPiercingLast6m}
                  onChange={handleChange}
                  className="w-4 h-4 text-rose-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Pregnancy or child delivery within the last 12 months?</span>
                <input
                  type="checkbox"
                  name="pregnantOrRecentBirth"
                  checked={formData.pregnantOrRecentBirth}
                  onChange={handleChange}
                  className="w-4 h-4 text-rose-600 rounded"
                />
              </div>
            </div>

            {/* Vitals & Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Weight (kg)*
                </label>
                <input
                  type="number"
                  name="weightKg"
                  min="35"
                  max="160"
                  value={formData.weightKg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  BP Systolic (mmHg)
                </label>
                <input
                  type="number"
                  name="bloodPressureSystolic"
                  value={formData.bloodPressureSystolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  BP Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  name="bloodPressureDiastolic"
                  value={formData.bloodPressureDiastolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hemoglobin (g/dL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="hemoglobinSelfReport"
                  value={formData.hemoglobinSelfReport}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Consent Box */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentToScreening"
                  checked={formData.consentToScreening}
                  onChange={handleChange}
                  className="w-4 h-4 text-rose-600 rounded mt-0.5"
                  required
                />
                <span className="text-[11px] text-slate-700 leading-relaxed">
                  I solemnly declare that all statements provided above are true and complete. I
                  understand that accurate disclosure is vital for clinical safety.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                {loading ? 'Submitting...' : 'Submit & Pre-Clear'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

