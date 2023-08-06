// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const path = require("path");

// /** @type {import("eslint").Linter.Config} */
// const config = {
//   overrides: [
//     {
//       extends: [
//         "plugin:@typescript-eslint/recommended-requiring-type-checking",
//       ],
//       files: ["*.ts", "*.tsx"], // Exclude jest.config.js file
//       parserOptions: {
//         project: path.join(__dirname, "tsconfig.json"),
//       },
//     },
//   ],
//   parser: "@typescript-eslint/parser",
//   parserOptions: {
//     project: path.join(__dirname, "tsconfig.json"),
//   },
//   plugins: ["@typescript-eslint"],
//   extends: ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
//   ignorePatterns: ["**jest.config*.js"],
//   rules: {
//     "@typescript-eslint/consistent-type-imports": [
//       "error",
//       {
//         prefer: "type-imports",
//         fixStyle: "inline-type-imports",
//       },
//     ],
//     "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
//     "no-console": "error", // Add this line to warn about console.log usage
//     "@typescript-eslint/ban-ts-comment": "off",
//   },
// };

// module.exports = config;
