-- CreateTable
CREATE TABLE "MelbourneSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorCount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "MelbourneSnapshotReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "kerbsideId" INTEGER NOT NULL,
    "zoneNumber" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    CONSTRAINT "MelbourneSnapshotReading_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MelbourneSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MelbourneSnapshot_capturedAt_idx" ON "MelbourneSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "MelbourneSnapshotReading_snapshotId_idx" ON "MelbourneSnapshotReading"("snapshotId");
