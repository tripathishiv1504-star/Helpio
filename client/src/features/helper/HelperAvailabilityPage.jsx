import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Spinner,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function HelperAvailabilityPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schedule, setSchedule] = useState(
    DAYS.map((day) => ({
      day,
      enabled: day !== 'sunday',
      start: '09:00',
      end: '18:00',
    }))
  );

  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await api.get('/helpers/me');
        if (res.profile?.weeklyAvailability) {
          const existing = res.profile.weeklyAvailability;
          setSchedule(
            DAYS.map((day) => {
              const found = existing.find((s) => s.day.toLowerCase() === day);
              if (found) {
                return {
                  day,
                  enabled: true,
                  start: found.start || '09:00',
                  end: found.end || '18:00',
                };
              }
              return {
                day,
                enabled: false,
                start: '09:00',
                end: '18:00',
              };
            })
          );
        }
      } catch (err) {
        toast.error('Failed to load schedule: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, []);

  const handleToggle = (idx) => {
    setSchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleTimeChange = (idx, field, val) => {
    setSchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeSchedule = schedule
        .filter((s) => s.enabled)
        .map(({ day, start, end }) => ({ day, start, end }));

      await api.patch('/helpers/me/availability', {
        weeklyAvailability: activeSchedule,
      });

      toast.success('Weekly availability updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update availability');
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Weekly Availability"
        subtitle="Configure the days of the week and working hours when you can accept requests"
        action={
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Save Availability
          </Button>
        }
      />

      <Card title="Working Hours by Day">
        <div className="space-y-3">
          {schedule.map((item, idx) => (
            <div
              key={item.day}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                item.enabled
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer min-w-[130px]">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => handleToggle(idx)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="text-sm font-semibold text-slate-800 capitalize">
                  {item.day}
                </span>
              </label>

              {item.enabled ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">From:</span>
                  <input
                    type="time"
                    value={item.start}
                    onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <span className="text-slate-500">To:</span>
                  <input
                    type="time"
                    value={item.end}
                    onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Day Off (No jobs sent)</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default HelperAvailabilityPage;
