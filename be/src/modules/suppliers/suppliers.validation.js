const { z } = require('zod');

const createSupplierSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

module.exports = { createSupplierSchema, updateSupplierSchema };
