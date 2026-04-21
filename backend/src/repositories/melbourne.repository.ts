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
