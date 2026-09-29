const express = require('express');
const auth = require('../../common/middlewares/auth');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const uploadLogoFile = require('../../common/middlewares/uploadLogo');
const { createBusinessSchema, updateBusinessSchema } = require('./businesses.validation');
const c = require('./businesses.controller');

const router = express.Router();

router.post('/', auth, validate('body', createBusinessSchema), asyncHandler(c.create));
router.get('/', auth, asyncHandler(c.list));
router.get('/:id', auth, asyncHandler(c.getById));
router.patch('/:id', auth, validate('body', updateBusinessSchema), asyncHandler(c.update));
router.get('/:id/role', auth, asyncHandler(c.myRole));
router.post('/:id/logo', auth, uploadLogoFile, asyncHandler(c.uploadLogo));
router.delete('/:id/logo', auth, asyncHandler(c.deleteLogo));

module.exports = router;
