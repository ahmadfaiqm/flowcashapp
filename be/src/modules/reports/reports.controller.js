const { success } = require('../../common/utils/ApiResponse');
const service = require('./reports.service');

async function profitLoss(req, res) {
  const data = await service.profitLoss(req.businessId, req.query);
  return success(res, data, 'Profit & Loss report fetched');
}

async function salesReport(req, res) {
  const data = await service.salesReport(req.businessId, req.query);
  return success(res, data, 'Sales report fetched', data.meta);
}

async function purchaseReport(req, res) {
  const data = await service.purchaseReport(req.businessId, req.query);
  return success(res, data, 'Purchase report fetched', data.meta);
}

async function stockReport(req, res) {
  const data = await service.stockReport(req.businessId, req.query);
  return success(res, data, 'Stock report fetched', data.meta);
}

async function arReport(req, res) {
  const data = await service.arReport(req.businessId, req.query);
  return success(res, data, 'AR report fetched');
}

async function apReport(req, res) {
  const data = await service.apReport(req.businessId, req.query);
  return success(res, data, 'AP report fetched');
}

async function balanceSheet(req, res) {
  const data = await service.balanceSheet(req.businessId, req.query);
  return success(res, data, 'Balance Sheet report fetched');
}

async function cashFlow(req, res) {
  const data = await service.cashFlow(req.businessId, req.query);
  return success(res, data, 'Cash Flow report fetched');
}

async function fixedAssetReport(req, res) {
  const data = await service.fixedAssetReport(req.businessId, req.query);
  return success(res, data, 'Fixed Asset report fetched', data.meta);
}

async function worksheet(req, res) {
  const data = await service.worksheet(req.businessId, req.query);
  return success(res, data, 'Worksheet fetched');
}

async function adjustedTrialBalance(req, res) {
  const data = await service.adjustedTrialBalance(req.businessId, req.query);
  return success(res, data, 'Adjusted Trial Balance fetched');
}

async function capitalChange(req, res) {
  const data = await service.capitalChange(req.businessId, req.query);
  return success(res, data, 'Capital Change report fetched');
}

module.exports = { profitLoss, salesReport, purchaseReport, stockReport, arReport, apReport, balanceSheet, cashFlow, fixedAssetReport, worksheet, adjustedTrialBalance, capitalChange };
