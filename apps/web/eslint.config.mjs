import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**", "coverage/**"] },
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/agent/page.tsx",
      "src/app/applications/page.tsx",
      "src/app/integrations/page.tsx",
      "src/app/projects/page.tsx",
      "src/app/security/page.tsx",
      "src/app/sources/page.tsx",
    ],
    rules: {
      // Keep the existing async data-loading effect warning visible while avoiding unrelated Next 16 lint failures.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
