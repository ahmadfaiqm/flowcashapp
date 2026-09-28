const { z } = require('zod');

const createBusinessSchema = z.object({
  businessName: z.string().min(2).max(150),
  address: z.string().optional(),
  phone: z.string().max(30).optional(),
  taxId: z.string().max(50).optional(),
  baseCurrency: z.string().max(10).optional(),
  initialCapital: z.coerce.number().nonnegative().optional(),
});

const updateBusinessSchema = z.object({
  businessName: z.string().min(2).max(150).optional(),
  address: z.string().optional(),
  phone: z.string().max(30).optional(),
  taxId: z.string().max(50).optional(),
  baseCurrency: z.string().max(10).optional(),
});

module.exports = { createBusinessSchema, updateBusinessSchema };
