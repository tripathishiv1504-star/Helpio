import mongoose from 'mongoose';
import {
  REQUEST_STATUS,
  URGENCY,
  PRICING_TYPE,
} from '../../../shared/constants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    actor: {
      type: String, // 'user', 'helper', 'admin', 'system'
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
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
      address: {
        type: String,
        default: '',
        trim: true,
      },
    },
    asap: {
      type: Boolean,
      default: true,
    },
    scheduledFor: {
      type: Date,
    },
    urgency: {
      type: String,
      enum: Object.values(URGENCY),
      default: URGENCY.NORMAL,
      index: true,
    },
    pricingType: {
      type: String,
      enum: Object.values(PRICING_TYPE),
      required: true,
    },
    budget: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.POSTED,
      index: true,
    },
    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    searchRadiusKm: {
      type: Number,
      default: 10,
    },
    finalAmount: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceRequestSchema.index({ location: '2dsphere' });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

export const ServiceRequest =
  mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;
