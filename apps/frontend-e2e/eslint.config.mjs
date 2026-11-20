import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  playwright.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Newly enabled by the eslint-plugin-playwright 2.x recommended preset; existing e2e specs violate it.
      'playwright/no-unused-locators': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['src/**/*.{ts,js,tsx,jsx}'],
    // Override or add rules here
    rules: {},
  },
];
