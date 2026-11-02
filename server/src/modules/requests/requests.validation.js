import { z } from 'zod';
import { URGENCY, PRICING_TYPE } from '../../../../shared/constants.js';

export const createRequestSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  location: z.object({
    lat: z.number({ required_error: 'Latitude is required' }),
    lng: z.number({ required_error: 'Longitude is required' }),
    address: z.string().optional().default(''),
  }),
  asap: z.boolean().optional().default(true),
  scheduledFor: z.string().optional(),
  urgency: z.enum(Object.values(URGENCY)).optional().default(URGENCY.NORMAL),
  pricingType: z.enum(Object.values(PRICING_TYPE)),
  budget: z.number().min(0, 'Budget must be 0 or greater').optional(),
  searchRadiusKm: z.number().min(1).max(100).optional().default(10),
});
