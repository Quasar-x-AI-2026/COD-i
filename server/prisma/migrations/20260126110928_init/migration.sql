/*
  Warnings:

  - You are about to drop the column `embedding` on the `FaceEmbedding` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FaceEmbedding" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "frontImage" TEXT NOT NULL,
    "leftImage" TEXT NOT NULL,
    "rightImage" TEXT NOT NULL,
    "qdrantPointId" TEXT,
    "modelVersion" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaceEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FaceEmbedding" ("frontImage", "leftImage", "modelVersion", "rightImage", "updatedAt", "userId") SELECT "frontImage", "leftImage", "modelVersion", "rightImage", "updatedAt", "userId" FROM "FaceEmbedding";
DROP TABLE "FaceEmbedding";
ALTER TABLE "new_FaceEmbedding" RENAME TO "FaceEmbedding";
CREATE UNIQUE INDEX "FaceEmbedding_qdrantPointId_key" ON "FaceEmbedding"("qdrantPointId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
