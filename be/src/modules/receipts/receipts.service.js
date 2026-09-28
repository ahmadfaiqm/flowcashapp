const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const { getNextNoTx } = require('../../common/utils/numbering');
const repo = require('./receipts.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    customerId: query.customerId,
    salesInvoiceId: query.salesInvoiceId,
    search: query.search || query.q || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Receipt not found');
  return item;
}

async function create(businessId, body) {
  return prisma.$transaction(async (tx) => {
    let salesInvoice = null;
    if (body.salesInvoiceId) {
      salesInvoice = await tx.salesInvoice.findFirst({ where: { businessId, id: Number(body.salesInvoiceId) } });
      if (!salesInvoice) throw new ApiError(404, 'Sales invoice not found');
    }

    if (body.customerId) {
      const customer = await tx.customer.findFirst({ where: { businessId, id: Number(body.customerId) } });
      if (!customer) throw new ApiError(404, 'Customer not found');
    }

    if (body.cashBankAccountId) {
      const cashBank = await tx.cashBankAccount.findFirst({ where: { businessId, id: Number(body.cashBankAccountId) } });
      if (!cashBank) throw new ApiError(404, 'Cash/Bank Account not found');
    }

    let receiptNo = body.receiptNo;
    if (!receiptNo) {
      const prefix = body.prefix || 'RC';
      receiptNo = await getNextNoTx(tx, 'receipt', 'receiptNo', businessId, prefix, 3);
    }

    const receipt = await repo.createReceiptTx(tx, {
      businessId,
      salesInvoiceId: body.salesInvoiceId || null,
      customerId: body.customerId || null,
      receiptNo,
      receiptDate: new Date(body.receiptDate),
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      cashBankAccountId: body.cashBankAccountId || null,
      notes: body.notes || null,
    });

    // Update sales invoice paidAmount and status if linked
    if (salesInvoice) {
      const newPaid = Number(salesInvoice.paidAmount) + Number(body.amount);
      const totalAmount = Number(salesInvoice.totalAmount);
      let status = 'partially_paid';
      if (newPaid >= totalAmount) status = 'paid';
      else if (newPaid > 0) status = 'partially_paid';
      await tx.salesInvoice.update({
        where: { id: salesInvoice.id },
        data: { paidAmount: newPaid, status },
      });
    }

    // Create journal: debit Cash/Bank, credit AR
    const arCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1100' } });
    if (!arCoa) throw new ApiError(500, 'COA 1100 (Piutang) not found');

    let debitCoaId = null;
    if (body.cashBankAccountId) {
      const cashBank = await tx.cashBankAccount.findFirst({ where: { businessId, id: Number(body.cashBankAccountId) } });
      if (cashBank) debitCoaId = cashBank.coaId;
    }
    if (!debitCoaId) {
      const kasCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1010' } });
      if (!kasCoa) throw new ApiError(500, 'COA Kas/Bank not found for receipt journal');
      debitCoaId = kasCoa.id;
    }

    const journal = await repo.createJournalTx(tx, {
      businessId,
      journalNo: `JU-RECEIPT-${Date.now()}-${businessId}`,
      journalDate: new Date(body.receiptDate),
      description: `Receipt ${receiptNo}`,
      status: 'posted',
    });

    const amount = Number(body.amount);
    const lines = [
      { journalId: journal.id, coaId: debitCoaId, debit: amount, credit: 0 },
      { journalId: journal.id, coaId: arCoa.id, debit: 0, credit: amount },
    ];

    const debitSum = lines.reduce((s, l) => s + Number(l.debit), 0);
    const creditSum = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (debitSum !== creditSum) throw new ApiError(400, 'Journal tidak balance: debit != credit');

    await repo.createJournalLinesTx(tx, lines);

    const full = await tx.receipt.findUnique({
      where: { id: receipt.id },
      include: { customer: true, salesInvoice: true, cashBankAccount: true },
    });
    return full;
  });
}

module.exports = { list, getById, create };
