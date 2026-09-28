const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const { getNextNoTx } = require('../../common/utils/numbering');
const repo = require('./sales-invoices.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    customerId: query.customerId,
    status: query.status,
    search: query.search || query.q || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Sales invoice not found');
  return item;
}

async function create(businessId, body) {
  return prisma.$transaction(async (tx) => {
    let subtotal = 0;
    for (const l of body.lines) {
      subtotal += Number(l.quantity) * Number(l.unitPrice) - Number(l.discountAmount || 0);
    }
    const taxAmount = Number(body.taxAmount || 0);
    const discountAmount = Number(body.discountAmount || 0);
    const totalAmount = subtotal + taxAmount - discountAmount;

    // stock check
    for (const l of body.lines) {
      const p = await repo.findProductForUpdate(tx, businessId, l.productId);
      if (!p) throw new ApiError(404, 'Product not found');
      if (Number(p.stock) < Number(l.quantity)) {
        throw new ApiError(400, `Stock tidak cukup untuk ${p.name}: ${p.stock} < ${l.quantity}`);
      }
    }

    // customer check if provided
    if (body.customerId) {
      const customer = await tx.customer.findFirst({ where: { businessId, id: Number(body.customerId) } });
      if (!customer) throw new ApiError(404, 'Customer not found');
    }

    let invoiceNo = body.invoiceNo;
    if (!invoiceNo) {
      const prefix = body.prefix || 'SI';
      invoiceNo = await getNextNoTx(tx, 'salesInvoice', 'invoiceNo', businessId, prefix, 3);
    }

    const invoice = await repo.createInvoiceTx(tx, {
      businessId,
      customerId: body.customerId || null,
      invoiceNo,
      invoiceDate: new Date(body.invoiceDate),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      status: 'posted',
      notes: body.notes || null,
    });

    for (const l of body.lines) {
      const lineSubtotal = Number(l.quantity) * Number(l.unitPrice);
      await repo.createLinesTx(tx, {
        salesInvoiceId: invoice.id,
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount || 0,
        taxAmount: l.taxAmount || 0,
        subtotal: lineSubtotal,
      });
      await repo.updateStockTx(tx, l.productId, -Number(l.quantity));
      await repo.createMovementTx(tx, {
        businessId,
        productId: l.productId,
        quantity: -Number(l.quantity),
        unitCost: l.unitPrice,
        movementType: 'out',
        referenceType: 'sales_invoice',
        referenceId: invoice.id,
      });
    }

    // journal creation
    const coas = await tx.chartOfAccount.findMany({ where: { businessId, code: { in: ['1100', '4010', '1500', '5010', '1010'] } } });
    const arCoa = coas.find((c) => c.code === '1100');
    const salesCoa = coas.find((c) => c.code === '4010');
    if (!arCoa || !salesCoa) {
      throw new ApiError(500, 'COA required for sales journal not found (1100/4010)');
    }

    const journal = await repo.createJournalTx(tx, {
      businessId,
      journalNo: `JU-SALES-${Date.now()}-${businessId}`,
      journalDate: new Date(body.invoiceDate),
      description: `Sales ${invoiceNo}`,
      status: 'posted',
    });

    // Simple balanced entries: debit AR total, credit Sales total
    const lines = [
      { journalId: journal.id, coaId: arCoa.id, debit: totalAmount, credit: 0 },
      { journalId: journal.id, coaId: salesCoa.id, debit: 0, credit: totalAmount },
    ];

    const debitSum = lines.reduce((s, l) => s + Number(l.debit), 0);
    const creditSum = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (debitSum !== creditSum) throw new ApiError(400, 'Journal tidak balance: debit != credit');

    await repo.createJournalLinesTx(tx, lines);

    // Re-fetch with relations
    const full = await tx.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: { lines: true, customer: true },
    });
    return full;
  });
}

module.exports = { list, getById, create };
