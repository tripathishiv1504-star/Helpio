import mongoose from 'mongoose';
import { CATEGORY_TYPE } from '../../../shared/constants.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(CATEGORY_TYPE),
      required: true,
      index: true,
    },
    subcategories: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
