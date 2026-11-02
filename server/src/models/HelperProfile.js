import mongoose from 'mongoose';
import { PRICING_TYPE, VERIFICATION_STATUS } from '../../../shared/constants.js';

const skillSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    rateType: {
      type: String,
      enum: Object.values(PRICING_TYPE),
      required: true,
    },
  },
  { _id: false }
);

const weeklyAvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true, // 'monday', 'tuesday', etc.
    },
    start: {
      type: String,
      required: true, // e.g. '09:00'
    },
    end: {
      type: String,
      required: true, // e.g. '18:00'
    },
  },
  { _id: false }
);

const helperProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    skills: {
      type: [skillSchema],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    radiusKm: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    weeklyAvailability: {
      type: [weeklyAvailabilitySchema],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
      index: true,
    },
    verificationNote: {
      type: String,
      default: '',
    },
    stats: {
      ratingAvg: {
        type: Number,
        default: 3.5, // PRD specifies new helpers start at 3.5 prior
      },
      ratingCount: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      accepted: {
        type: Number,
        default: 0,
      },
      offered: {
        type: Number,
        default: 0,
      },
    },
    earningsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index on location
helperProfileSchema.index({ location: '2dsphere' });

export const HelperProfile =
  mongoose.models.HelperProfile || mongoose.model('HelperProfile', helperProfileSchema);
export default HelperProfile;
