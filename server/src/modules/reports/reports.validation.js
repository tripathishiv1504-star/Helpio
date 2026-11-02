import { z } from 'zod';
import { REQUEST_STATUS } from '../../../../shared/constants.js';

export const createReportSchema = z.object({
  requestId: z.string({ required_error: 'Request ID is required' }),
  reason: z
    .string({ required_error: 'Reason is required' })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters'),
});

export const resolveReportSchema = z.object({
  targetStatus: z.enum(
    [REQUEST_STATUS.PAID, REQUEST_STATUS.RATED, REQUEST_STATUS.CANCELLED],
    {
      errorMap: () => ({
        message: 'Target status must be one of: paid, rated, or cancelled',
      }),
    }
  ),
  resolution: z
    .string({ required_error: 'Resolution note is required' })
    .trim()
    .min(3, 'Resolution note must be at least 3 characters')
    .max(1000, 'Resolution note cannot exceed 1000 characters'),
});
