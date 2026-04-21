# Plan: Melbourne Real-Time Parking Map

This document outlines the phases and steps involved in building the core Melbourne real-time parking map — including live sensor data, priority zone panel, history playback, and the reporting page.

## Overview

The Melbourne Parking Map is an operational dashboard for City of Melbourne parking enforcement. It displays ~3,300 kerbside bay sensors on a Leaflet map, colour-coded by occupancy duration, with a resizable priority zone panel for officer dispatch and a reporting section for operations managers.

## Goals

- [x] Fetch and display real-time sensor data from the City of Melbourne Open Data API
- [x] Colour-code bays by occupancy duration (green / amber / red)
- [x] Show per-zone priority scores to guide officer dispatch
- [x] Support historical playback via 5-minute snapshots
- [x] Provide a reporting page with charts and CSV export
- [x] Auto-refresh live data every 30 seconds without blocking the UI

---

## Phase 1: Database Schema

- [x] Add `MelbourneSensor` model to `prisma/schema.prisma` (kerbsideId, zoneNumber, lat, lon, status, occupancySince, lastUpdated)
- [x] Add `MelbourneSnapshot` and `MelbourneSnapshotReading` models for history playback
- [x] Add indexes on `MelbourneSnapshot.capturedAt`, `MelbourneSnapshotReading.snapshotId`, `zoneNumber`, `kerbsideId`
- [x] Run `prisma migrate dev` to apply schema

## Phase 2: Backend — Data Ingestion

- [x] Implement `fetchAndSync()` in `melbourne.service.ts` to paginate the CoM Open Data API (up to `MAX_PAGES = 100`)
- [x] Add `AbortSignal.timeout(15_000)` on external fetch calls
- [x] Implement `upsertSensors(records[])` in `melbourne.repository.ts` — load all existing in one query, compute `occupancySince` in memory, batch `createMany` + `$transaction` updates (eliminates N+1)
- [x] Implement `captureSnapshot()` to write a point-in-time `MelbourneSnapshot` with all current sensor readings
- [x] Implement `pruneOldSnapshots(days)` with `deleteMany` to enforce 7-day retention
- [x] Start background poller in `melbournePoller.ts`: sync every 60 s, snapshot every 5 min, prune every hour

## Phase 3: Backend — API Endpoints

- [x] `GET /api/melbourne/sensors` — all sensors with computed `durationMinutes`
- [x] `GET /api/melbourne/priority-zones` — zones ranked by `redCount * 3 + amberCount * 1`
- [x] `GET /api/melbourne/snapshots` — list of snapshots (most recent first, max 500)
- [x] `GET /api/melbourne/snapshots/:id/sensors` — sensor readings for a specific snapshot
- [x] `POST /api/melbourne/refresh` — trigger an immediate sync
- [x] `GET /api/melbourne/occupancy-over-time?hours=N` — time-series data for reporting charts
- [x] `GET /api/melbourne/zone-summary` — per-zone occupancy breakdown for reporting table
- [x] `GET /api/melbourne/sensors.csv` and `GET /api/melbourne/history.csv` — CSV exports
- [x] Add `parseHours()` helper in controller (finite, positive, ≤168, default 24)
- [x] Wire all routes in `melbourne.routes.ts` and register under `/api/melbourne` in `server.ts`

## Phase 4: Frontend — Map Component (`MelbourneParkingMap.tsx`)

- [x] Bootstrap `MapContainer` with `react-leaflet` centred on Melbourne CBD (-37.8136, 144.9631)
- [x] Render `CircleMarker` per sensor, coloured by `sensorColour()` (green ≤60 min, amber 61–120 min, red >120 min)
- [x] Add `Popup` on each marker showing zone, status, and duration
- [x] Add `StatPill` components in the stat bar for total / occupied / green / amber / red counts with click-to-toggle colour filter
- [x] Move `toDatetimeLocal` helper outside the component to avoid re-creation on every render
- [x] Pre-compute sensor colours with `useMemo` keyed on sensors array
- [x] Auto-refresh every 30 s via `setInterval` (paused when history mode is active)
- [x] Add resizable right panel with mouse drag handle (`mousedown/mousemove/mouseup`)
- [x] Full-height layout: negative margin to escape `.content` padding, `flex: 1` for map section

## Phase 5: Frontend — History Mode

- [x] Fetch snapshot list when history mode is toggled on
- [x] `datetime-local` picker to select a point in time; `findNearestSnapshot()` picks closest match
- [x] Quick-select chips for up to 12 recent snapshots, deduplicated to ≥5-minute intervals via `reduce`
- [x] Load snapshot sensor data when selected snapshot changes
- [x] Show persistent banner on map in history mode; pause and visually separate from live mode

## Phase 6: Frontend — Priority Zone Panel (`PriorityZonePanel.tsx`)

- [x] `ZoneCard` per zone with colour-coded left border (red / amber / green) by priority score
- [x] Segmented bar chart showing red / amber / green bay proportions
- [x] Overstay indicator dots (max 5, then "+N more") with tooltip
- [x] HIGH priority badge count in card header
- [x] Auto-scrollable panel body; "Auto-updates every 30s" footer

## Phase 7: Frontend — Reporting Page (`MelbourneReporting.tsx`)

- [x] Occupancy over time line chart using Recharts
- [x] Zone summary table with occupancy %, red/amber/green counts, avg stay
- [x] Time-range selector (1h / 6h / 24h) wired to `?hours=N` query param
- [x] CSV download button for current time range
- [x] Fix `API_BASE` to use `VITE_API_BASE_URL` env var with `localhost:5001` fallback

## Phase 8: Integration Testing

- [x] Verify sensor data renders on map after backend sync
- [x] Confirm priority zone scores rank correctly by red bay count
- [x] Test history playback across multiple snapshots
- [x] Confirm CSV exports include correct time range
- [x] Validate 30 s auto-refresh updates map without full page reload
