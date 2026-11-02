import { z } from 'zod';

export const createRatingSchema = z.object({
  stars: z
    .number({ required_error: 'Stars rating is required' })
    .int('Stars must be an integer between 1 and 5')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional()
    .default(''),
});
