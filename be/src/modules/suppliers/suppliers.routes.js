const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createSupplierSchema, updateSupplierSchema } = require('./suppliers.validation');
const c = require('./suppliers.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'kasir'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createSupplierSchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateSupplierSchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));

module.exports = router;
