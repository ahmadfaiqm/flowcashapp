const { z } = require('zod');

const createTaxSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

const updateTaxSchema = createTaxSchema.partial();

module.exports = { createTaxSchema, updateTaxSchema };
