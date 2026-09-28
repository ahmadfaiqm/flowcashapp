const { z } = require('zod');

const createCapitalMovementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  type: z.enum(['initial', 'additional', 'prive']),
  amount: z.number().positive('amount must be > 0'),
  description: z.string().max(500).optional(),
});

const listCapitalMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(['initial', 'additional', 'prive']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = { createCapitalMovementSchema, listCapitalMovementsQuerySchema };
