/*
  Warnings:

  - You are about to drop the column `Longitude` on the `Client` table. All the data in the column will be lost.
  - Added the required column `address` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "latitude" TEXT NOT NULL,
    "longitude" TEXT NOT NULL,
    "address" TEXT NOT NULL
);
INSERT INTO "new_Client" ("email", "id", "latitude", "login", "name") SELECT "email", "id", "latitude", "login", "name" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
