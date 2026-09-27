import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Profile pictures may be legacy Base64 data-URLs, which next/image
      // cannot optimize — so plain <img> is intentional here.
      '@next/next/no-img-element': 'off',
      // The App Router root layout IS the document; Google Fonts <link> tags
      // there are the supported place for them (this rule targets pages/ only).
      '@next/next/no-page-custom-font': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    // Generated database migrations are applied as-is, not authored code.
    "drizzle/**",
  ]),
]);

export default eslintConfig;
