import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Existing debt, tracked in docs/ROADMAP.md: downgraded so CI can enforce everything else.
      "@next/next/no-html-link-for-pages": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/**"],
  },
];

export default config;
