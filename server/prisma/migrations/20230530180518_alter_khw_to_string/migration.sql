-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "kwh" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reload" ("createdAt", "id", "kwh", "time", "userId", "value") SELECT "createdAt", "id", "kwh", "time", "userId", "value" FROM "Reload";
DROP TABLE "Reload";
ALTER TABLE "new_Reload" RENAME TO "Reload";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
