const { z } = require('zod');

const createSalesInvoiceSchema = z
  .object({
    customerId: z.number().int().optional(),
    invoiceNo: z.string().min(1).max(50).optional(),
    prefix: z.string().min(1).max(20).optional(),
    invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invoiceDate must be YYYY-MM-DD'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').optional(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.number().int(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        discountAmount: z.number().min(0).optional(),
        taxAmount: z.number().min(0).optional(),
      })
    )
    .min(1),
})
  .refine((d) => d.invoiceNo || d.prefix, { message: 'invoiceNo or prefix required', path: ['invoiceNo'] });

const updateSalesInvoiceSchema = z.object({
  customerId: z.number().int().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'posted', 'paid', 'partially_paid', 'cancelled']).optional(),
});

module.exports = { createSalesInvoiceSchema, updateSalesInvoiceSchema };
