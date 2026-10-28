import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import a11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.cloudflare/**', '.wrangler/**', 'coverage/**'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'max-params': ['error', 4],
      'max-depth': ['error', 4],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-len': [
        'error',
        { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            env: true,
            props: true,
            req: true,
            ref: true,
            pdf: true,
            utils: true,
            ImportMetaEnv: true,
          },
        },
      ],
      'unicorn/no-null': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase', ignore: ['App.tsx'] }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ...hooks.configs.flat.recommended,
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-refresh': refresh, 'jsx-a11y': a11y },
    rules: {
      ...a11y.configs.strict.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/components/ui/*.tsx', 'src/components/identity.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { process: 'readonly' } },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { 'unicorn/no-await-expression-member': 'off' },
  },
  prettier,
);
