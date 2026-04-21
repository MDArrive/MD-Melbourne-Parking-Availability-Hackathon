import { MelbourneSensor } from '@prisma/client';
import * as MelbourneRepository from '../repositories/melbourne.repository';

const MELBOURNE_API_BASE = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets';
const SENSORS_ENDPOINT = '/on-street-parking-bay-sensors/records';
const PAGE_LIMIT = 100;

interface MelbourneApiRecord {
  lastupdated: string;
  status_timestamp: string;
  zone_number: number;
  status_description: string;
  kerbsideid: number;
  location: {
    lon: number;
    lat: number;
  };
}

interface MelbourneApiResponse {
  total_count: number;
  results: MelbourneApiRecord[];
}

export interface SensorWithDuration extends MelbourneSensor {
  durationMinutes: number | null;
}

export interface ZonePriority {
  zoneNumber: number;
  totalBays: number;
  occupiedBays: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
  score: number;
  averageDurationMinutes: number | null;
}

export const fetchAndSync = async (): Promise<number> => {
  let offset = 0;
  let totalSynced = 0;

  while (true) {
    const url = `${MELBOURNE_API_BASE}${SENSORS_ENDPOINT}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Melbourne API request failed: ${response.status} ${response.statusText}`);
    }

    const data: MelbourneApiResponse = await response.json();
    const records = data.results;

    for (const record of records) {
      if (!record.kerbsideid || !record.zone_number || !record.location?.lat || !record.location?.lon) continue;
      await MelbourneRepository.upsertSensor({
        kerbsideId: record.kerbsideid,
        zoneNumber: record.zone_number,
        lat: record.location.lat,
        lon: record.location.lon,
        status: record.status_description,
        lastUpdated: new Date(record.lastupdated),
      });
    }

    totalSynced += records.length;
    offset += PAGE_LIMIT;

    if (records.length < PAGE_LIMIT) {
      break;
    }
  }

  return totalSynced;
};

export const getSensorsWithDuration = async (): Promise<SensorWithDuration[]> => {
  const sensors = await MelbourneRepository.findAllSensors();
  const now = Date.now();

  return sensors.map((sensor) => ({
    ...sensor,
    durationMinutes:
      sensor.status === 'Present' && sensor.occupancySince
        ? Math.floor((now - sensor.occupancySince.getTime()) / 60_000)
        : null,
  }));
};

export const captureSnapshot = async (): Promise<{
  id: string;
  capturedAt: Date;
  sensorCount: number;
}> => {
  const sensors = await getSensorsWithDuration();
  const snapshot = await MelbourneRepository.createSnapshot(
    sensors.map((s) => ({
      kerbsideId: s.kerbsideId,
      zoneNumber: s.zoneNumber,
      lat: s.lat,
      lon: s.lon,
      status: s.status,
      durationMinutes: s.durationMinutes,
    })),
  );
  return { id: snapshot.id, capturedAt: snapshot.capturedAt, sensorCount: snapshot.sensorCount };
};

export const listSnapshots = async (): Promise<
  { id: string; capturedAt: Date; sensorCount: number }[]
> => {
  return MelbourneRepository.listSnapshots();
};

export const getSnapshotSensors = async (id: string): Promise<SensorWithDuration[]> => {
  const snapshot = await MelbourneRepository.getSnapshotWithReadings(id);
  if (!snapshot) {
    const err: any = new Error(`Snapshot not found: ${id}`);
    err.statusCode = 404;
    throw err;
  }
  return snapshot.readings.map((r) => ({
    id: r.id,
    kerbsideId: r.kerbsideId,
    zoneNumber: r.zoneNumber,
    lat: r.lat,
    lon: r.lon,
    status: r.status,
    occupancySince: null,
    lastUpdated: snapshot.capturedAt,
    durationMinutes: r.durationMinutes ?? null,
  }));
};

export const getPriorityZones = async (): Promise<ZonePriority[]> => {
  const sensors = await getSensorsWithDuration();

  const zoneMap = new Map<number, SensorWithDuration[]>();

  for (const sensor of sensors) {
    const existing = zoneMap.get(sensor.zoneNumber) ?? [];
    existing.push(sensor);
    zoneMap.set(sensor.zoneNumber, existing);
  }

  const zones: ZonePriority[] = [];

  for (const [zoneNumber, zoneSensors] of zoneMap.entries()) {
    const totalBays = zoneSensors.length;
    let occupiedBays = 0;
    let redCount = 0;
    let amberCount = 0;
    let greenCount = 0;

    for (const sensor of zoneSensors) {
      if (sensor.status === 'Present') {
        occupiedBays++;
        const minutes = sensor.durationMinutes ?? 0;
        if (minutes > 12) {
          redCount++;
        } else if (minutes >= 4) {
          amberCount++;
        } else {
          greenCount++;
        }
      }
    }

    const score = redCount * 3 + amberCount * 1;

    const durations = zoneSensors
      .filter(s => s.status === 'Present' && s.durationMinutes !== null)
      .map(s => s.durationMinutes as number);
    const averageDurationMinutes = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    zones.push({
      zoneNumber,
      totalBays,
      occupiedBays,
      redCount,
      amberCount,
      greenCount,
      score,
      averageDurationMinutes,
    });
  }

  return zones.sort((a, b) => b.score - a.score);
};
