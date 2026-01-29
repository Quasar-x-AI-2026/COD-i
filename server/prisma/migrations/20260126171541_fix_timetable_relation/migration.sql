-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Timetable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branch" TEXT,
    "semester" INTEGER,
    "subjectId" INTEGER NOT NULL,
    "dayOfWeek" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "Timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Timetable" ("branch", "dayOfWeek", "endTime", "id", "semester", "startTime", "subjectId") SELECT "branch", "dayOfWeek", "endTime", "id", "semester", "startTime", "subjectId" FROM "Timetable";
DROP TABLE "Timetable";
ALTER TABLE "new_Timetable" RENAME TO "Timetable";
CREATE INDEX "Timetable_branch_semester_dayOfWeek_idx" ON "Timetable"("branch", "semester", "dayOfWeek");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
