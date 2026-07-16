---
name: setup-eslint
description: Set up ESLint 9 with Prettier, import ordering, and formatting rules. Detects project type (frontend/backend, TypeScript/JavaScript, npm/pnpm/yarn) and installs dependencies, creates eslint.config.mjs, and adds lint scripts automatically.
---

Set up ESLint 9 with Prettier and import ordering for the current project. This skill automates the full setup so the user can just save a file and linting works.

## Steps

### Step 1: Detect the project

Read `package.json` to determine:

1. **Package manager**: Check for `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), or default to npm
2. **TypeScript**: Check if any `.ts` or `.tsx` source files exist (exclude `node_modules`, `dist`, `.d.ts`)
3. **Project type**: Check if `react` or `react-dom` is in dependencies (frontend) or not (backend)

### Step 2: Install dependencies

Use the detected package manager. All dependencies are dev dependencies. Use `--legacy-peer-deps` for npm.

**Base dependencies (always):**
- `eslint@9`
- `prettier@latest`
- `eslint-config-prettier@latest`
- `eslint-plugin-prettier@latest`
- `eslint-plugin-import@latest`
- `@eslint/js`

**If TypeScript:**
- `@typescript-eslint/eslint-plugin@latest`
- `@typescript-eslint/parser@latest`

Run the install command via Bash.

### Step 3: Create `eslint.config.mjs`

Delete the existing ESLint config file if one exists (e.g., `eslint.config.js`, `.eslintrc.js`, `.eslintrc.json`, `.eslintrc`).

Create `eslint.config.mjs` in the project root using the appropriate template below.

**Always** prepend this global ignores object as the FIRST element of the exported array in every template (adjust to the project: add `.next`, `out`, `public/build`, etc. if they exist):

```javascript
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },
```

#### Frontend + TypeScript

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
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
```

#### Frontend + JavaScript (no TypeScript)

```javascript
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
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
      },
    },
    plugins: {
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
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
      'no-unused-vars': [
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
    files: ['**/*.test.{js,jsx}', '**/setup-jest.js'],
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
      },
    },
  },
];
```

#### Backend + TypeScript

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
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
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      'prettier/prettier': [
        'error',
        {
          printWidth: 200,
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          arrowParens: 'always',
        },
      ],
      'no-console': 'warn',
      quotes: ['error', 'single'],
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
];
```

#### Backend + JavaScript (no TypeScript)

```javascript
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
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
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
      },
    },
    plugins: {
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          printWidth: 200,
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          arrowParens: 'always',
        },
      ],
      'no-console': 'warn',
      quotes: ['error', 'single'],
      'no-unused-vars': [
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
];
```

### Step 4: Update package.json scripts

Ensure these scripts exist in `package.json`:

```json
{
  "lint": "eslint ./",
  "lint:fix": "eslint ./ --fix"
}
```

If a `"lint"` script already exists, replace it. If `"lint:fix"` doesn't exist, add it.

### Step 5: VSCode integration

Create `.vscode/settings.json` if it doesn't exist (merge keys if it does):

```json
{
  "eslint.enable": true,
  "eslint.workingDirectories": [{ "mode": "auto" }],
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Tell the user to restart the ESLint server in VSCode: `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) → `ESLint: Restart ESLint Server`. This makes lint errors show inline and auto-fix on save, so saving a file just works.

### Step 6: Run lint:fix

Run the lint:fix command to auto-fix all files:

```bash
<package-manager> run lint:fix
```

Report the results to the user. If there are remaining errors, list them so the user knows what needs manual fixing.

### Step 7: Clean up old config

If there was a previous ESLint config file that was replaced (e.g., `eslint.config.js`), delete it after the new `eslint.config.mjs` is confirmed working.
