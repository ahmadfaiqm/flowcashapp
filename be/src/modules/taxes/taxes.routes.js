const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createTaxSchema, updateTaxSchema } = require('./taxes.validation');
const c = require('./taxes.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createTaxSchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateTaxSchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));

module.exports = router;
