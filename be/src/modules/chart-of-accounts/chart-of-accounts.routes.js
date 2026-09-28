const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createCoASchema, updateCoASchema } = require('./chart-of-accounts.validation');
const c = require('./chart-of-accounts.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createCoASchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateCoASchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));

module.exports = router;
