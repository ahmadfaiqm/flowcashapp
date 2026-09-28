const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const validate = require('../../common/middlewares/validate');
const auth = require('../../common/middlewares/auth');
const { registerSchema, loginSchema, changePasswordSchema } = require('./auth.validation');
const { register, login, me, changePassword, updateProfile } = require('./auth.controller');
const { z } = require('zod');

const updateProfileSchema = z.object({ name: z.string().min(1).max(100).optional() });

const router = express.Router();
router.post('/register', validate('body', registerSchema), asyncHandler(register));
router.post('/login', validate('body', loginSchema), asyncHandler(login));
router.get('/me', auth, asyncHandler(me));
router.post('/change-password', auth, validate('body', changePasswordSchema), asyncHandler(changePassword));
router.patch('/profile', auth, validate('body', updateProfileSchema), asyncHandler(updateProfile));
module.exports = router;
