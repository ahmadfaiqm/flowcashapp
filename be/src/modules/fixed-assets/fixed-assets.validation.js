const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createFixedAssetSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  acquisitionDate: z.string().regex(dateRegex, 'acquisitionDate must be YYYY-MM-DD'),
  acquisitionCost: z.number().min(0),
  usefulLifeMonths: z.number().int().positive(),
  residualValue: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional(),
});

const updateFixedAssetSchema = createFixedAssetSchema.partial();

const depreciateSchema = z.object({
  depreciationDate: z.string().regex(dateRegex, 'depreciationDate must be YYYY-MM-DD'),
});

module.exports = { createFixedAssetSchema, updateFixedAssetSchema, depreciateSchema };
