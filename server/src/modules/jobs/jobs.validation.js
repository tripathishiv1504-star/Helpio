import { z } from 'zod';

export const completeJobSchema = z.object({
  finalAmount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = Number(val);
      if (isNaN(num)) throw new Error('Final amount must be a valid number');
      return num;
    }),
});

export const createMessageSchema = z.object({
  text: z
    .string({ required_error: 'Message text is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
});
