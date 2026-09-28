const { z } = require('zod');

const createAdjustmentSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().refine((v) => v !== 0, { message: 'Quantity cannot be zero' }),
  notes: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  movementType: z.string().optional(),
});

module.exports = { createAdjustmentSchema };
