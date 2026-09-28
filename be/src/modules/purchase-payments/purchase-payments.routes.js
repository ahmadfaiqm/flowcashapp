const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createPurchasePaymentSchema } = require('./purchase-payments.validation');
const c = require('./purchase-payments.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'kasir'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createPurchasePaymentSchema), asyncHandler(c.create));

module.exports = router;
