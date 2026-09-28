const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const auth = require('../../common/middlewares/auth');
const validate = require('../../common/middlewares/validate');
const { createUserSchema } = require('./users.validation');
const { list, getById, create } = require('./users.controller');

const router = express.Router();
router.get('/', asyncHandler(list));
router.get('/:id', auth, asyncHandler(getById));
router.post('/', auth, validate('body', createUserSchema), asyncHandler(create));
module.exports = router;
