import { z } from 'zod';
import { CATEGORY_TYPE, VERIFICATION_STATUS } from '../../../../shared/constants.js';

export const verifyHelperSchema = z.object({
  verificationStatus: z.enum([
    VERIFICATION_STATUS.APPROVED,
    VERIFICATION_STATUS.REJECTED,
  ]),
  note: z.string().trim().max(500).optional().default(''),
});

export const createCategorySchema = z.object({
  name: z.string({ required_error: 'Category name is required' }).trim().min(2),
  type: z.enum(Object.values(CATEGORY_TYPE)),
  subcategories: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one subcategory is required'),
  active: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  type: z.enum(Object.values(CATEGORY_TYPE)).optional(),
  subcategories: z.array(z.string().trim().min(1)).optional(),
  active: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  commissionPercent: z
    .number({ required_error: 'Commission percentage is required' })
    .min(0, 'Commission cannot be negative')
    .max(100, 'Commission cannot exceed 100%'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended'], {
    required_error: 'User status must be either active or suspended',
  }),
});
