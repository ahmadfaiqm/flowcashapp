const { z } = require('zod');

const createCustomerSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
