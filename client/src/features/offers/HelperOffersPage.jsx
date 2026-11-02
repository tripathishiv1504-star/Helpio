import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Spinner,
  PageHeader,
  EmptyState,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';

export function HelperOffersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const fetchOffers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.get('/offers/mine');
      setOffers(data.offers || []);
    } catch (err) {
      console.warn('Failed to fetch offers:', err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch and 5-second polling interval
  useEffect(() => {
    fetchOffers(true);

    const pollInterval = setInterval(() => {
      fetchOffers(false);
    }, 5000);

    const clockInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const handleAccept = async (offerId) => {
    setActingId(offerId);
    try {
      const res = await api.post(`/offers/${offerId}/accept`);
      toast.success('Congratulations! You accepted the job.');
      // Remove from list or navigate to request detail
      setOffers((prev) => prev.filter((o) => o._id !== offerId));
      if (res.request?._id) {
        navigate(`/requests/${res.request._id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to accept offer');
      // Refresh list in case another helper took it
      fetchOffers(false);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (offerId) => {
    setActingId(offerId);
    try {
      await api.post(`/offers/${offerId}/reject`);
      toast.info('Offer declined.');
      setOffers((prev) => prev.filter((o) => o._id !== offerId));
    } catch (err) {
      toast.error(err.message || 'Failed to decline offer');
    } finally {
      setActingId(null);
    }
  };

  const formatCountdown = (expiresAt) => {
    const diff = Math.max(0, new Date(expiresAt).getTime() - now);
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Incoming Job Offers"
        subtitle="Live nearby requests matched to your skills. First to accept wins the job!"
        action={
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live radar active (5s polling)</span>
          </div>
        }
      />

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon="📡"
          title="No active offers at the moment"
          description="Keep your status Online. When a user posts a request within your service radius that matches your skills, it will pop up here with a live countdown timer."
          action={
            <Link to="/helper">
              <Button variant="secondary" size="sm">
                Check Online Status
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const req = offer.request;
            const isEmergency = req?.urgency === 'emergency';
            const isUrgent = req?.urgency === 'urgent';
            const countdownStr = formatCountdown(offer.expiresAt);

            return (
              <Card
                key={offer._id}
                className={`p-5 transition-all border-2 ${
                  isEmergency
                    ? 'border-rose-400 bg-rose-50/20'
                    : isUrgent
                    ? 'border-amber-400 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 capitalize">
                        {req?.subcategory || 'Service'}
                      </span>
                      <Badge
                        variant={
                          isEmergency ? 'danger' : isUrgent ? 'warning' : 'primary'
                        }
                      >
                        {req?.urgency || 'Normal'}
                      </Badge>
                      <Badge variant="neutral">
                        📍 {offer.distanceKm ? `${offer.distanceKm} km away` : 'Nearby'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                      {req?.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Pricing</span>
                        <span className="font-semibold text-slate-800">
                          {req?.pricingType === 'free'
                            ? 'Free / Volunteer'
                            : req?.budget
                            ? `₹${req.budget}`
                            : req?.pricingType}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Timing</span>
                        <span className="font-semibold text-slate-800">
                          {req?.asap ? '⚡ ASAP' : 'Scheduled'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block text-[10px] uppercase">Area</span>
                        <span className="text-slate-700 truncate block">
                          {req?.location?.address || 'Nearby Area'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Countdown */}
                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Offer expires in
                      </span>
                      <span className="text-lg font-mono font-extrabold text-rose-600">
                        ⏱️ {countdownStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-500 hover:text-slate-800"
                        disabled={actingId === offer._id}
                        onClick={() => handleReject(offer._id)}
                      >
                        Decline
                      </Button>
                      <Button
                        size="md"
                        variant="accent"
                        className="font-bold shadow-md flex-1 sm:flex-initial"
                        loading={actingId === offer._id}
                        onClick={() => handleAccept(offer._id)}
                      >
                        Accept Job →
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HelperOffersPage;
