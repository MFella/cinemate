import { dirname } from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../eslint.config.mjs';
import nx from '@nx/eslint-plugin';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-standalone': 'off',
      // Newly enabled by the angular-eslint recommended preset; existing code uses constructor injection.
      '@angular-eslint/prefer-inject': 'off',
      // Newly enabled by the angular-eslint recommended preset; components use Default change detection.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.html'],
    rules: {
      // Newly enabled by the angular-eslint template recommended preset; existing templates have <img> without alt.
      '@angular-eslint/template/alt-text': 'off',
    },
  },
];
