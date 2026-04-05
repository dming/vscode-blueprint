import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      /** 未使用参数/变量以 `_` 开头表示刻意留空（接口实现、占位等）。 */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      /** 文件顶层相邻 `function` 声明之间空行（不作用于 class 内部） */
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "function", next: "function" },
      ],
      /**
       * class 内「相邻方法」之间空行（不含字段与字段之间，避免把属性区拉得过长）
       */
      "@stylistic/lines-between-class-members": [
        "error",
        {
          enforce: [
            {
              blankLine: "always",
              prev: "method",
              next: "method",
            },
          ],
        },
        { exceptAfterSingleLine: false, exceptAfterOverload: true },
      ],
    },
  },
];
