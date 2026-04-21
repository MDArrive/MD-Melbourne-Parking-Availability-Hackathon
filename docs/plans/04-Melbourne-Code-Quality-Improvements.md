# Plan: Melbourne Parking — Code Quality Improvements

This document covers the code review and quality improvements applied to the Melbourne parking feature after initial implementation: performance fixes, correctness issues, security hardening, and resilience improvements.

## Overview

A principal code review identified 26 issues across the Melbourne parking backend and frontend. Issues were grouped into four categories: performance (N+1 queries, missing indexes, unnecessary re-computation), correctness (threshold mismatches, stale data, pagination gaps), security (URL injection risk, input validation), and resilience (error handling, connection lifecycle, caching).

## Goals

- [x] Eliminate N+1 database queries in sensor upsert path
- [x] Add database indexes for snapshot query hot paths
- [x] Remove redundant computation in frontend render cycle
- [x] Fix occupancy duration thresholds to be consistent across frontend and backend
- [x] Cap external API pagination to prevent runaway loops
- [x] Add in-process caching for all three external APIs
- [x] Harden news headline URL handling against non-HTTP links
- [x] Improve poller error tracking and graceful shutdown

---

## Phase 1: Database Performance

- [x] Add `@@index([zoneNumber])` and `@@index([kerbsideId])` to `MelbourneSnapshotReading` in `schema.prisma`
- [x] Run `prisma migrate dev --name add_snapshot_reading_indexes`
- [x] Add `take: 500` limit to `listSnapshots` repository query
- [x] Fix `findSnapshotReadingsSince` to select only needed fields (was using `include: { readings: true }` which over-fetches)

## Phase 2: Backend — Eliminate N+1 Sensor Upsert

- [x] Replace per-record `findUnique + upsert` (called ~3,309 times) with bulk approach in `upsertSensors(records[])`:
  - Load all existing sensors in one `findMany` query
  - Build `Map<kerbsideId, existing>` in memory
  - Compute `occupancySince` transitions in memory (Present→Present keeps timestamp, Unoccupied→Present sets now, Present→Unoccupied clears)
  - Split into `toCreate[]` and `toUpdate[]`
  - `createMany` for new sensors in batches of 500
  - `$transaction([...updateMany])` for updates in batches of 500
- [x] Update `fetchAndSync()` to collect all paginated records first, then call `upsertSensors` once

## Phase 3: Backend — Resilience & Caching

- [x] Add `MAX_PAGES = 100` cap on the CoM Open Data API pagination loop
- [x] Implement `cached<T>(key, ttlMs, fn)` helper using `Map<string, { value; expiresAt }>` for in-process caching
- [x] Wrap `getWeather()` with 10-minute cache
- [x] Wrap `getCarParks()` with 30-minute cache
- [x] Wrap `getNewsHeadlines()` with 30-minute cache
- [x] Add `AbortSignal.timeout(15_000)` on all three external fetch calls
- [x] Add `process.on('beforeExit', () => prisma.$disconnect())` for graceful Prisma shutdown
- [x] Rewrite `melbournePoller.ts` with separate `runSync()`, `runSnapshot()`, `runPrune()` functions each with independent failure counters; initial startup only snapshots if sync returned sensors

## Phase 4: Backend — Correctness

- [x] Extract `categorizeDuration(minutes)` as single exported function in `melbourne.service.ts` — all green/amber/red categorisation uses this one function
- [x] Update thresholds to match real parking enforcement use: green 0–60 min, amber 61–120 min, red >120 min (was 4/12 min)
- [x] Use `flatMap` instead of nested loops in snapshot reading aggregation
- [x] Fix `getOccupancyOverTime`, `getZoneSummary`, and `getPriorityZones` to all use `categorizeDuration()` instead of inline comparisons

## Phase 5: Backend — Security

- [x] Add `isHttpUrl(url)` validator: `['http:', 'https:'].includes(new URL(u).protocol)` — rejects `javascript:` and other schemes
- [x] Apply `isHttpUrl` to all news headline URLs before adding to response
- [x] Apply `isHttpUrl` to car park website URLs extracted from OSM tags before using them
- [x] Add `parseHours()` helper in controller validating hours is finite, positive, and ≤168 (1 week)

## Phase 6: Frontend — Performance

- [x] Move `toDatetimeLocal()` helper outside the component (was inside, re-created on every render)
- [x] Add `useMemo` for `colouredSensors` — sensor colour computation runs once per sensors change, not on every render
- [x] Remove redundant `.sort()` on zones data in `MelbourneReporting.tsx` (backend already sorts by score)

## Phase 7: Frontend — Correctness

- [x] Fix `setWeather(d ?? null)` — `fetchApi<WeatherData>` returns `T | undefined`, but state type is `WeatherData | null`
- [x] Fix high-priority badge threshold in `PriorityZonePanel.tsx`: `z.score > 10` (was `z.score > 5`)
- [x] Fix overstay dot tooltip to match active threshold: "Bay occupied > 120 min"
- [x] Update legend labels to match thresholds: "0 – 60 min", "61 – 120 min", "> 120 min"
- [x] History chip deduplication: `reduce` keeping only snaps ≥5 min apart, max 12 chips (was showing many chips with identical timestamps)

## Phase 8: Integration Testing

- [x] Confirm sensor upsert completes in <2 s for 3,309 records (was timing out with N+1)
- [x] Confirm snapshot queries use indexes (check query plan)
- [x] Confirm weather / news / car parks return cached responses on second call within TTL
- [x] Confirm news URLs are all valid HTTP/HTTPS links
- [x] Confirm history chips show distinct times 5+ minutes apart
