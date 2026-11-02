import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Textarea,
  Badge,
  Spinner,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { REQUEST_STATUS, PRICING_TYPE } from '@shared/constants.js';

function RatingComponent({ request, user, onRefresh }) {
  const { toast } = useToast();
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [helperStats, setHelperStats] = useState(null);
  const [loadingRatings, setLoadingRatings] = useState(true);

  const userId = user?._id || user?.id;
  const isOwner =
    String(request.user?._id || request.user?.id || request.user) === String(userId);
  const isHelper =
    String(request.helper?._id || request.helper?.id || request.helper) === String(userId);

  const helperUserId =
    request.helper?._id || request.helper?.id || request.helper;

  // Fetch submitted ratings for this request
  const fetchRatings = useCallback(async () => {
    try {
      const data = await api.get(`/ratings/request/${request._id}`);
      setRatings(data.ratings || []);

      // If owner, also fetch helper's overall public rating stats
      if (isOwner && helperUserId) {
        try {
          const statsData = await api.get(`/ratings/helper/${helperUserId}`);
          setHelperStats(statsData);
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.warn('Failed to fetch request ratings:', err.message);
    } finally {
      setLoadingRatings(false);
    }
  }, [request._id, isOwner, helperUserId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Check if current user has already submitted a rating
  const myExistingRating = ratings.find(
    (r) => String(r.from?._id || r.from) === String(userId)
  );

  // Check if the other party submitted a rating
  const otherRating = ratings.find(
    (r) => String(r.from?._id || r.from) !== String(userId)
  );

  // Determine whether current user can submit rating
  const isPaidJob = request.pricingType !== PRICING_TYPE.FREE;
  let canRate = false;

  if (!myExistingRating) {
    if (isOwner) {
      if (isPaidJob) {
        canRate = request.status === REQUEST_STATUS.PAID;
      } else {
        canRate = request.status === REQUEST_STATUS.COMPLETED;
      }
    } else if (isHelper) {
      canRate = [
        REQUEST_STATUS.COMPLETED,
        REQUEST_STATUS.PAID,
        REQUEST_STATUS.RATED,
      ].includes(request.status);
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (stars < 1 || stars > 5) {
      toast.error('Please choose a rating between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/ratings/${request._id}`, {
        stars,
        comment: comment.trim(),
      });
      toast.success('Thank you! Your review has been submitted.');
      setComment('');
      fetchRatings();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⭐</span>
            Ratings & Reviews
          </h3>
          <p className="text-xs text-slate-500">
            {isOwner
              ? 'Rate the service provided by your assigned helper.'
              : 'Review your experience with this customer.'}
          </p>
        </div>

        {/* Helper's overall rating summary shown to the owner */}
        {isOwner && helperStats && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-900">
            <span className="font-bold text-sm">★ {helperStats.average || '3.5'}</span>
            <span className="text-amber-700">
              ({helperStats.count || 0} helper review{helperStats.count === 1 ? '' : 's'})
            </span>
          </div>
        )}
      </div>

      {loadingRatings ? (
        <div className="py-6 flex justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Display Existing Rating if submitted */}
          {myExistingRating && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Your Submitted Review
                </span>
                <div className="flex text-amber-500 text-base">
                  {'★'.repeat(myExistingRating.stars)}
                  {'☆'.repeat(5 - myExistingRating.stars)}
                </div>
              </div>
              {myExistingRating.comment ? (
                <p className="text-sm text-slate-800 italic">
                  "{myExistingRating.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No comment provided.</p>
              )}
            </div>
          )}

          {/* Display Other Party's Review if available */}
          {otherRating && (
            <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                  Review from {otherRating.from?.name || 'Counterparty'}
                </span>
                <div className="flex text-amber-500 text-base">
                  {'★'.repeat(otherRating.stars)}
                  {'☆'.repeat(5 - otherRating.stars)}
                </div>
              </div>
              {otherRating.comment && (
                <p className="text-sm text-slate-800 italic">
                  "{otherRating.comment}"
                </p>
              )}
            </div>
          )}

          {/* Form to submit rating */}
          {canRate && (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Choose Star Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => setStars(starNum)}
                      onMouseEnter={() => setHoverStars(starNum)}
                      onMouseLeave={() => setHoverStars(0)}
                      className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                    >
                      <span
                        className={
                          (hoverStars || stars) >= starNum
                            ? 'text-amber-500'
                            : 'text-slate-300'
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-600">
                    {stars} out of 5 stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Comments or Feedback (Optional)
                </label>
                <Textarea
                  rows={3}
                  maxLength={1000}
                  placeholder={
                    isOwner
                      ? 'Share your experience with the helper...'
                      : 'Add comments about this customer...'
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto font-semibold px-6"
                loading={submitting}
              >
                Submit Review
              </Button>
            </form>
          )}

          {!canRate && !myExistingRating && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {isOwner && isPaidJob && request.status !== REQUEST_STATUS.PAID && (
                <span>Rating will unlock as soon as payment is settled.</span>
              )}
              {isOwner && !isPaidJob && request.status !== REQUEST_STATUS.COMPLETED && (
                <span>Rating will unlock once the helper completes the task.</span>
              )}
              {isHelper && (
                <span>You can review the customer once the request is marked completed.</span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default {
  id: 'rating',
  order: 50,
  visibleWhen: (request, user) => {
    if (!request || !user) return false;
    const userId = user._id || user.id;
    const ownerId = request.user?._id || request.user?.id || request.user;
    const helperId = request.helper?._id || request.helper?.id || request.helper;

    const isParticipant =
      String(ownerId) === String(userId) ||
      String(helperId) === String(userId) ||
      (user.roles && user.roles.includes('admin'));

    // Rating is relevant once completed, paid, or rated
    const isReadyForRating = [
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
    ].includes(request.status);

    return isParticipant && isReadyForRating;
  },
  Component: RatingComponent,
};
