import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Projets natifs Capacitor (Swift/Kotlin/Gradle + assets web copiés) :
    // hors du périmètre du lint de l'app Next.js.
    "ios/**",
    "android/**",
  ]),
]);

export default eslintConfig;
