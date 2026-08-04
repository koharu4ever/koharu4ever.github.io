import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      '.pnpm-store/**',
      'public/**',
      '.deploy_git/**',
      '.git/**',
      '.agents/**',
      '.codex/**',
      'db.json',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
  eslintConfigPrettier,
];
