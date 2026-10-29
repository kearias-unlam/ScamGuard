import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

// eslint-config-next 15 only ships eslintrc configs; FlatCompat adapts them to ESLint 9 flat config.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'backend/**',
      'NO SUBIR/**',
      'playwright-report/**',
      'test-results/**',
      '.playwright-mcp/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
