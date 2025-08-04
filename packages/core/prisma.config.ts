import { defineConfig } from "prisma/config";
// dotenvx handles environment loading from monorepo root

export default defineConfig({
  schema: "./prisma/",
});
