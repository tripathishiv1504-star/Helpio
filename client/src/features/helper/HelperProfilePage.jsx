import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Badge,
  Spinner,
  LocationPicker,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { PRICING_TYPE } from '@shared/constants.js';

export function HelperProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categoriesGrouped, setCategoriesGrouped] = useState(null);

  // Form states
  const [bio, setBio] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090, address: '' });
  const [skills, setSkills] = useState([]);

  // Add new skill draft
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('');
  const [skillRate, setSkillRate] = useState('');
  const [skillRateType, setSkillRateType] = useState(PRICING_TYPE.FIXED);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, catRes] = await Promise.all([
          api.get('/helpers/me'),
          api.get('/categories'),
        ]);

        setCategoriesGrouped(catRes);

        if (profileRes.profile) {
          const p = profileRes.profile;
          setProfile(p);
          setBio(p.bio || '');
          setRadiusKm(p.radiusKm || 10);
          if (p.location?.coordinates) {
            setLocation({
              lat: p.location.coordinates[1],
              lng: p.location.coordinates[0],
              address: '',
            });
          }
          if (p.skills) {
            setSkills(
              p.skills.map((s) => ({
                category: typeof s.category === 'object' ? s.category._id : s.category,
                categoryName: typeof s.category === 'object' ? s.category.name : 'Category',
                subcategory: s.subcategory,
                rate: s.rate,
                rateType: s.rateType,
              }))
            );
          }
        }
      } catch (err) {
        toast.error('Failed to load profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

    if (skills.some((s) => s.subcategory === selectedSubcat)) {
      toast.warning('This skill is already in your profile.');
      return;
    }

    const newSkill = {
      category: selectedCatId,
      categoryName: selectedCategoryObj?.name || 'Category',
      subcategory: selectedSubcat,
      rate: Number(skillRate),
      rateType: skillRateType,
    };

    setSkills([...skills, newSkill]);
    setSelectedSubcat('');
    setSkillRate('');
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (skills.length === 0) {
      toast.warning('You must offer at least one skill.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        bio,
        radiusKm: Number(radiusKm),
        location,
        skills: skills.map(({ category, subcategory, rate, rateType }) => ({
          category,
          subcategory,
          rate,
          rateType,
        })),
      };

      const res = await api.patch('/helpers/me', payload);
      setProfile(res.profile);
      toast.success('Helper profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Skills & Work Area"
        subtitle="Update your bio, offered skills, base location, and maximum travel radius"
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bio Card */}
        <Card title="Introduction & Bio">
          <div className="space-y-2">
            <textarea
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about your trade experience, certifications, and reliability..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </Card>

        {/* Skills Card */}
        <Card title="Offered Skills & Rates">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase">Add Another Skill</h4>
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
                placeholder="Select subcategory"
                disabled={!selectedCategoryObj}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Rate (₹)"
                name="rate"
                type="number"
                placeholder="e.g. 350"
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
        </Card>

        {/* Location & Radius Card */}
        <Card title="Base Location and Coverage Radius">
          <LocationPicker
            value={location}
            onChange={(newLoc) => setLocation(newLoc)}
            label="Base Coordinates"
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
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" loading={saving}>
            Save All Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default HelperProfilePage;
