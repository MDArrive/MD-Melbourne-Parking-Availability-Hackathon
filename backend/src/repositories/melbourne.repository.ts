import { PrismaClient, MelbourneSensor, MelbourneSnapshot, MelbourneSnapshotReading } from '@prisma/client';

const prisma = new PrismaClient();

// Graceful shutdown
process.on('beforeExit', () => { prisma.$disconnect(); });

export interface SensorUpsertData {
  kerbsideId: number;
  zoneNumber: number;
  lat: number;
  lon: number;
  status: string;
  lastUpdated: Date;
}

// Batch upsert: 1 read + batched writes instead of N×2 sequential round-trips
export const upsertSensors = async (records: SensorUpsertData[]): Promise<void> => {
  if (records.length === 0) return;

  const existing = await prisma.melbourneSensor.findMany({
    select: { kerbsideId: true, status: true, occupancySince: true },
  });
  const existingMap = new Map(existing.map(e => [e.kerbsideId, e]));
  const now = new Date();

  const toCreate: {
    kerbsideId: number; zoneNumber: number; lat: number; lon: number;
    status: string; occupancySince: Date | null; lastUpdated: Date;
  }[] = [];

  const toUpdate: ReturnType<typeof prisma.melbourneSensor.update>[] = [];

  for (const r of records) {
    const prev = existingMap.get(r.kerbsideId);
    // occupancySince note: poll interval (60s) means a car that leaves and a new
    // one arrives within the same window looks like a continuous stay. Thresholds
    // (4/12 min) are intentionally wider than the poll interval to reduce false positives.
    const occupancySince = !prev
      ? (r.status === 'Present' ? now : null)
      : r.status === 'Present' && prev.status === 'Unoccupied' ? now
      : r.status === 'Unoccupied' ? null
      : prev.occupancySince;

    if (!prev) {
      toCreate.push({
        kerbsideId: r.kerbsideId, zoneNumber: r.zoneNumber, lat: r.lat, lon: r.lon,
        status: r.status, occupancySince, lastUpdated: r.lastUpdated,
      });
    } else {
      toUpdate.push(prisma.melbourneSensor.update({
        where: { kerbsideId: r.kerbsideId },
        data: { zoneNumber: r.zoneNumber, lat: r.lat, lon: r.lon, status: r.status, occupancySince, lastUpdated: r.lastUpdated },
      }));
    }
  }

  const BATCH = 500;
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += BATCH) {
      await prisma.melbourneSensor.createMany({ data: toCreate.slice(i, i + BATCH) });
    }
  }
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    await prisma.$transaction(toUpdate.slice(i, i + BATCH));
  }
};

export const findAllSensors = async (): Promise<MelbourneSensor[]> => {
  return prisma.melbourneSensor.findMany();
};

export const findSensorsByZone = async (zoneNumber: number): Promise<MelbourneSensor[]> => {
  return prisma.melbourneSensor.findMany({ where: { zoneNumber } });
};

export interface SnapshotReadingInput {
  kerbsideId: number;
  zoneNumber: number;
  lat: number;
  lon: number;
  status: string;
  durationMinutes: number | null;
}

export const createSnapshot = async (readings: SnapshotReadingInput[]): Promise<MelbourneSnapshot> => {
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.melbourneSnapshot.create({ data: { sensorCount: readings.length } });
    const BATCH_SIZE = 500;
    for (let i = 0; i < readings.length; i += BATCH_SIZE) {
      await tx.melbourneSnapshotReading.createMany({
        data: readings.slice(i, i + BATCH_SIZE).map((r) => ({
          snapshotId: snapshot.id,
          kerbsideId: r.kerbsideId,
          zoneNumber: r.zoneNumber,
          lat: r.lat,
          lon: r.lon,
          status: r.status,
          durationMinutes: r.durationMinutes ?? undefined,
        })),
      });
    }
    return snapshot;
  });
};

export const listSnapshots = async (): Promise<
  { id: string; capturedAt: Date; sensorCount: number }[]
> => {
  return prisma.melbourneSnapshot.findMany({
    orderBy: { capturedAt: 'desc' },
    select: { id: true, capturedAt: true, sensorCount: true },
    take: 500,
  });
};

export const getSnapshotWithReadings = async (
  id: string,
): Promise<(MelbourneSnapshot & { readings: MelbourneSnapshotReading[] }) | null> => {
  return prisma.melbourneSnapshot.findUnique({ where: { id }, include: { readings: true } });
};

export interface SnapshotOccupancyRow {
  capturedAt: Date;
  readings: { status: string; durationMinutes: number | null }[];
}

export const findSnapshotsWithReadingsSince = async (cutoff: Date): Promise<SnapshotOccupancyRow[]> => {
  return prisma.melbourneSnapshot.findMany({
    where: { capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: 'asc' },
    include: { readings: { select: { status: true, durationMinutes: true } } },
  });
};

export const findMostRecentSnapshotWithReadings = async (): Promise<
  (MelbourneSnapshot & { readings: MelbourneSnapshotReading[] }) | null
> => {
  return prisma.melbourneSnapshot.findFirst({
    orderBy: { capturedAt: 'desc' },
    include: { readings: true },
  });
};

export const findSnapshotReadingsSince = async (cutoff: Date): Promise<
  { capturedAt: Date; kerbsideId: number; zoneNumber: number; lat: number; lon: number; status: string; durationMinutes: number | null }[]
> => {
  const snapshots = await prisma.melbourneSnapshot.findMany({
    where: { capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: 'asc' },
    include: {
      readings: {
        select: { kerbsideId: true, zoneNumber: true, lat: true, lon: true, status: true, durationMinutes: true },
      },
    },
  });

  return snapshots.flatMap(s =>
    s.readings.map(r => ({
      capturedAt: s.capturedAt,
      kerbsideId: r.kerbsideId,
      zoneNumber: r.zoneNumber,
      lat: r.lat,
      lon: r.lon,
      status: r.status,
      durationMinutes: r.durationMinutes ?? null,
    }))
  );
};

export const pruneOldSnapshots = async (olderThanMs: number): Promise<number> => {
  const cutoff = new Date(Date.now() - olderThanMs);
  const { count } = await prisma.melbourneSnapshot.deleteMany({ where: { capturedAt: { lt: cutoff } } });
  return count;
};
