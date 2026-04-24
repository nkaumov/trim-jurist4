-- Juri4: remove unused agent configs and "admin" role (platform is for lawyers only).

DROP TABLE IF EXISTS "agent_configs";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- Ensure no rows contain the removed value.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      UPDATE "users" SET "role" = 'lawyer' WHERE "role"::text = 'admin';
    END IF;

    -- Recreate enum without "admin" (Postgres enums do not support dropping values safely).
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
      CREATE TYPE "user_role_new" AS ENUM ('lawyer');
    END IF;

    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "user_role_new"
      USING ("role"::text::"user_role_new");

    DROP TYPE "user_role";
    ALTER TYPE "user_role_new" RENAME TO "user_role";
  END IF;
END$$;

