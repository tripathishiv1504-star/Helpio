import { z } from 'zod';
import { PRICING_TYPE } from '../../../../shared/constants.js';

const skillItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  rate: z.number().min(0, 'Rate must be 0 or greater'),
  rateType: z.enum(Object.values(PRICING_TYPE)),
});

const availabilitySlotSchema = z.object({
  day: z.string().min(1, 'Day is required'),
  start: z.string().min(1, 'Start time is required'),
  end: z.string().min(1, 'End time is required'),
});

export const onboardSchema = z.object({
  bio: z.string().optional().default(''),
  skills: z.array(skillItemSchema).min(1, 'At least one skill is required'),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      coordinates: z.array(z.number()).length(2).optional(),
      address: z.string().optional(),
    })
    .optional(),
  radiusKm: z.number().min(1).max(100).optional().default(10),
  weeklyAvailability: z.array(availabilitySlotSchema).optional().default([]),
});

export const updateProfileSchema = z.object({
  bio: z.string().optional(),
  skills: z.array(skillItemSchema).optional(),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      coordinates: z.array(z.number()).length(2).optional(),
      address: z.string().optional(),
    })
    .optional(),
  radiusKm: z.number().min(1).max(100).optional(),
});

export const availabilitySchema = z.object({
  weeklyAvailability: z.array(availabilitySlotSchema),
});

export const onlineSchema = z.object({
  isOnline: z.boolean(),
});
