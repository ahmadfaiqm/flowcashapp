const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const { getNextNoTx } = require('../../common/utils/numbering');
const repo = require('./purchase-invoices.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    supplierId: query.supplierId,
    status: query.status,
    search: query.search || query.q || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Purchase invoice not found');
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

    if (body.supplierId) {
      const supplier = await tx.supplier.findFirst({ where: { businessId, id: Number(body.supplierId) } });
      if (!supplier) throw new ApiError(404, 'Supplier not found');
    }

    // Ensure all products exist before creating invoice
    for (const l of body.lines) {
      const p = await repo.findProductForUpdate(tx, businessId, l.productId);
      if (!p) throw new ApiError(404, 'Product not found');
    }

    let invoiceNo = body.invoiceNo;
    if (!invoiceNo) {
      const prefix = body.prefix || 'PB';
      invoiceNo = await getNextNoTx(tx, 'purchaseInvoice', 'invoiceNo', businessId, prefix, 3);
    }

    const invoice = await repo.createInvoiceTx(tx, {
      businessId,
      supplierId: body.supplierId || null,
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
        purchaseInvoiceId: invoice.id,
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount || 0,
        taxAmount: l.taxAmount || 0,
        subtotal: lineSubtotal,
      });
      await repo.updateStockTx(tx, l.productId, Number(l.quantity));
      await repo.createMovementTx(tx, {
        businessId,
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: l.unitPrice,
        movementType: 'in',
        referenceType: 'purchase_invoice',
        referenceId: invoice.id,
      });
    }

    // Journal: debit Inventory 1500 totalAmount, credit AP 2010 totalAmount
    const coas = await tx.chartOfAccount.findMany({
      where: { businessId, code: { in: ['1500', '2010'] } },
    });
    const inventoryCoa = coas.find((c) => c.code === '1500');
    const apCoa = coas.find((c) => c.code === '2010');
    if (!inventoryCoa || !apCoa) {
      throw new ApiError(500, 'Default COA not found, please create business');
    }

    const journal = await repo.createJournalTx(tx, {
      businessId,
      journalNo: `JU-PURCHASE-${Date.now()}-${businessId}`,
      journalDate: new Date(body.invoiceDate),
      description: `Purchase ${invoiceNo}`,
      status: 'posted',
    });

    const lines = [
      { journalId: journal.id, coaId: inventoryCoa.id, debit: totalAmount, credit: 0 },
      { journalId: journal.id, coaId: apCoa.id, debit: 0, credit: totalAmount },
    ];

    const debitSum = lines.reduce((s, l) => s + Number(l.debit), 0);
    const creditSum = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (debitSum !== creditSum) throw new ApiError(400, 'Journal tidak balance: debit != credit');

    await repo.createJournalLinesTx(tx, lines);

    const full = await tx.purchaseInvoice.findUnique({
      where: { id: invoice.id },
      include: { lines: true, supplier: true },
    });
    return full;
  });
}

module.exports = { list, getById, create };
