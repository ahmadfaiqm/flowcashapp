const express = require('express');
const auth = require('../../common/middlewares/auth');
const requireBusiness = require('../../common/middlewares/requireBusiness');
const authorizeRoles = require('../../common/middlewares/authorizeRoles');
const validate = require('../../common/middlewares/validate');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { closePeriodSchema } = require('./periods.validation');
const c = require('./periods.controller');

const router = express.Router();

router.use(auth, requireBusiness);

router.get('/', asyncHandler(c.list));
router.post('/close', authorizeRoles('owner', 'akuntan'), validate('body', closePeriodSchema), asyncHandler(c.closePeriod));

module.exports = router;
