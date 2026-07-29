import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "../docs/swagger.json",
    output: {
      target: "src/lib/generated/api.ts",
      client: "react-query",
      httpClient: "axios",
      clean: true,
      override: {
        mutator: {
          path: "src/lib/mutator.ts",
          name: "customMutator",
        },
      },
    },
  },
});
