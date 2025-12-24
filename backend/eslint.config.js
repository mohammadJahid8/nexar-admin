import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Best practices
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',

      // ES6+
      'no-duplicate-imports': 'error',

      // Error prevention
      'no-throw-literal': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    ignores: ['node_modules/', 'coverage/', 'dist/'],
  },
];
