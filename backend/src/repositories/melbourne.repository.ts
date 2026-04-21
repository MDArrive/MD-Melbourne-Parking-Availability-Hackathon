import { PrismaClient, MelbourneSensor, MelbourneSnapshot, MelbourneSnapshotReading } from '@prisma/client';

const prisma = new PrismaClient();

export interface SensorUpsertData {
  kerbsideId: number;
  zoneNumber: number;
  lat: number;
  lon: number;
  status: string;
  lastUpdated: Date;
}

export const upsertSensor = async (data: SensorUpsertData): Promise<MelbourneSensor> => {
  const existing = await prisma.melbourneSensor.findUnique({
    where: { kerbsideId: data.kerbsideId },
  });

  let occupancySince: Date | null | undefined = undefined;

  if (existing) {
    if (data.status === 'Present' && existing.status === 'Unoccupied') {
      occupancySince = new Date();
    } else if (data.status === 'Unoccupied') {
      occupancySince = null;
    } else {
      occupancySince = existing.occupancySince;
    }
  } else {
    occupancySince = data.status === 'Present' ? new Date() : null;
  }

  return prisma.melbourneSensor.upsert({
    where: { kerbsideId: data.kerbsideId },
    create: {
      kerbsideId: data.kerbsideId,
      zoneNumber: data.zoneNumber,
      lat: data.lat,
      lon: data.lon,
      status: data.status,
      occupancySince,
      lastUpdated: data.lastUpdated,
    },
    update: {
      zoneNumber: data.zoneNumber,
      lat: data.lat,
      lon: data.lon,
      status: data.status,
      occupancySince,
      lastUpdated: data.lastUpdated,
    },
  });
};

export const findAllSensors = async (): Promise<MelbourneSensor[]> => {
  return prisma.melbourneSensor.findMany();
};

export const findSensorsByZone = async (zoneNumber: number): Promise<MelbourneSensor[]> => {
  return prisma.melbourneSensor.findMany({
    where: { zoneNumber },
  });
};

export interface SnapshotReadingInput {
  kerbsideId: number;
  zoneNumber: number;
  lat: number;
  lon: number;
  status: string;
  durationMinutes: number | null;
}

export const createSnapshot = async (
  readings: SnapshotReadingInput[],
): Promise<MelbourneSnapshot> => {
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.melbourneSnapshot.create({
      data: {
        sensorCount: readings.length,
      },
    });

    const BATCH_SIZE = 500;
    for (let i = 0; i < readings.length; i += BATCH_SIZE) {
      const batch = readings.slice(i, i + BATCH_SIZE);
      await tx.melbourneSnapshotReading.createMany({
        data: batch.map((r) => ({
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
  });
};

export const getSnapshotWithReadings = async (
  id: string,
): Promise<(MelbourneSnapshot & { readings: MelbourneSnapshotReading[] }) | null> => {
  return prisma.melbourneSnapshot.findUnique({
    where: { id },
    include: { readings: true },
  });
};

export interface SnapshotOccupancyRow {
  capturedAt: Date;
  readings: { status: string; durationMinutes: number | null }[];
}

export const findSnapshotsWithReadingsSince = async (
  cutoff: Date,
): Promise<SnapshotOccupancyRow[]> => {
  return prisma.melbourneSnapshot.findMany({
    where: { capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: 'asc' },
    include: {
      readings: {
        select: { status: true, durationMinutes: true },
      },
    },
  });
};

export const findMostRecentSnapshotWithReadings = async (): Promise<
  (MelbourneSnapshot & { readings: MelbourneSnapshotReading[] }) | null
> => {
  const snapshot = await prisma.melbourneSnapshot.findFirst({
    orderBy: { capturedAt: 'desc' },
    include: { readings: true },
  });
  return snapshot;
};

export const findSnapshotReadingsSince = async (
  cutoff: Date,
): Promise<
  {
    capturedAt: Date;
    kerbsideId: number;
    zoneNumber: number;
    lat: number;
    lon: number;
    status: string;
    durationMinutes: number | null;
  }[]
> => {
  const snapshots = await prisma.melbourneSnapshot.findMany({
    where: { capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: 'asc' },
    include: { readings: true },
  });

  const rows: {
    capturedAt: Date;
    kerbsideId: number;
    zoneNumber: number;
    lat: number;
    lon: number;
    status: string;
    durationMinutes: number | null;
  }[] = [];

  for (const snapshot of snapshots) {
    for (const reading of snapshot.readings) {
      rows.push({
        capturedAt: snapshot.capturedAt,
        kerbsideId: reading.kerbsideId,
        zoneNumber: reading.zoneNumber,
        lat: reading.lat,
        lon: reading.lon,
        status: reading.status,
        durationMinutes: reading.durationMinutes ?? null,
      });
    }
  }

  return rows;
};
