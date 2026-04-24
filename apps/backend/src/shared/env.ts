import { z } from "zod";

function parseEnvBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
  return value;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default("info"),
  // comma-separated list is allowed, e.g. "http://localhost:3080,http://192.168.1.10:3080"
  // use "*" to reflect any origin (dev only) when credentials are enabled
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_SECRET: z.string().default("dev_cookie_secret_change_me"),
  JWT_ACCESS_SECRET: z.string().default("dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: z.string().default("dev_refresh_secret_change_me"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  INTEGRATION_API_KEY: z.string().default("dev_integration_key_change_me"),
  DATABASE_URL: z
    .string()
    .default(
      "postgresql://postgres:postgres@localhost:5432/juri4?schema=public",
    ),
  UPLOAD_DIR: z.string().default("/data/uploads"),
  FILE_MAX_SIZE_BYTES: z.coerce.number().default(15 * 1024 * 1024),
  COOKIE_SECURE: z.preprocess(parseEnvBoolean, z.boolean()).default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax")
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
