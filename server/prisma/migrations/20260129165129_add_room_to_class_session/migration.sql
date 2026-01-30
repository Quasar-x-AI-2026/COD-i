/*
  Warnings:

  - You are about to alter the column `qualityScore` on the `FaceEmbedding` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

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
    "qualityScore" INTEGER,
    "consistent" BOOLEAN,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaceEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FaceEmbedding" ("consistent", "frontImage", "leftImage", "modelVersion", "qdrantPointId", "qualityScore", "rightImage", "updatedAt", "userId") SELECT "consistent", "frontImage", "leftImage", "modelVersion", "qdrantPointId", "qualityScore", "rightImage", "updatedAt", "userId" FROM "FaceEmbedding";
DROP TABLE "FaceEmbedding";
ALTER TABLE "new_FaceEmbedding" RENAME TO "FaceEmbedding";
CREATE UNIQUE INDEX "FaceEmbedding_qdrantPointId_key" ON "FaceEmbedding"("qdrantPointId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
