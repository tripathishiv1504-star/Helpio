import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Textarea,
  Select,
  Button,
  Badge,
  Spinner,
  LocationPicker,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import {
  CATEGORY_TYPE,
  URGENCY,
  PRICING_TYPE,
} from '@shared/constants.js';

export function NewRequestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categoriesGrouped, setCategoriesGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedAreaType, setSelectedAreaType] = useState(CATEGORY_TYPE.COMMUNITY);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({
    lat: 28.6139,
    lng: 77.2090,
    address: '',
  });
  const [asap, setAsap] = useState(true);
  const [scheduledFor, setScheduledFor] = useState('');
  const [urgency, setUrgency] = useState(URGENCY.NORMAL);
  const [pricingType, setPricingType] = useState(PRICING_TYPE.FREE);
  const [budget, setBudget] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await api.get('/categories');
        setCategoriesGrouped(data);

        // Pre-select first category in default area
        if (data && data[CATEGORY_TYPE.COMMUNITY]?.[0]) {
          const firstCat = data[CATEGORY_TYPE.COMMUNITY][0];
          setSelectedCategoryId(firstCat._id);
          setSelectedSubcat(firstCat.subcategories[0] || '');
        }
      } catch (err) {
        toast.error('Failed to load service categories: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const handleAreaChange = (type) => {
    setSelectedAreaType(type);
    if (categoriesGrouped && categoriesGrouped[type]?.[0]) {
      const cat = categoriesGrouped[type][0];
      setSelectedCategoryId(cat._id);
      setSelectedSubcat(cat.subcategories[0] || '');
    }

    // Default pricing type per area
    if (type === CATEGORY_TYPE.COMMUNITY) {
      setPricingType(PRICING_TYPE.FREE);
      setBudget('');
    } else if (type === CATEGORY_TYPE.PROFESSIONAL) {
      setPricingType(PRICING_TYPE.FIXED);
    } else if (type === CATEGORY_TYPE.INSTANT) {
      setPricingType(PRICING_TYPE.HOURLY);
    }
  };

  const currentCategory = categoriesGrouped?.[selectedAreaType]?.find(
    (c) => c._id === selectedCategoryId
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategoryId || !selectedSubcat) {
      toast.warning('Please select a category and service subcategory.');
      return;
    }

    if (!description.trim() || description.length < 5) {
      toast.warning('Please provide a clear description (at least 5 characters).');
      return;
    }

    if (!asap && !scheduledFor) {
      toast.warning('Please select a scheduled date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: selectedCategoryId,
        subcategory: selectedSubcat,
        description,
        location,
        asap,
        scheduledFor: !asap ? scheduledFor : undefined,
        urgency,
        pricingType,
        budget: budget ? Number(budget) : undefined,
      };

      const res = await api.post('/requests', payload);
      toast.success('Request posted successfully! Finding nearby helpers...');
      navigate(`/requests/${res.request._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to post request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Post a Need"
        subtitle="Fill in your requirement to find nearby, skilled and verified helpers"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Area Selection Cards */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-3">
            1. Choose Service Area
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                type: CATEGORY_TYPE.COMMUNITY,
                title: 'Community Help',
                tag: 'Free / Volunteer',
                icon: '🤝',
                desc: 'Neighbourly support, elderly care, student tutoring, and mutual aid.',
                border: 'border-emerald-500',
              },
              {
                type: CATEGORY_TYPE.PROFESSIONAL,
                title: 'Professional Help',
                tag: 'Fixed Visit Charge',
                icon: '🔧',
                desc: 'Electricians, plumbers, carpenters, and appliance technicians.',
                border: 'border-primary-500',
              },
              {
                type: CATEGORY_TYPE.INSTANT,
                title: 'Instant Workforce',
                tag: 'Hourly / Immediate',
                icon: '⚡',
                desc: 'Quick hands for moving, deep cleaning, logistics, and urgent tasks.',
                border: 'border-amber-500',
              },
            ].map((area) => (
              <div
                key={area.type}
                onClick={() => handleAreaChange(area.type)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAreaType === area.type
                    ? `${area.border} bg-white shadow-md ring-2 ring-primary-100`
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-2">{area.icon}</div>
                <h4 className="font-bold text-sm text-slate-900">{area.title}</h4>
                <span className="text-[11px] font-semibold text-primary-600 block mb-1.5">
                  {area.tag}
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Subcategory & Description */}
        <Card title="2. Service Details">
          <div className="space-y-4">
            <Select
              label="Select Skill / Subcategory"
              name="subcategory"
              value={selectedSubcat}
              onChange={(e) => setSelectedSubcat(e.target.value)}
              options={
                currentCategory?.subcategories.map((sub) => ({
                  value: sub,
                  label: sub,
                })) || []
              }
              required
            />

            <Textarea
              label="Describe What You Need"
              name="description"
              placeholder="Provide specific details about the job, problem, or equipment (e.g. 'Kitchen sink pipe is leaking under the basin', 'Need two people to help carry furniture downstairs')..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              helperText="Minimum 5 characters"
            />
          </div>
        </Card>

        {/* Location Picker */}
        <Card title="3. Location">
          <LocationPicker
            value={location}
            onChange={(newLoc) => setLocation(newLoc)}
            label="Service Location Pin"
            required
          />
        </Card>

        {/* Timing, Urgency & Pricing */}
        <Card title="4. Timing, Urgency & Pricing">
          <div className="space-y-5">
            {/* ASAP vs Scheduled */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                When do you need help?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAsap(true)}
                  className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${
                    asap
                      ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-100'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  ⚡ ASAP (Right Now)
                </button>
                <button
                  type="button"
                  onClick={() => setAsap(false)}
                  className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${
                    !asap
                      ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-100'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  📅 Schedule for Later
                </button>
              </div>

              {!asap && (
                <div className="mt-3">
                  <Input
                    label="Scheduled Date and Time"
                    name="scheduledFor"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    required={!asap}
                  />
                </div>
              )}
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: URGENCY.NORMAL, label: 'Normal', desc: 'Standard 30 min window' },
                  { value: URGENCY.URGENT, label: 'Urgent', desc: 'Fast 10 min window' },
                  { value: URGENCY.EMERGENCY, label: 'Emergency', desc: 'Immediate 5 min' },
                ].map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgency(u.value)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      urgency === u.value
                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 block">{u.label}</span>
                    <span className="text-[10px] text-slate-500 block">{u.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Type & Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <Select
                label="Pricing Type"
                name="pricingType"
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                options={[
                  { value: PRICING_TYPE.FREE, label: 'Free (Community mutual aid)' },
                  { value: PRICING_TYPE.FIXED, label: 'Fixed visit charge' },
                  { value: PRICING_TYPE.HOURLY, label: 'Hourly rate' },
                ]}
              />

              {pricingType !== PRICING_TYPE.FREE && (
                <Input
                  label="Estimated Budget (₹)"
                  name="budget"
                  type="number"
                  placeholder="e.g. 500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min="0"
                  helperText="Optional reference budget for the helper"
                />
              )}
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full sm:w-auto font-bold shadow-md"
            loading={submitting}
          >
            Post Request & Find Helpers →
          </Button>
        </div>
      </form>
    </div>
  );
}

export default NewRequestPage;
