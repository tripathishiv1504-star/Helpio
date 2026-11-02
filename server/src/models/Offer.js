import mongoose from 'mongoose';
import { OFFER_STATUS } from '../../../shared/constants.js';

const offerSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
      index: true,
    },
    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.SENT,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: only one offer per request per helper
offerSchema.index({ request: 1, helper: 1 }, { unique: true });

export const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
export default Offer;
