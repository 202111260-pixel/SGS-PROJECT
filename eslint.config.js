import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Flat config (ESLint 9). Charter §7 requires a clean `npm run lint`.
// Non-type-aware rules only: fast, editor-friendly, and independent of the
// tsc program — `npx tsc --noEmit` remains the source of truth for types (§1).
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  // Shared browser source: .ts/.tsx (type-annotated) and legacy .jsx/.js.
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Charter §1: `any` is banned. Surface it, don't silently allow.
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow intentional unused via leading underscore (e.g. _event, _err).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Node-side tooling: build/screenshot scripts and config run under Node.
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
)
