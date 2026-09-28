const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./fixed-assets.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search || query.q || undefined;
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, search), repo.count(businessId, search)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Fixed asset not found');
  return item;
}

async function create(businessId, body) {
  const data = {
    code: body.code,
    name: body.name,
    acquisitionDate: new Date(body.acquisitionDate),
    acquisitionCost: body.acquisitionCost,
    usefulLifeMonths: body.usefulLifeMonths,
    residualValue: body.residualValue ?? 0,
    bookValue: body.acquisitionCost,
    accumulatedDepreciation: 0,
    isActive: body.isActive ?? true,
  };
  return repo.create(businessId, data);
}

async function update(businessId, id, body) {
  const existing = await repo.findById(businessId, id);
  if (!existing) throw new ApiError(404, 'Fixed asset not found');
  const data = {};
  if (body.code !== undefined) data.code = body.code;
  if (body.name !== undefined) data.name = body.name;
  if (body.acquisitionDate !== undefined) data.acquisitionDate = new Date(body.acquisitionDate);
  if (body.acquisitionCost !== undefined) data.acquisitionCost = body.acquisitionCost;
  if (body.usefulLifeMonths !== undefined) data.usefulLifeMonths = body.usefulLifeMonths;
  if (body.residualValue !== undefined) data.residualValue = body.residualValue;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  // bookValue / accumulated not directly updatable via this endpoint to avoid inconsistency
  return repo.update(businessId, id, data);
}

async function remove(businessId, id) {
  const existing = await repo.findById(businessId, id);
  if (!existing) throw new ApiError(404, 'Fixed asset not found');
  return repo.remove(businessId, id);
}

async function listDepreciations(businessId, fixedAssetId, query) {
  const asset = await repo.findById(businessId, fixedAssetId);
  if (!asset) throw new ApiError(404, 'Fixed asset not found');
  const { page, limit, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([
    repo.findDepreciations(businessId, fixedAssetId, skip, take),
    repo.countDepreciations(businessId, fixedAssetId),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function depreciate(businessId, fixedAssetId, body) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fixedAsset.findFirst({ where: { businessId, id: Number(fixedAssetId) } });
    if (!asset) throw new ApiError(404, 'Fixed asset not found');
    if (!asset.isActive) throw new ApiError(400, 'Asset is not active');

    const acquisitionCost = Number(asset.acquisitionCost);
    const residualValue = Number(asset.residualValue);
    const usefulLifeMonths = Number(asset.usefulLifeMonths);
    const accumulatedDepreciation = Number(asset.accumulatedDepreciation);

    const depreciableAmount = acquisitionCost - residualValue;
    if (depreciableAmount <= 0) throw new ApiError(400, 'Asset has no depreciable amount');

    const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

    const epsilon = 0.01;
    if (accumulatedDepreciation + monthlyDepreciation > depreciableAmount + epsilon) {
      throw new ApiError(400, 'Asset fully depreciated');
    }

    // clamp last depreciation to remaining amount to avoid floating errors
    let depAmount = monthlyDepreciation;
    const remaining = depreciableAmount - accumulatedDepreciation;
    if (depAmount > remaining) depAmount = remaining;
    // round to 2 decimals
    depAmount = Math.round(depAmount * 100) / 100;

    const newAccumulated = Math.round((accumulatedDepreciation + depAmount) * 100) / 100;
    const newBookValue = Math.round((acquisitionCost - newAccumulated) * 100) / 100;

    const depreciationDate = new Date(body.depreciationDate);

    // Ensure COAs exist: 5150 expense, 1520 accum (SAK 28 akun)
    let expenseCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '5150' } });
    let accumCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1520' } });
    // create missing COAs if needed
    if (!expenseCoa) {
      try {
        expenseCoa = await tx.chartOfAccount.create({
          data: { businessId, code: '5150', name: 'Beban Penyusutan', accountType: 'Expense', normalBalance: 'debit', isContra: false },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          expenseCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '5150' } });
        } else throw e;
      }
    }
    if (!accumCoa) {
      try {
        accumCoa = await tx.chartOfAccount.create({
          data: { businessId, code: '1520', name: 'Akumulasi Penyusutan', accountType: 'Asset', normalBalance: 'credit', isContra: true },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          accumCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1520' } });
        } else throw e;
      }
    }
    if (!expenseCoa || !accumCoa) throw new ApiError(500, 'Required COA not found for depreciation journal');

    // Create journal with adjustment flag for SAK penyesuaian
    const journalNo = `JU-DEP-${Date.now()}-${businessId}-${fixedAssetId}`;
    const periodYear = depreciationDate.getFullYear();
    const periodMonth = depreciationDate.getMonth() + 1;
    const journal = await tx.journal.create({
      data: {
        businessId,
        journalNo,
        journalDate: depreciationDate,
        description: `Penyusutan ${asset.name}`,
        status: 'posted',
        isAdjustment: true,
        adjustmentType: 'depreciation',
        periodYear,
        periodMonth,
      },
    });

    await tx.journalLine.createMany({
      data: [
        { journalId: journal.id, coaId: expenseCoa.id, debit: depAmount, credit: 0, memo: `Beban penyusutan ${asset.code}` },
        { journalId: journal.id, coaId: accumCoa.id, debit: 0, credit: depAmount, memo: `Akumulasi ${asset.code}` },
      ],
    });

    const depreciation = await tx.assetDepreciation.create({
      data: {
        businessId,
        fixedAssetId: Number(fixedAssetId),
        depreciationDate,
        depreciationAmount: depAmount,
        accumulatedAmount: newAccumulated,
        bookValue: newBookValue,
        journalId: journal.id,
      },
    });

    const updatedAsset = await tx.fixedAsset.update({
      where: { id: Number(fixedAssetId) },
      data: { accumulatedDepreciation: newAccumulated, bookValue: newBookValue },
    });

    const fullJournal = await tx.journal.findUnique({
      where: { id: journal.id },
      include: { lines: { include: { coa: true } } },
    });

    return { asset: updatedAsset, depreciation, journal: fullJournal };
  });
}

module.exports = { list, getById, create, update, remove, depreciate, listDepreciations };
