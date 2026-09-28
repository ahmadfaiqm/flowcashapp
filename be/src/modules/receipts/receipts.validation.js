const { z } = require('zod');

const createReceiptSchema = z
  .object({
    salesInvoiceId: z.number().int().optional(),
    customerId: z.number().int().optional(),
    receiptNo: z.string().min(1).max(50).optional(),
    prefix: z.string().min(1).max(20).optional(),
    receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'receiptDate must be YYYY-MM-DD'),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'e_wallet', 'other']),
  cashBankAccountId: z.number().int().optional(),
  notes: z.string().optional(),
}).refine((d) => d.receiptNo || d.prefix, { message: 'receiptNo or prefix required', path: ['receiptNo'] });

module.exports = { createReceiptSchema };
