const { z } = require('zod');

const transferSchema = z
  .object({
    sourceAccountId: z.number().int().positive(),
    destinationAccountId: z.number().int().positive(),
    amount: z.number().positive(),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'transferDate must be YYYY-MM-DD'),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceAccountId === data.destinationAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sourceAccountId and destinationAccountId must be different',
        path: ['destinationAccountId'],
      });
    }
  });

module.exports = { transferSchema };
