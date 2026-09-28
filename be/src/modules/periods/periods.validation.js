const { z } = require('zod');

const closePeriodSchema = z.object({
  year: z.number().int().min(2000),
  month: z.number().int().min(0).max(12),
});

const listPeriodsQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(0).max(12).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = { closePeriodSchema, listPeriodsQuerySchema };
