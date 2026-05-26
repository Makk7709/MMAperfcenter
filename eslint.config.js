import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `supabase/functions/**` and `tests/edge/**` target the Deno runtime
  // (https://deno.land imports) and are linted out-of-band; the project
  // Node ESLint config does not understand those module specifiers.
  { ignores: ["dist", "supabase/functions/**", "tests/edge/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Phase 0 of the TypeScript strictness roadmap (see
      // docs/audit/TYPESCRIPT_STRICTNESS_ROADMAP.md):
      // — surface unused vars as warnings (not errors) so the legacy debt
      //   is visible without blocking the build / CI today.
      // — ignore variables intentionally prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  }
);
