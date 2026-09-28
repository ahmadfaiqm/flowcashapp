const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const c = require('./dashboard.controller');

const router = express.Router();

router.use(auth, requireBusiness, authorizeRoles('owner', 'akuntan'));

router.get('/', asyncHandler(c.getSummary));

module.exports = router;
