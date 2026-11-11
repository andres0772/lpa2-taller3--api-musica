import tseslint from "typescript-eslint";
import eslintJs from "@eslint/js";

export default tseslint.config(
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);
