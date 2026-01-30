/*
  Warnings:

  - You are about to alter the column `semester` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rollNumber" TEXT,
    "email" TEXT NOT NULL,
    "hashPassword" TEXT NOT NULL,
    "branch" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "semester" INTEGER
);
INSERT INTO "new_User" ("branch", "createdAt", "email", "hashPassword", "id", "name", "rollNumber", "semester") SELECT "branch", "createdAt", "email", "hashPassword", "id", "name", "rollNumber", "semester" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_rollNumber_key" ON "User"("rollNumber");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
