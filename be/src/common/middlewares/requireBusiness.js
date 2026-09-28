const prisma = require('../../config/database');
const ApiError = require('../utils/ApiError');

module.exports = async (req, res, next) => {
  const raw = req.headers['x-business-id'];
  if (!raw) return next(new ApiError(400, 'X-Business-Id header required'));
  const businessId = parseInt(raw, 10);
  if (Number.isNaN(businessId)) return next(new ApiError(400, 'Invalid X-Business-Id'));
  const member = await prisma.businessMember.findFirst({ where: { businessId, userId: req.user.id } });
  if (!member) return next(new ApiError(403, 'Not a member of this business'));
  req.businessId = businessId;
  req.memberRole = member.role;
  return next();
};
