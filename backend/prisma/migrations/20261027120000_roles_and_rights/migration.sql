-- AlterEnum: every existing account starts as an agent with no rights
CREATE TYPE "Role_new" AS ENUM ('ROOT', 'ADMIN', 'AGENT');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ('AGENT'::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'AGENT';

-- DropTable
DROP TABLE "_UserPermissions";
DROP TABLE "Permission";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- Existing accounts keep their passwords and log in with their email's name part
UPDATE "User" SET "mustChangePassword" = false,
  "username" = split_part("email", '@', 1) || CASE
    WHEN (SELECT count(*) FROM "User" o WHERE lower(split_part(o."email", '@', 1)) = lower(split_part("User"."email", '@', 1))) > 1
    THEN '.' || "id" ELSE '' END;

-- A lone account is the one in use today, so it becomes root
UPDATE "User" SET "role" = 'ROOT', "username" = 'papatRoot' WHERE (SELECT count(*) FROM "User") = 1;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- CreateTable
CREATE TABLE "HouseAccess" (
    "userId" INTEGER NOT NULL,
    "houseId" INTEGER NOT NULL,
    "rights" TEXT[],

    CONSTRAINT "HouseAccess_pkey" PRIMARY KEY ("userId","houseId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT,
    "houseIds" INTEGER[],
    "changes" JSONB,
    "ip" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- The log is append-only for everyone, root included
CREATE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'The activity log cannot be changed or deleted';
END $$;
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();
CREATE TRIGGER "audit_log_no_truncate" BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_append_only"();

-- CreateIndex
CREATE INDEX "HouseAccess_houseId_idx" ON "HouseAccess"("houseId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_userId_at_idx" ON "AuditLog"("userId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "HouseAccess" ADD CONSTRAINT "HouseAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseAccess" ADD CONSTRAINT "HouseAccess_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;
