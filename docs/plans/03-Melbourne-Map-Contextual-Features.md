# Plan: Melbourne Map Contextual Features

This document covers the contextual overlay features added to the Melbourne Parking Map after the core map was complete: the BOM weather strip, scrolling parking news ticker, and car park operator pins with address and website.

## Overview

Three features were added to the map to give enforcement officers and supervisors richer context alongside the sensor data: current Melbourne weather (from BOM), a live parking news ticker (from Google News RSS), and pinned locations of major car park operators (Wilson, First Parking, Nationwide) sourced from OpenStreetMap.

## Goals

- [x] Show current Melbourne CBD weather conditions above the map
- [x] Display a scrolling ticker of parking-related news headlines
- [x] Pin Wilson, First Parking, and Nationwide car parks on the map
- [x] Show car park address as a hover tooltip on each pin
- [x] Hyperlink car park pins to the operator's website

---

## Phase 1: Backend — Weather (`/api/melbourne/weather`)

- [x] Identify BOM daily forecast API endpoint for Melbourne CBD (geohash `r1r0fup`)
- [x] Implement `getWeather()` in `melbourne.service.ts` returning current temp, description, rain chance, min/max, and tomorrow's forecast
- [x] Fix `tempMin` field extraction (`today?.temp_min`, not `today?.now?.temp_later`)
- [x] Wrap with in-process cache: 10-minute TTL via `cached('weather', 600_000, ...)`
- [x] Add `GET /api/melbourne/weather` route and `handleGetWeather` controller action
- [x] Add `AbortSignal.timeout(15_000)` on BOM fetch

## Phase 2: Backend — News Headlines (`/api/melbourne/news`)

- [x] Implement `getNewsHeadlines()` fetching Google News RSS for "Melbourne parking"
- [x] Parse RSS XML with regex to extract `<title>` and `<link>` / `<guid>` fields
- [x] Strip feed-level title (remove ` - Google News` suffix pattern)
- [x] Add `isHttpUrl()` validator to reject `javascript:` and other non-HTTP URLs
- [x] Wrap with 30-minute cache
- [x] Add `GET /api/melbourne/news` route

## Phase 3: Backend — Car Parks (`/api/melbourne/carparks`)

- [x] Implement `_fetchCarParks()` querying Overpass API for `amenity=parking` nodes/ways tagged with Wilson, First, or Nationwide operator names within Melbourne CBD bounding box
- [x] Classify each result to a `brand` ('wilson' | 'first' | 'nationwide') from name/operator tags
- [x] Deduplicate by lat/lon key (5 decimal places) to prevent duplicate pins from overlapping nodes and ways
- [x] Extract `address` from OSM `addr:housenumber`, `addr:street`, `addr:suburb` tags
- [x] Extract `website` from OSM `website`/`url`/`contact:website` tags; fall back to brand root URL (wilsonparking.com.au, firstparking.com.au, nationwideparking.com.au)
- [x] Validate extracted URLs with `isHttpUrl()` before using
- [x] Wrap with 30-minute cache
- [x] Add `GET /api/melbourne/carparks` route

## Phase 4: Frontend — Weather Strip

- [x] Add `WeatherData` interface in `MelbourneParkingMap.tsx`
- [x] Fetch `/melbourne/weather` on mount; refresh every 10 minutes
- [x] Render weather strip above stat bar: dark purple gradient background (`#1A0020 → #3b0048`), temp, description, min/max, rain chance, tomorrow's summary
- [x] Use vertical dividers between sections for readability
- [x] Conditionally hide strip when no weather data available

## Phase 5: Frontend — News Ticker

- [x] Add `NewsHeadline` interface; fetch `/melbourne/news` on mount, refresh every 30 minutes
- [x] Inject `@keyframes ticker-scroll` CSS via `<style>` tag; duration proportional to item count (`Math.max(30, news.length * 6)` seconds)
- [x] Duplicate items array (`[...news, ...news]`) for seamless infinite loop
- [x] Render items as `<a>` tags opening in new tab with `rel="noopener noreferrer"`
- [x] Add `PARKING NEWS` label badge (purple) at left edge
- [x] Pause animation on hover (`:hover { animation-play-state: paused }`)

## Phase 6: Frontend — Car Park Pins

- [x] Add `CarPark` interface (id, name, operator, lat, lon, brand, capacity, access, address, website)
- [x] Define `CARPARK_COLOURS` (Wilson red `#dc2626`, First orange `#ea580c`, Nationwide cyan `#0891b2`)
- [x] Implement `carParkIcon(brand)` factory returning `L.divIcon` teardrop pin with brand initial letter
- [x] Fetch `/melbourne/carparks` once on mount (locations are static)
- [x] Render `<Marker>` per car park with `title={cp.address ?? cp.name}` for native hover tooltip
- [x] Popup shows brand name as hyperlink to operator website (opens new tab), address, capacity, and hours
- [x] Add `🅿 Car Parks` toggle button in stat bar (red border, fills red when active)
- [x] Add car park legend entries (teardrop icon + label) in map legend overlay when toggle is on

## Phase 7: Integration Testing

- [x] Confirm weather strip renders with live BOM data
- [x] Confirm news ticker scrolls and headlines link to real articles
- [x] Confirm car park pins appear on map at correct Melbourne CBD locations
- [x] Confirm hovering a pin shows address tooltip
- [x] Confirm clicking pin opens popup with working website hyperlink
- [x] Confirm toggle button shows/hides all car park pins and legend entries
