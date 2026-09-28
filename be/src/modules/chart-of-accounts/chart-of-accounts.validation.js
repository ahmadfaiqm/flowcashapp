const { z } = require('zod');

const createCoASchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  accountType: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parentId: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateCoASchema = createCoASchema.partial();

module.exports = { createCoASchema, updateCoASchema };
