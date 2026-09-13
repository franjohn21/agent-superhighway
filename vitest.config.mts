import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.HIGHWAY_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set HIGHWAY_TEST_DATABASE_URL to a local Postgres database named highway_join_test* (see CONTRIBUTING.md).",
  );
const database = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) ||
  !database.pathname.startsWith("/highway_join_test")
) {
  throw new Error(
    "Joining tests only run against a local highway_join_test* database.",
  );
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    env: {
      DATABASE_URL: databaseUrl,
      APP_URL: "https://highway-web.example",
      MAIL_DOMAIN: "highway-mail.example",
      SES_REGION: "us-east-1",
      INBOUND_BUCKET_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "test",
      AWS_SECRET_ACCESS_KEY: "test",
    },
  },
});
