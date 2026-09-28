const { z } = require('zod');

const createCashBankAccountSchema = z.object({
  coaId: z.number().int(),
  name: z.string().min(1).max(100),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(100).optional(),
  openingBalance: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCashBankAccountSchema = createCashBankAccountSchema.partial();

module.exports = { createCashBankAccountSchema, updateCashBankAccountSchema };
