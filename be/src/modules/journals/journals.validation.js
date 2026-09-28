const { z } = require('zod');

const createManualJournalSchema = z
  .object({
    journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'journalDate must be YYYY-MM-DD'),
    description: z.string().max(500).optional(),
    status: z.enum(['draft', 'posted', 'void']).optional().default('posted'),
    isAdjustment: z.boolean().optional().default(false),
    adjustmentType: z
      .enum(['supplies', 'depreciation', 'prepaidExpense', 'unearnedRevenue', 'accruedExpense', 'accruedRevenue', 'other'])
      .optional(),
    lines: z
      .array(
        z.object({
          coaId: z.number().int(),
          debit: z.number().min(0),
          credit: z.number().min(0),
          memo: z.string().optional(),
        })
      )
      .min(2, 'At least 2 lines required'),
  })
  .superRefine((data, ctx) => {
    if (data.isAdjustment && !data.adjustmentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'adjustmentType required when isAdjustment true',
        path: ['adjustmentType'],
      });
    }
    const sumDebit = data.lines.reduce((s, l) => s + Number(l.debit), 0);
    const sumCredit = data.lines.reduce((s, l) => s + Number(l.credit), 0);
    if (sumDebit !== sumCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Journal tidak balance: debit != credit',
        path: ['lines'],
      });
    }
    const hasDebit = data.lines.some((l) => Number(l.debit) > 0);
    const hasCredit = data.lines.some((l) => Number(l.credit) > 0);
    if (!hasDebit || !hasCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Journal must have at least one debit>0 and one credit>0',
        path: ['lines'],
      });
    }
  });

module.exports = { createManualJournalSchema };
