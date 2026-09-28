const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { getHealth } = require('./health.controller');

const router = express.Router();
router.get('/', asyncHandler(getHealth));
module.exports = router;
