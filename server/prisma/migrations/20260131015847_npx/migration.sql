-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClassSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "ClassSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClassSession" ("endTime", "id", "room", "sessionDate", "startTime", "subjectId", "teacherId") SELECT "endTime", "id", "room", "sessionDate", "startTime", "subjectId", "teacherId" FROM "ClassSession";
DROP TABLE "ClassSession";
ALTER TABLE "new_ClassSession" RENAME TO "ClassSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
