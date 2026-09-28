const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { createCapitalMovementSchema } = require('./capital-movements.validation');
const c = require('./capital-movements.controller');

const router = express.Router();

router.use(auth, requireBusiness);

router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', authorizeRoles('owner', 'akuntan'), validate('body', createCapitalMovementSchema), asyncHandler(c.create));

module.exports = router;
