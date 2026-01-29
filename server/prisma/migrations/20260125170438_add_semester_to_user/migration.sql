/*
  Warnings:

  - Added the required column `frontImage` to the `FaceEmbedding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leftImage` to the `FaceEmbedding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightImage` to the `FaceEmbedding` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FaceEmbedding" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "frontImage" TEXT NOT NULL,
    "leftImage" TEXT NOT NULL,
    "rightImage" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaceEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FaceEmbedding" ("embedding", "modelVersion", "updatedAt", "userId") SELECT "embedding", "modelVersion", "updatedAt", "userId" FROM "FaceEmbedding";
DROP TABLE "FaceEmbedding";
ALTER TABLE "new_FaceEmbedding" RENAME TO "FaceEmbedding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
