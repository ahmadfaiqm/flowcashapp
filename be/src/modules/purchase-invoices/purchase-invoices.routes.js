const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createPurchaseInvoiceSchema } = require('./purchase-invoices.validation');
const c = require('./purchase-invoices.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'kasir'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createPurchaseInvoiceSchema), asyncHandler(c.create));

module.exports = router;
