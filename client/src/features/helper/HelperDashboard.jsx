import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Spinner,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { VERIFICATION_STATUS } from '@shared/constants.js';

export function HelperDashboard() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/helpers/me');
      setProfile(data.profile);
    } catch (err) {
      toast.error('Failed to load helper profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleToggleOnline = async () => {
    if (!profile) return;
    if (profile.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      toast.warning('Your profile must be approved by an administrator before going online.');
      return;
    }

    setTogglingOnline(true);
    try {
      const newStatus = !profile.isOnline;
      const res = await api.patch('/helpers/me/online', { isOnline: newStatus });
      setProfile((prev) => ({ ...prev, isOnline: res.isOnline }));
      toast.success(res.isOnline ? 'You are now ONLINE and ready for offers!' : 'You are now OFFLINE.');
    } catch (err) {
      toast.error(err.message || 'Failed to update online status');
    } finally {
      setTogglingOnline(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not onboarded yet
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center mx-auto text-3xl mb-4 shadow-sm">
          🛠️
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Helper Portal!</h2>
        <p className="text-slate-600 mb-6 text-sm max-w-md mx-auto">
          You haven't completed your helper profile yet. Tell us about your skills, service radius, and
          working hours so we can start matching you with local requests.
        </p>
        <Link to="/helper/onboard">
          <Button variant="primary" size="lg" className="shadow-md">
            Start Helper Onboarding →
          </Button>
        </Link>
      </div>
    );
  }

  const isApproved = profile.verificationStatus === VERIFICATION_STATUS.APPROVED;
  const isPending = profile.verificationStatus === VERIFICATION_STATUS.PENDING;
  const isRejected = profile.verificationStatus === VERIFICATION_STATUS.REJECTED;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Verification Status Banner */}
      {isPending && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 shadow-sm">
          <span className="text-2xl">⏳</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Profile Pending Verification</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Your onboarding information has been submitted. An administrator is currently reviewing
              your profile. You will be able to toggle online once approved.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 shadow-sm">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Profile Verified & Active</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your helper account is verified! Toggle yourself online to receive incoming requests in
              your radius.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Profile Verification Rejected</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Note from administrator: {profile.verificationNote || 'No specific note provided.'}
            </p>
            <div className="mt-2">
              <Link to="/helper/profile" className="text-xs font-semibold text-rose-800 underline">
                Update Profile to re-apply →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header with Online/Offline Toggle */}
      <PageHeader
        title="Helper Dashboard"
        subtitle="Manage your live availability, review earnings, and monitor incoming jobs"
        action={
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span
              className={`w-3 h-3 rounded-full ${
                profile.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
              }`}
            />
            <span className="text-xs font-bold text-slate-700">
              {profile.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <Button
              size="sm"
              variant={profile.isOnline ? 'secondary' : 'primary'}
              disabled={!isApproved}
              loading={togglingOnline}
              onClick={handleToggleOnline}
            >
              {profile.isOnline ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        }
      />

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="text-center p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Rating
          </span>
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {profile.stats?.ratingAvg ? profile.stats.ratingAvg.toFixed(1) : '3.5'}
            </span>
            <span className="text-amber-500 text-lg">⭐</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {profile.stats?.ratingCount || 0} reviews
          </span>
        </Card>

        <Card className="text-center p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Completed Jobs
          </span>
          <div className="text-2xl font-extrabold text-slate-900">
            {profile.stats?.completed || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Accepted: {profile.stats?.accepted || 0}
          </span>
        </Card>

        <Card className="text-center p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Earnings
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">
            ₹{profile.earningsTotal || 0}
          </div>
          <Link to="/helper/earnings" className="text-[11px] text-primary-600 hover:underline mt-1 block">
            View breakdown →
          </Link>
        </Card>

        <Card className="text-center p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Work Radius
          </span>
          <div className="text-2xl font-extrabold text-slate-900">
            {profile.radiusKm || 10} <span className="text-sm font-normal text-slate-500">km</span>
          </div>
          <Link to="/helper/profile" className="text-[11px] text-primary-600 hover:underline mt-1 block">
            Edit area →
          </Link>
        </Card>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Skills & Coverage"
          subtitle="Manage your services, rates and travel distance"
          action={
            <Link to="/helper/profile">
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {profile.skills?.map((s, idx) => (
                <Badge key={idx} variant="primary">
                  {s.subcategory} (₹{s.rate} · {s.rateType})
                </Badge>
              ))}
            </div>
            {profile.bio && (
              <p className="text-xs text-slate-500 italic mt-3 pt-3 border-t border-slate-100">
                "{profile.bio}"
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Weekly Availability"
          subtitle="Set the working hours when you can accept requests"
          action={
            <Link to="/helper/availability">
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            </Link>
          }
        >
          <div className="space-y-1.5 text-xs text-slate-600">
            {profile.weeklyAvailability?.length > 0 ? (
              profile.weeklyAvailability.map((slot, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                  <span className="capitalize font-medium text-slate-800">{slot.day}</span>
                  <span className="text-slate-500">
                    {slot.start} – {slot.end}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic">No scheduled hours set</p>
            )}
          </div>
        </Card>

        <Card
          title="Quick Links"
          subtitle="Direct shortcuts for helper operations"
        >
          <div className="flex flex-col gap-2">
            <Link
              to="/helper/earnings"
              className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>💰 Earnings & Payments</span>
              <span>→</span>
            </Link>
            <Link
              to="/profile"
              className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>👤 Account Settings</span>
              <span>→</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default HelperDashboard;
