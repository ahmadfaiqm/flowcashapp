const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const { getNextNoTx } = require('../../common/utils/numbering');
const repo = require('./purchase-payments.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    supplierId: query.supplierId,
    purchaseInvoiceId: query.purchaseInvoiceId,
    search: query.search || query.q || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Purchase payment not found');
  return item;
}

async function create(businessId, body) {
  return prisma.$transaction(async (tx) => {
    let purchaseInvoice = null;
    if (body.purchaseInvoiceId) {
      purchaseInvoice = await tx.purchaseInvoice.findFirst({ where: { businessId, id: Number(body.purchaseInvoiceId) } });
      if (!purchaseInvoice) throw new ApiError(404, 'Purchase invoice not found');
    }

    if (body.supplierId) {
      const supplier = await tx.supplier.findFirst({ where: { businessId, id: Number(body.supplierId) } });
      if (!supplier) throw new ApiError(404, 'Supplier not found');
    }

    if (body.cashBankAccountId) {
      const cashBank = await tx.cashBankAccount.findFirst({ where: { businessId, id: Number(body.cashBankAccountId) } });
      if (!cashBank) throw new ApiError(404, 'Cash/Bank Account not found');
    }

    let paymentNo = body.paymentNo;
    if (!paymentNo) {
      const prefix = body.prefix || 'PP';
      paymentNo = await getNextNoTx(tx, 'purchasePayment', 'paymentNo', businessId, prefix, 3);
    }

    const payment = await repo.createPaymentTx(tx, {
      businessId,
      purchaseInvoiceId: body.purchaseInvoiceId || null,
      supplierId: body.supplierId || null,
      paymentNo,
      paymentDate: new Date(body.paymentDate),
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      cashBankAccountId: body.cashBankAccountId || null,
      notes: body.notes || null,
    });

    if (purchaseInvoice) {
      const newPaid = Number(purchaseInvoice.paidAmount) + Number(body.amount);
      const totalAmount = Number(purchaseInvoice.totalAmount);
      let status = 'partially_paid';
      if (newPaid >= totalAmount) status = 'paid';
      else if (newPaid > 0) status = 'partially_paid';
      await tx.purchaseInvoice.update({
        where: { id: purchaseInvoice.id },
        data: { paidAmount: newPaid, status },
      });
    }

    // Journal: debit AP 2010 amount, credit Cash/Bank
    const apCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '2010' } });
    if (!apCoa) throw new ApiError(500, 'Default COA not found, please create business');

    let creditCoaId = null;
    if (body.cashBankAccountId) {
      const cashBank = await tx.cashBankAccount.findFirst({ where: { businessId, id: Number(body.cashBankAccountId) } });
      if (cashBank) creditCoaId = cashBank.coaId;
    }
    if (!creditCoaId) {
      const kasCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1010' } });
      if (!kasCoa) throw new ApiError(500, 'Default COA not found, please create business');
      creditCoaId = kasCoa.id;
    }

    const journal = await repo.createJournalTx(tx, {
      businessId,
      journalNo: `JU-PAYMENT-${Date.now()}-${businessId}`,
      journalDate: new Date(body.paymentDate),
      description: `Purchase Payment ${paymentNo}`,
      status: 'posted',
    });

    const amount = Number(body.amount);
    const lines = [
      { journalId: journal.id, coaId: apCoa.id, debit: amount, credit: 0 },
      { journalId: journal.id, coaId: creditCoaId, debit: 0, credit: amount },
    ];

    const debitSum = lines.reduce((s, l) => s + Number(l.debit), 0);
    const creditSum = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (debitSum !== creditSum) throw new ApiError(400, 'Journal tidak balance: debit != credit');

    await repo.createJournalLinesTx(tx, lines);

    const full = await tx.purchasePayment.findUnique({
      where: { id: payment.id },
      include: { supplier: true, purchaseInvoice: true, cashBankAccount: true },
    });
    return full;
  });
}

module.exports = { list, getById, create };
