module.exports = { env: { node: true, es2021: true, jest: true }, extends: ['eslint:recommended', 'prettier'], rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }] } };
