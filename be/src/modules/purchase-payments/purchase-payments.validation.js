const { z } = require('zod');

const createPurchasePaymentSchema = z
  .object({
    purchaseInvoiceId: z.number().int().optional(),
    supplierId: z.number().int().optional(),
    paymentNo: z.string().min(1).max(50).optional(),
    prefix: z.string().min(1).max(20).optional(),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'paymentDate must be YYYY-MM-DD'),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'e_wallet', 'other']),
  cashBankAccountId: z.number().int().optional(),
  notes: z.string().optional(),
}).refine((d) => d.paymentNo || d.prefix, { message: 'paymentNo or prefix required', path: ['paymentNo'] });

module.exports = { createPurchasePaymentSchema };
