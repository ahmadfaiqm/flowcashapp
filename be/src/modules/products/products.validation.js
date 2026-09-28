const { z } = require('zod');

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  unit: z.string().max(30).optional(),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
