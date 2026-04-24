import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envPath = (() => {
  const cwd = process.cwd();
  const localPath = path.join(cwd, ".env.local");
  if (fs.existsSync(localPath)) return localPath;
  const defaultPath = path.join(cwd, ".env");
  if (fs.existsSync(defaultPath)) return defaultPath;
  return undefined;
})();

if (envPath) dotenv.config({ path: envPath });

async function main() {
  const [{ buildApp }, { env }] = await Promise.all([
    import("./app.js"),
    import("./shared/env.js"),
  ]);
  const app = await buildApp();
  await app.listen({ host: env.HOST, port: env.PORT });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
