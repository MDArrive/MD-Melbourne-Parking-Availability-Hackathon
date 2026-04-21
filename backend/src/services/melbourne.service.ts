import { MelbourneSensor } from '@prisma/client';
import * as MelbourneRepository from '../repositories/melbourne.repository';

const MELBOURNE_API_BASE = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets';
const SENSORS_ENDPOINT = '/on-street-parking-bay-sensors/records';
const PAGE_LIMIT = 100;
const MAX_PAGES = 100; // safety cap: 100 × 100 = 10,000 sensors max

// ── Simple in-process cache ───────────────────────────────────
interface CacheEntry<T> { data: T; fetchedAt: number; }
const _cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.fetchedAt < ttlMs) return hit.data;
  const data = await fn();
  _cache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

// ── Duration categorisation (single source of truth) ─────────
export function categorizeDuration(minutes: number | null): 'green' | 'amber' | 'red' {
  if (minutes === null || minutes < 4) return 'green';
  if (minutes <= 12) return 'amber';
  return 'red';
}

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
  const allRecords: MelbourneRepository.SensorUpsertData[] = [];
  let offset = 0;
  let page = 0;

  while (page < MAX_PAGES) {
    const url = `${MELBOURNE_API_BASE}${SENSORS_ENDPOINT}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!response.ok) {
      throw new Error(`Melbourne API request failed: ${response.status} ${response.statusText}`);
    }

    const data: MelbourneApiResponse = await response.json();
    const records = data.results;

    for (const record of records) {
      if (!record.kerbsideid || !record.zone_number || !record.location?.lat || !record.location?.lon) continue;
      allRecords.push({
        kerbsideId: record.kerbsideid,
        zoneNumber: record.zone_number,
        lat: record.location.lat,
        lon: record.location.lon,
        status: record.status_description,
        lastUpdated: new Date(record.lastupdated),
      });
    }

    offset += PAGE_LIMIT;
    page++;

    if (records.length < PAGE_LIMIT) break;
  }

  if (page === MAX_PAGES) {
    console.warn(`fetchAndSync hit MAX_PAGES (${MAX_PAGES}) safety cap`);
  }

  await MelbourneRepository.upsertSensors(allRecords);
  return allRecords.length;
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
    createdAt: snapshot.capturedAt,
    updatedAt: snapshot.capturedAt,
    durationMinutes: r.durationMinutes ?? null,
  }));
};

export interface OccupancyOverTimeRow {
  capturedAt: string;
  totalSensors: number;
  occupiedCount: number;
  occupancyPercent: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
}

export const getOccupancyOverTime = async (hours: number): Promise<OccupancyOverTimeRow[]> => {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const snapshots = await MelbourneRepository.findSnapshotsWithReadingsSince(cutoff);

  return snapshots.map((snapshot) => {
    const totalSensors = snapshot.readings.length;
    let occupiedCount = 0;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    for (const reading of snapshot.readings) {
      if (reading.status === 'Present') {
        occupiedCount++;
        const cat = categorizeDuration(reading.durationMinutes);
        if (cat === 'green') greenCount++;
        else if (cat === 'amber') amberCount++;
        else redCount++;
      }
    }

    const occupancyPercent =
      totalSensors > 0
        ? Math.round((occupiedCount / totalSensors) * 1000) / 10
        : 0;

    return {
      capturedAt: snapshot.capturedAt.toISOString(),
      totalSensors,
      occupiedCount,
      occupancyPercent,
      greenCount,
      amberCount,
      redCount,
    };
  });
};

export interface ZoneSummaryRow {
  zoneNumber: number;
  totalBays: number;
  occupiedBays: number;
  occupancyPercent: number;
  avgDurationMinutes: number | null;
  redCount: number;
  amberCount: number;
  greenCount: number;
}

export const getZoneSummary = async (): Promise<ZoneSummaryRow[]> => {
  const snapshot = await MelbourneRepository.findMostRecentSnapshotWithReadings();
  if (!snapshot) return [];

  const zoneMap = new Map<
    number,
    { status: string; durationMinutes: number | null }[]
  >();

  for (const reading of snapshot.readings) {
    const existing = zoneMap.get(reading.zoneNumber) ?? [];
    existing.push({ status: reading.status, durationMinutes: reading.durationMinutes ?? null });
    zoneMap.set(reading.zoneNumber, existing);
  }

  const zones: ZoneSummaryRow[] = [];

  for (const [zoneNumber, readings] of zoneMap.entries()) {
    const totalBays = readings.length;
    let occupiedBays = 0;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;
    const durations: number[] = [];

    for (const reading of readings) {
      if (reading.status === 'Present') {
        occupiedBays++;
        if (reading.durationMinutes !== null) durations.push(reading.durationMinutes);
        const cat = categorizeDuration(reading.durationMinutes);
        if (cat === 'green') greenCount++;
        else if (cat === 'amber') amberCount++;
        else redCount++;
      }
    }

    const occupancyPercent =
      totalBays > 0 ? Math.round((occupiedBays / totalBays) * 1000) / 10 : 0;

    const avgDurationMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    zones.push({
      zoneNumber,
      totalBays,
      occupiedBays,
      occupancyPercent,
      avgDurationMinutes,
      redCount,
      amberCount,
      greenCount,
    });
  }

  return zones.sort((a, b) => b.occupancyPercent - a.occupancyPercent);
};

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const getSensorsAsCsv = async (): Promise<string> => {
  const sensors = await getSensorsWithDuration();
  const header = 'kerbsideId,zoneNumber,lat,lon,status,durationMinutes,lastUpdated';
  const rows = sensors.map((s) =>
    [
      csvEscape(s.kerbsideId),
      csvEscape(s.zoneNumber),
      csvEscape(s.lat),
      csvEscape(s.lon),
      csvEscape(s.status),
      csvEscape(s.durationMinutes),
      csvEscape(s.lastUpdated.toISOString()),
    ].join(','),
  );
  return [header, ...rows].join('\n');
};

export const getHistoryAsCsv = async (hours: number): Promise<string> => {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await MelbourneRepository.findSnapshotReadingsSince(cutoff);
  const header = 'capturedAt,kerbsideId,zoneNumber,lat,lon,status,durationMinutes';
  const lines = rows.map((r) =>
    [
      csvEscape(r.capturedAt.toISOString()),
      csvEscape(r.kerbsideId),
      csvEscape(r.zoneNumber),
      csvEscape(r.lat),
      csvEscape(r.lon),
      csvEscape(r.status),
      csvEscape(r.durationMinutes),
    ].join(','),
  );
  return [header, ...lines].join('\n');
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
        const cat = categorizeDuration(sensor.durationMinutes);
        if (cat === 'red') redCount++;
        else if (cat === 'amber') amberCount++;
        else greenCount++;
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

const BOM_GEOHASH = 'r1r0fup'; // Melbourne CBD 3000

export interface WeatherData {
  current: {
    temp: number | null;
    description: string;
    icon: string;
    rainChance: number;
    tempMax: number | null;
    tempMin: number | null;
  };
  tomorrow: {
    description: string;
    tempMax: number | null;
    tempMin: number | null;
    rainChance: number;
  } | null;
}

export interface CarPark {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lon: number;
  brand: 'wilson' | 'first' | 'nationwide';
  capacity: number | null;
  access: string | null;
}

export const getCarParks = async (): Promise<CarPark[]> => {
  return cached('carparks', 30 * 60 * 1000, _fetchCarParks);
};

const _fetchCarParks = async (): Promise<CarPark[]> => {
  const query = `[out:json][timeout:30];
(
  node["amenity"="parking"]["operator"~"Wilson|First|Nationwide",i](-37.835,144.940,-37.800,144.990);
  way["amenity"="parking"]["operator"~"Wilson|First|Nationwide",i](-37.835,144.940,-37.800,144.990);
  node["amenity"="parking"]["name"~"Wilson|First|Nationwide",i](-37.835,144.940,-37.800,144.990);
  way["amenity"="parking"]["name"~"Wilson|First|Nationwide",i](-37.835,144.940,-37.800,144.990);
);
out center tags;`;

  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': 'MelbourneParkingApp/1.0' } },
  );
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();

  const seen = new Set<string>();
  const carparks: CarPark[] = [];

  for (const el of data.elements ?? []) {
    const lat: number | undefined = el.lat ?? el.center?.lat;
    const lon: number | undefined = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    const tags = el.tags ?? {};
    const name: string = tags.name ?? tags['name:en'] ?? 'Car Park';
    const operator: string = tags.operator ?? tags.brand ?? '';
    const combined = `${name} ${operator}`.toLowerCase();

    let brand: CarPark['brand'] | null = null;
    if (combined.includes('wilson')) brand = 'wilson';
    else if (combined.includes('first parking') || combined.includes('first park')) brand = 'first';
    else if (combined.includes('nationwide')) brand = 'nationwide';
    else continue;

    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    carparks.push({
      id: String(el.id),
      name,
      operator: operator || name,
      lat,
      lon,
      brand,
      capacity: tags.capacity ? Number(tags.capacity) : null,
      access: tags.access ?? tags.opening_hours ?? null,
    });
  }

  return carparks;
};

export interface NewsHeadline {
  title: string;
  url: string;
}

const isHttpUrl = (u: string): boolean => {
  try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; }
};

export const getNewsHeadlines = async (): Promise<NewsHeadline[]> => {
  return cached('news', 30 * 60 * 1000, async () => {
    const rssUrl = 'https://news.google.com/rss/search?q=parking+melbourne&hl=en-AU&gl=AU&ceid=AU:en';
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`News RSS error: ${res.status}`);
    const xml = await res.text();

    const headlines: NewsHeadline[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemXml);
      const linkMatch = /<link>([^<]+)<\/link>/.exec(itemXml);
      const guidMatch = /<guid[^>]*>([^<]+)<\/guid>/.exec(itemXml);

      if (titleMatch) {
        const rawTitle = titleMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
        const title = rawTitle.replace(/ - [^-]+$/, '').trim();
        const url = (linkMatch?.[1] ?? guidMatch?.[1] ?? '').trim();
        if (title && url && isHttpUrl(url)) headlines.push({ title, url });
      }
    }

    return headlines.slice(0, 12);
  });
};

export const pruneOldSnapshots = async (olderThanDays = 7): Promise<number> => {
  return MelbourneRepository.pruneOldSnapshots(olderThanDays * 24 * 60 * 60 * 1000);
};

export const getWeather = async (): Promise<WeatherData> => {
  return cached('weather', 10 * 60 * 1000, async () => {
    const url = `https://api.weather.bom.gov.au/v1/locations/${BOM_GEOHASH}/forecasts/daily`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`BOM API error: ${res.status}`);
    const json = await res.json();
    const days: any[] = json.data ?? [];
    const today = days[0] ?? null;
    const tomorrow = days[1] ?? null;
    return {
      current: {
        temp: today?.now?.temp_now ?? null,
        description: today?.short_text ?? 'No data',
        icon: today?.icon_descriptor ?? 'unknown',
        rainChance: today?.rain?.chance ?? 0,
        tempMax: today?.temp_max ?? null,
        tempMin: today?.temp_min ?? null, // daily minimum, not tonight's low
      },
      tomorrow: tomorrow ? {
        description: tomorrow.short_text ?? '',
        tempMax: tomorrow.temp_max ?? null,
        tempMin: tomorrow.temp_min ?? null,
        rainChance: tomorrow.rain?.chance ?? 0,
      } : null,
    };
  });
};
