-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" INTEGER,
    "branch" TEXT NOT NULL
);
INSERT INTO "new_Subject" ("branch", "id", "name", "semester", "subjectCode") SELECT "branch", "id", "name", "semester", "subjectCode" FROM "Subject";
DROP TABLE "Subject";
ALTER TABLE "new_Subject" RENAME TO "Subject";
CREATE UNIQUE INDEX "Subject_subjectCode_key" ON "Subject"("subjectCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
