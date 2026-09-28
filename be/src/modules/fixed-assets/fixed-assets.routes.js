const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createFixedAssetSchema, updateFixedAssetSchema, depreciateSchema } = require('./fixed-assets.validation');
const c = require('./fixed-assets.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createFixedAssetSchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateFixedAssetSchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));
router.post('/:id/depreciate', validate('body', depreciateSchema), asyncHandler(c.depreciate));
router.get('/:id/depreciations', asyncHandler(c.listDepreciations));

module.exports = router;
