import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['**/*.test.ts', 'test/**', 'e2e/**'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  prettier,
)
