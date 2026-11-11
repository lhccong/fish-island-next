import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const internalImports = {
  group: ['@/features/*/*', '@/shells/*/*', '@/skins/*/*'],
  message: '跨模块仅允许从模块 index.ts 公开入口导入。',
};
function restrict(files, groups) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            internalImports,
            ...groups.map((group) => ({ group, message: '违反 docs/architecture.md 依赖方向。' })),
          ],
        },
      ],
    },
  };
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      hooks.configs.flat.recommended,
      refresh.configs.vite,
    ],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', { patterns: [internalImports] }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  restrict(
    ['src/domain/**/*.ts'],
    [
      ['react', 'react-dom', 'react-dom/*', 'zustand', 'zustand/*'],
      [
        '@/app',
        '@/app/**',
        '@/features/**',
        '@/shells/**',
        '@/skins/**',
        '@/infrastructure/**',
        '@/shared/**',
      ],
    ],
  ),
  restrict(
    ['src/shared/**/*.{ts,tsx}'],
    [
      [
        '@/app/**',
        '@/domain/**',
        '@/features/**',
        '@/shells/**',
        '@/skins/**',
        '@/infrastructure/**',
      ],
    ],
  ),
  restrict(
    ['src/infrastructure/**/*.ts'],
    [
      ['react', 'react-dom', 'zustand'],
      ['@/app/**', '@/features/**', '@/shells/**', '@/skins/**'],
    ],
  ),
  restrict(
    ['src/features/**/*.{ts,tsx}'],
    [['@/app/**', '@/shells/**', '@/infrastructure/**', '@/features/*']],
  ),
  restrict(['src/shells/**/*.{ts,tsx}'], [['@/app/**', '@/features/**', '@/infrastructure/**']]),
  restrict(
    ['src/skins/**/*.ts'],
    [
      ['react', 'react-dom', 'zustand'],
      ['@/app/**', '@/features/**', '@/shells/**', '@/infrastructure/**'],
    ],
  ),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^\\.\\.\\//]',
          message: '跨目录使用 @/ 别名和公开入口，避免相对路径绕过依赖检查。',
        },
      ],
    },
  },
  prettier,
]);
