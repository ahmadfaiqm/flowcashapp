const { z } = require('zod');
const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6), confirmPassword: z.string().min(6) }).refine((d) => d.newPassword === d.confirmPassword, { message: 'Konfirmasi kata sandi tidak cocok', path: ['confirmPassword'] });
module.exports = { registerSchema, loginSchema, changePasswordSchema };
