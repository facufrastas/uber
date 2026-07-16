import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        history: 'readonly',
        location: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        React: 'readonly',
        crypto: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLButtonElement: 'readonly',
        RequestInit: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'prettier/prettier': [
        'error',
        {
          printWidth: 200,
          trailingComma: 'es5',
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          arrowParens: 'always',
        },
      ],
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_.*?s',
        },
      ],
      'import/order': ['warn', { 'newlines-between': 'always' }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
      ],
      'no-multiple-empty-lines': 2,
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/setup-jest.{js,ts}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        renderWithRedux: 'readonly',
      },
    },
  },
];
