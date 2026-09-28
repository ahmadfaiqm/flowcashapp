const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const c = require('./reports.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.get('/profit-loss', asyncHandler(c.profitLoss));
router.get('/sales', asyncHandler(c.salesReport));
router.get('/purchase', asyncHandler(c.purchaseReport));
router.get('/stock', asyncHandler(c.stockReport));
router.get('/ar', asyncHandler(c.arReport));
router.get('/ap', asyncHandler(c.apReport));
router.get('/balance-sheet', asyncHandler(c.balanceSheet));
router.get('/cash-flow', asyncHandler(c.cashFlow));
router.get('/fixed-assets', asyncHandler(c.fixedAssetReport));
router.get('/fixed-asset', asyncHandler(c.fixedAssetReport));
router.get('/worksheet', asyncHandler(c.worksheet));
router.get('/adjusted-trial-balance', asyncHandler(c.adjustedTrialBalance));
router.get('/capital-change', asyncHandler(c.capitalChange));

module.exports = router;
