-- System-wide workspace settings (energy tariff). Existing tables are unchanged.
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "tariffTzsPerKwh" DECIMAL(12,2) NOT NULL DEFAULT 750,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorkspaceSettings" ("id", "tariffTzsPerKwh", "updatedAt")
VALUES ('default', 750, CURRENT_TIMESTAMP);
