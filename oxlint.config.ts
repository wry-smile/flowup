import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'jsdoc'],
  categories: {
    correctness: 'error',
    suspicious: 'error',
  },
  rules: {
    'no-shadow': 'off',
    'unicorn/no-array-sort': 'off',
    'import/no-unassigned-import': [
      'error',
      {
        allow: ['virtual:uno.css'],
      },
    ],
  },
})
