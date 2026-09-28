const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { transferSchema } = require('./cash-bank-transfers.validation');
const c = require('./cash-bank-transfers.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.post('/', validate('body', transferSchema), asyncHandler(c.transfer));
router.get('/', asyncHandler(c.list));

module.exports = router;
