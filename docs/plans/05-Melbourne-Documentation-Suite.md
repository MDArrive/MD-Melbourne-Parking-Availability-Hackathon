# Plan: Melbourne Parking — Documentation Suite

This document covers the creation of the technical documentation set for the Melbourne Parking Map feature: testing scripts, build instructions, maintenance runbooks, and API reference.

## Overview

Four documentation files were created to enable any developer or operator to set up, test, maintain, and extend the Melbourne Parking Map without prior knowledge of the codebase. The suite covers local development, CI/CD, all external API dependencies, database maintenance, and a full curl-based smoke test script.

## Goals

- [x] Document every step required to build and run the application from scratch
- [x] Provide executable smoke tests for all API endpoints
- [x] Document the poller lifecycle and all external API dependencies
- [x] Document database growth expectations and pruning behaviour
- [x] Update the API reference to reflect all Melbourne parking endpoints
- [x] Index all documentation from a single entry point

---

## Phase 1: Testing Documentation (`docs/TESTING.md`)

- [x] Document backend unit/integration test commands (`npm test`, `--watch`, `--coverage`)
- [x] Document frontend test commands (Vite + Vitest)
- [x] Write curl scripts for every Melbourne parking endpoint (sensors, priority-zones, snapshots, weather, news, carparks, occupancy-over-time, zone-summary, refresh, CSV exports)
- [x] Write automated smoke test shell script (`test-endpoints.sh`) that checks HTTP 200 for all endpoints and prints pass/fail
- [x] Include gap analysis table listing endpoints with no automated tests

## Phase 2: Build Documentation (`docs/BUILD.md`)

- [x] Document first-time setup: clone, `npm install`, environment variables, Prisma migrate, seed
- [x] Document dev server startup commands (backend port 5001, frontend port 5173)
- [x] Document database migration workflow for schema changes (`prisma migrate dev`, `prisma generate`)
- [x] Document production build steps (`npm run build`, static file serving)
- [x] Provide three deployment option templates (A: static + Node, B: Docker Compose, C: managed PaaS)
- [x] Include CI/CD checklist (lint, test, build, migrate, smoke test)
- [x] Add troubleshooting table for common setup errors (port conflicts, DATABASE_URL missing, Prisma client out of date)

## Phase 3: Maintenance Documentation (`docs/MAINTENANCE.md`)

- [x] Document poller behaviour: sync every 60 s, snapshot every 5 min, prune every hour, 7-day retention
- [x] Document all four external API dependencies with test commands and failure modes:
  - City of Melbourne Open Data API (sensor data)
  - BOM Daily Forecast API (weather)
  - Google News RSS (headlines)
  - Overpass API / OpenStreetMap (car park locations)
- [x] Estimate database storage growth: ~953K rows/day, ~6.67M rows/week, ~37 MB/week at 40 bytes/row
- [x] Document manual pruning SQL command for emergency storage recovery
- [x] Add health check commands for all services
- [x] Write runbooks for common incidents: API down, database locked, poller not updating, snapshot table growing unexpectedly
- [x] Document all three Git remotes (origin, hackathon, personal) with push commands

## Phase 4: API Reference Update (`docs/API_REFERENCE.md`)

- [x] Fix port references: 3001 → 5001 (backend), 3000 → 5173 (frontend CORS origin)
- [x] Add all Melbourne parking endpoints with full request/response shapes:
  - `GET /api/melbourne/sensors`
  - `GET /api/melbourne/priority-zones`
  - `GET /api/melbourne/snapshots`
  - `GET /api/melbourne/snapshots/:id/sensors`
  - `POST /api/melbourne/refresh`
  - `GET /api/melbourne/occupancy-over-time`
  - `GET /api/melbourne/zone-summary`
  - `GET /api/melbourne/weather`
  - `GET /api/melbourne/news`
  - `GET /api/melbourne/carparks`
  - `GET /api/melbourne/sensors.csv`
  - `GET /api/melbourne/history.csv`
- [x] Include example responses for key endpoints

## Phase 5: Documentation Index Update (`docs/DOCUMENTATION_INDEX.md`)

- [x] Add Testing section linking `TESTING.md`
- [x] Add Operations section linking `MAINTENANCE.md`
- [x] Add Build section linking `BUILD.md`
- [x] Verify all links resolve to existing files
