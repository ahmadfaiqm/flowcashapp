const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createProductSchema, updateProductSchema } = require('./products.validation');
const c = require('./products.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'kasir'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createProductSchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateProductSchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));

module.exports = router;
