import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Select,
  Button,
  LocationPicker,
  PageHeader,
  Badge,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { PRICING_TYPE } from '@shared/constants.js';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function HelperOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [categoriesGrouped, setCategoriesGrouped] = useState(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [location, setLocation] = useState({
    lat: 28.6139,
    lng: 77.2090,
    address: '',
  });
  const [radiusKm, setRadiusKm] = useState(10);
  const [availability, setAvailability] = useState(
    DAYS.map((day) => ({
      day,
      enabled: day !== 'sunday',
      start: '09:00',
      end: '18:00',
    }))
  );

  // Current skill input draft
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('');
  const [skillRate, setSkillRate] = useState('');
  const [skillRateType, setSkillRateType] = useState(PRICING_TYPE.FIXED);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await api.get('/categories');
        setCategoriesGrouped(data);
      } catch (err) {
        toast.error('Failed to load categories: ' + err.message);
      } finally {
        setLoadingCats(false);
      }
    }
    loadCategories();
  }, []);

  // Flatten all categories for quick lookup
  const allCategories = [];
  if (categoriesGrouped) {
    for (const group in categoriesGrouped) {
      allCategories.push(...categoriesGrouped[group]);
    }
  }

  const selectedCategoryObj = allCategories.find((c) => c._id === selectedCatId);

  const handleAddSkill = () => {
    if (!selectedCatId || !selectedSubcat || skillRate === '') {
      toast.warning('Please select category, subcategory and rate.');
      return;
    }

    const rateNum = Number(skillRate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.warning('Rate must be 0 or greater.');
      return;
    }

    // Check duplicate subcategory
    if (skills.some((s) => s.subcategory === selectedSubcat)) {
      toast.warning('This skill has already been added.');
      return;
    }

    const newSkill = {
      category: selectedCatId,
      categoryName: selectedCategoryObj?.name || 'Category',
      subcategory: selectedSubcat,
      rate: rateNum,
      rateType: skillRateType,
    };

    setSkills([...skills, newSkill]);
    setSelectedSubcat('');
    setSkillRate('');
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleDayToggle = (dayIndex) => {
    setAvailability((prev) =>
      prev.map((item, idx) =>
        idx === dayIndex ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleTimeChange = (dayIndex, field, value) => {
    setAvailability((prev) =>
      prev.map((item, idx) =>
        idx === dayIndex ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (skills.length === 0) {
      toast.warning('Please add at least one skill.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const activeSchedule = availability
        .filter((a) => a.enabled)
        .map(({ day, start, end }) => ({ day, start, end }));

      const payload = {
        bio,
        skills: skills.map(({ category, subcategory, rate, rateType }) => ({
          category,
          subcategory,
          rate,
          rateType,
        })),
        location,
        radiusKm: Number(radiusKm),
        weeklyAvailability: activeSchedule,
      };

      await api.post('/helpers/onboard', payload);
      toast.success('Onboarding submitted! Your profile is pending approval.');
      navigate('/helper');
    } catch (err) {
      toast.error(err.message || 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PageHeader
        title="Helper Onboarding"
        subtitle="Complete your profile to start receiving local job requests"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        {[
          { num: 1, label: 'Skills & Rates' },
          { num: 2, label: 'Location & Radius' },
          { num: 3, label: 'Availability' },
          { num: 4, label: 'Review & Submit' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              step === s.num
                ? 'text-primary-600 font-bold'
                : step > s.num
                ? 'text-emerald-600 font-medium'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num
                  ? 'bg-primary-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className="hidden sm:inline text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Skills and Rates */}
      {step === 1 && (
        <Card title="Step 1: Your Skills and Rates">
          <p className="text-xs text-slate-500 mb-4">
            Select the services you can deliver and set your rate for each skill.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Add a Skill</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Category"
                name="category"
                value={selectedCatId}
                onChange={(e) => {
                  setSelectedCatId(e.target.value);
                  setSelectedSubcat('');
                }}
                options={allCategories.map((c) => ({
                  value: c._id,
                  label: `${c.name} (${c.type})`,
                }))}
                placeholder="Select category"
              />

              <Select
                label="Subcategory / Skill"
                name="subcategory"
                value={selectedSubcat}
                onChange={(e) => setSelectedSubcat(e.target.value)}
                options={
                  selectedCategoryObj?.subcategories.map((sub) => ({
                    value: sub,
                    label: sub,
                  })) || []
                }
                placeholder="Select skill"
                disabled={!selectedCategoryObj}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Rate (₹)"
                name="rate"
                type="number"
                placeholder="e.g. 250"
                value={skillRate}
                onChange={(e) => setSkillRate(e.target.value)}
                min="0"
              />

              <Select
                label="Pricing Type"
                name="rateType"
                value={skillRateType}
                onChange={(e) => setSkillRateType(e.target.value)}
                options={[
                  { value: PRICING_TYPE.FIXED, label: 'Fixed visit charge' },
                  { value: PRICING_TYPE.HOURLY, label: 'Hourly rate' },
                  { value: PRICING_TYPE.FREE, label: 'Free (Volunteer)' },
                ]}
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={handleAddSkill}>
                + Add Skill
              </Button>
            </div>
          </div>

          {/* Added Skills List */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">
              Added Skills ({skills.length})
            </h4>
            {skills.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No skills added yet. Add at least one above.</p>
            ) : (
              <div className="space-y-2">
                {skills.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800 capitalize">
                        {s.subcategory}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({s.categoryName})
                      </span>
                      <div className="text-xs text-primary-600 font-semibold mt-0.5">
                        {s.rate === 0 ? 'Free' : `₹${s.rate}`} · {s.rateType}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="primary"
              disabled={skills.length === 0}
              onClick={() => setStep(2)}
            >
              Next: Location & Radius →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Location and Service Radius */}
      {step === 2 && (
        <Card title="Step 2: Base Location and Work Radius">
          <p className="text-xs text-slate-500 mb-4">
            Pick your base location and how far (in kilometers) you are willing to travel for jobs.
          </p>

          <LocationPicker
            value={location}
            onChange={(newLoc) => setLocation(newLoc)}
            label="Base Location"
            className="mb-6"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Service Radius: <span className="font-bold text-primary-600">{radiusKm} km</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-primary-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1 km (immediate neighbourhood)</span>
              <span>25 km</span>
              <span>50 km (citywide)</span>
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep(3)}>
              Next: Availability →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Weekly Availability */}
      {step === 3 && (
        <Card title="Step 3: Weekly Availability">
          <p className="text-xs text-slate-500 mb-4">
            Specify the days and hours you are available to accept jobs.
          </p>

          <div className="space-y-3">
            {availability.map((item, idx) => (
              <div
                key={item.day}
                className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.enabled
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => handleDayToggle(idx)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-semibold text-slate-800 capitalize">
                    {item.day}
                  </span>
                </label>

                {item.enabled ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">From</span>
                    <input
                      type="time"
                      value={item.start}
                      onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 text-xs"
                    />
                    <span className="text-slate-500">To</span>
                    <input
                      type="time"
                      value={item.end}
                      onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Day off</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep(4)}>
              Next: Review & Submit →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Review and Submit */}
      {step === 4 && (
        <Card title="Step 4: Review and Submit">
          <p className="text-xs text-slate-500 mb-4">
            Review your information before submitting for administrator verification.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short Bio / Introduction
              </label>
              <textarea
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly describe your experience, tools, and background..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Offered Skills ({skills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <Badge key={i} variant="primary">
                    {s.subcategory} (₹{s.rate} · {s.rateType})
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Coverage Area
              </h4>
              <p className="text-xs text-slate-700">
                Base: {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Service radius: {radiusKm} km</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Availability
              </h4>
              <p className="text-xs text-slate-700">
                Active on {availability.filter((a) => a.enabled).length} days a week
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button
              type="button"
              variant="accent"
              size="lg"
              loading={submitting}
              onClick={handleSubmit}
            >
              Submit Onboarding Profile
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default HelperOnboarding;
