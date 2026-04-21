import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Spinner, Button } from 'react-bootstrap';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchApi } from '../../utils/apiClient';
import PriorityZonePanel, { PriorityZone } from '../../components/melbourne/PriorityZonePanel';

// ── Palette ───────────────────────────────────────────────────
const PURPLE = '#5F016F';
const GREEN  = '#22c55e';
const AMBER  = '#f59e0b';
const RED    = '#ef4444';

// ── Types ─────────────────────────────────────────────────────
interface CarPark {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lon: number;
  brand: 'wilson' | 'first' | 'nationwide';
  capacity: number | null;
  access: string | null;
  address: string | null;
  website: string | null;
}

const CARPARK_COLOURS: Record<CarPark['brand'], string> = {
  wilson:     '#dc2626',
  first:      '#ea580c',
  nationwide: '#0891b2',
};

const CARPARK_LABELS: Record<CarPark['brand'], string> = {
  wilson:     'Wilson',
  first:      'First',
  nationwide: 'Nationwide',
};

function carParkIcon(brand: CarPark['brand']) {
  const color = CARPARK_COLOURS[brand];
  const letter = brand === 'wilson' ? 'W' : brand === 'first' ? 'F' : 'N';
  return L.divIcon({
    html: `<div style="width:26px;height:26px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:11px;line-height:1;">${letter}</span></div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -30],
  });
}

interface NewsHeadline {
  title: string;
  url: string;
}

interface WeatherData {
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

interface SnapshotMeta {
  id: string;
  capturedAt: string;
  sensorCount: number;
}

interface Sensor {
  id: string;
  kerbsideId: number;
  zoneNumber: number;
  lat: number;
  lon: number;
  status: string;
  occupancySince: string | null;
  lastUpdated: string;
  durationMinutes: number | null;
}

// ── Colour helper ─────────────────────────────────────────────
function sensorColour(sensor: Sensor): string {
  if (sensor.status !== 'Present' || sensor.durationMinutes === null) return GREEN;
  if (sensor.durationMinutes <= 60)  return GREEN;
  if (sensor.durationMinutes <= 120) return AMBER;
  return RED;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Free';
  return `${minutes} min`;
}

// Defined outside component — no dependency on state, no re-creation on render
const toDatetimeLocal = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── Map fly-to controller (must be inside MapContainer) ───────
const MapFlyTo = ({ zoneNumber, sensors }: { zoneNumber: number | null; sensors: Array<Sensor & { colour: string }> }) => {
  const map = useMap();
  useEffect(() => {
    if (zoneNumber === null) return;
    const pts = sensors.filter(s => s.zoneNumber === zoneNumber);
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts.map(s => [s.lat, s.lon] as [number, number]));
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 17, duration: 0.8 });
  }, [zoneNumber, map, sensors]);
  return null;
};

// ── Main component ────────────────────────────────────────────
const MelbourneParkingMap: React.FC = () => {
  const [sensors,          setSensors]          = useState<Sensor[]>([]);
  const [priorityZones,    setPriorityZones]    = useState<PriorityZone[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [lastUpdated,      setLastUpdated]      = useState<Date | null>(null);
  const [panelWidth,       setPanelWidth]       = useState(320);
  const [visibleColours,   setVisibleColours]   = useState<Set<string>>(new Set([GREEN, AMBER, RED]));
  const [historyMode,      setHistoryMode]      = useState(false);
  const [snapshots,        setSnapshots]        = useState<SnapshotMeta[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotMeta | null>(null);
  const [pickerValue,      setPickerValue]      = useState('');
  const [weather,          setWeather]          = useState<WeatherData | null>(null);
  const [news,             setNews]             = useState<NewsHeadline[]>([]);
  const [carParks,         setCarParks]         = useState<CarPark[]>([]);
  const [showCarParks,     setShowCarParks]     = useState(true);
  const [selectedZone,     setSelectedZone]     = useState<number | null>(null);

  const findNearestSnapshot = (isoString: string, snaps: SnapshotMeta[]): SnapshotMeta | null => {
    if (!snaps.length || !isoString) return null;
    const target = new Date(isoString).getTime();
    return snaps.reduce((best, snap) => {
      const d = Math.abs(new Date(snap.capturedAt).getTime() - target);
      const bd = Math.abs(new Date(best.capturedAt).getTime() - target);
      return d < bd ? snap : best;
    });
  };

  const toggleColour = useCallback((colour: string) => {
    setVisibleColours(prev => {
      const next = new Set(prev);
      next.has(colour) ? next.delete(colour) : next.add(colour);
      return next;
    });
  }, []);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setPanelWidth(Math.max(220, Math.min(600, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const loadSensors = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [data, zones] = await Promise.all([
        fetchApi<Sensor[]>('/melbourne/sensors'),
        fetchApi<PriorityZone[]>('/melbourne/priority-zones'),
      ]);
      setSensors(data || []);
      setPriorityZones(zones || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sensor data');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load + 30-second auto-refresh (paused when in history mode)
  useEffect(() => {
    if (historyMode) return;
    loadSensors(true);
    const interval = setInterval(() => loadSensors(false), 30_000);
    return () => clearInterval(interval);
  }, [loadSensors, historyMode]);

  // Enter/exit history mode
  useEffect(() => {
    if (historyMode) {
      fetchApi<SnapshotMeta[]>('/melbourne/snapshots').then(data => {
        const snaps = data || [];
        setSnapshots(snaps);
        setPickerValue(toDatetimeLocal(new Date()));
        if (snaps.length) {
          const nearest = findNearestSnapshot(toDatetimeLocal(new Date()), snaps);
          setSelectedSnapshot(nearest);
        }
      });
    } else {
      setSnapshots([]);
      setSelectedSnapshot(null);
      loadSensors(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyMode]);

  // When picker changes, find nearest snapshot
  useEffect(() => {
    if (!historyMode || !pickerValue) return;
    const nearest = findNearestSnapshot(pickerValue, snapshots);
    setSelectedSnapshot(nearest);
  }, [pickerValue, snapshots, historyMode]);

  // When selected snapshot changes, load its sensors
  useEffect(() => {
    if (!selectedSnapshot) return;
    setLoading(true);
    fetchApi<Sensor[]>(`/melbourne/snapshots/${selectedSnapshot.id}/sensors`)
      .then(data => setSensors(data || []))
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [selectedSnapshot]);

  // Weather — load once then every 10 minutes
  useEffect(() => {
    const load = () => fetchApi<WeatherData>('/melbourne/weather').then(d => setWeather(d ?? null)).catch(() => {});
    load();
    const id = setInterval(load, 600_000);
    return () => clearInterval(id);
  }, []);

  // Car parks — load once (operator locations don't change often)
  useEffect(() => {
    fetchApi<CarPark[]>('/melbourne/carparks').then(d => setCarParks(d || [])).catch(() => {});
  }, []);

  // News headlines — load once then every 30 minutes
  useEffect(() => {
    const load = () => fetchApi<NewsHeadline[]>('/melbourne/news').then(d => setNews(d || [])).catch(() => {});
    load();
    const id = setInterval(load, 1_800_000);
    return () => clearInterval(id);
  }, []);

  const handleRefreshNow = async () => {
    setRefreshing(true);
    try {
      await fetchApi('/melbourne/refresh', { method: 'POST' });
      await loadSensors(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Pre-compute colours once per sensors change ───────────
  const colouredSensors = useMemo(
    () => sensors.map(s => ({ ...s, colour: sensorColour(s) })),
    [sensors],
  );

  const total    = colouredSensors.length;
  const occupied = colouredSensors.filter(s => s.status === 'Present').length;
  const green    = colouredSensors.filter(s => s.colour === GREEN).length;
  const amber    = colouredSensors.filter(s => s.colour === AMBER).length;
  const red      = colouredSensors.filter(s => s.colour === RED).length;

  return (
    <React.Fragment>
      <Helmet title="Melbourne Parking" />
      {/* Escape content padding (2.5rem / 2.5rem / 1.5rem) and fill viewport below navbar (3.5rem) */}
      <div style={{
        margin: '-2.5rem -2.5rem -1.5rem',
        height: 'calc(100vh - 3.5rem)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

      {/* ── Weather strip ── */}
      {weather && (
        <div style={{
          background: 'linear-gradient(90deg, #1A0020 0%, #3b0048 100%)',
          color: '#e9d5f5',
          padding: '5px 20px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 700, color: '#d8b4fe', letterSpacing: '0.03em' }}>
            Melbourne Weather
          </span>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
          {weather.current.temp !== null && (
            <span>{weather.current.temp}°C</span>
          )}
          <span>{weather.current.description}</span>
          {(weather.current.tempMax !== null || weather.current.tempMin !== null) && (
            <span style={{ color: '#c4b5fd' }}>
              {weather.current.tempMin !== null ? `${weather.current.tempMin}°` : ''}
              {weather.current.tempMin !== null && weather.current.tempMax !== null ? ' / ' : ''}
              {weather.current.tempMax !== null ? `${weather.current.tempMax}°` : ''}
            </span>
          )}
          <span style={{ color: '#93c5fd' }}>☔ {weather.current.rainChance}% chance of rain</span>
          {weather.tomorrow && (
            <>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: '#a5b4fc' }}>
                Tomorrow: {weather.tomorrow.description}
                {weather.tomorrow.tempMax !== null ? ` ${weather.tomorrow.tempMax}°` : ''}
                {' '}· ☔ {weather.tomorrow.rainChance}%
              </span>
            </>
          )}
        </div>
      )}

      {/* ── News ticker ── */}
      {news.length > 0 && (
        <>
          <style>{`
            @keyframes ticker-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .ticker-track { animation: ticker-scroll ${Math.max(30, news.length * 6)}s linear infinite; }
            .ticker-track:hover { animation-play-state: paused; }
            .ticker-link { color: #e2e8f0; text-decoration: none; white-space: nowrap; }
            .ticker-link:hover { color: #d8b4fe; text-decoration: underline; }
          `}</style>
          <div style={{
            background: '#0f0018',
            borderBottom: '1px solid #2d0038',
            padding: '0 0',
            height: 28,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}>
            <div style={{
              flexShrink: 0,
              background: '#5F016F',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0 12px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              zIndex: 1,
            }}>
              PARKING NEWS
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                {[...news, ...news].map((item, i) => (
                  <React.Fragment key={i}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticker-link"
                      style={{ fontSize: '0.72rem', padding: '0 6px' }}
                    >
                      {item.title}
                    </a>
                    <span style={{ color: '#5F016F', fontSize: '0.8rem', padding: '0 4px', userSelect: 'none' }}>◆</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Stat bar ── */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e0ea',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: PURPLE, marginRight: 8 }}>
          Melbourne Parking
        </span>
        <div style={{ width: 1, height: 20, background: '#ddd' }} />
        <StatPill label="Total"    value={total}    bg="#f3f4f6" color="#374151" />
        <StatPill label="Occupied" value={occupied} bg="#fef3c7" color="#92400e" />
        <StatPill label="Green"    value={green}    bg="#dcfce7" color="#15803d" dot={GREEN} active={visibleColours.has(GREEN)} onToggle={() => toggleColour(GREEN)} />
        <StatPill label="Amber"    value={amber}    bg="#fef9c3" color="#854d0e" dot={AMBER} active={visibleColours.has(AMBER)} onToggle={() => toggleColour(AMBER)} />
        <StatPill label="Red"      value={red}      bg="#fee2e2" color="#991b1b" dot={RED}   active={visibleColours.has(RED)}   onToggle={() => toggleColour(RED)} />
        <div style={{ flex: 1 }} />
        <Button
          size="sm"
          disabled={refreshing}
          onClick={handleRefreshNow}
          style={{ background: PURPLE, border: 'none', fontWeight: 600, fontSize: '0.78rem', padding: '5px 14px', borderRadius: 6 }}
        >
          {refreshing ? (
            <><Spinner animation="border" size="sm" className="me-1" />Refreshing…</>
          ) : (
            'Refresh Now'
          )}
        </Button>
        <button
          onClick={() => setShowCarParks(v => !v)}
          style={{
            background: showCarParks ? '#7f1d1d' : 'transparent',
            border: '1.5px solid #dc2626',
            color: showCarParks ? '#fff' : '#dc2626',
            borderRadius: 6, padding: '5px 14px',
            fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          🅿 Car Parks
        </button>
        <button
          onClick={() => setHistoryMode(h => !h)}
          style={{
            background: historyMode ? '#5F016F' : 'transparent',
            border: '1.5px solid #5F016F',
            color: historyMode ? '#fff' : '#5F016F',
            borderRadius: 6, padding: '5px 14px',
            fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          {historyMode ? '⏱ History ON' : '⏱ History'}
        </button>
      </div>

      {/* ── History bar ── */}
      {historyMode && (
        <div style={{
          background: '#faf5ff', borderBottom: '1px solid #ddd6fe',
          padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
        }}>
          <input
            type="datetime-local"
            value={pickerValue}
            onChange={e => setPickerValue(e.target.value)}
            style={{ border: '1.5px solid #c4b5fd', borderRadius: 6, padding: '4px 10px', fontSize: '0.82rem', color: '#374151' }}
          />

          {selectedSnapshot && (
            <span style={{ fontSize: '0.78rem', color: '#5F016F', fontWeight: 600 }}>
              Showing snapshot from {new Date(selectedSnapshot.capturedAt).toLocaleString()}
              {' '}({selectedSnapshot.sensorCount} sensors)
            </span>
          )}
          {!selectedSnapshot && snapshots.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>No snapshot near this time</span>
          )}
          {snapshots.length === 0 && (
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>No snapshots available yet — snapshots are taken every 5 minutes</span>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 8 }}>
            {snapshots.reduce<SnapshotMeta[]>((acc, snap) => {
              const last = acc[acc.length - 1];
              const diff = last ? Math.abs(new Date(snap.capturedAt).getTime() - new Date(last.capturedAt).getTime()) : Infinity;
              if (diff >= 5 * 60 * 1000) acc.push(snap);
              return acc;
            }, []).slice(0, 12).map(snap => (
              <button
                key={snap.id}
                onClick={() => { setSelectedSnapshot(snap); setPickerValue(toDatetimeLocal(new Date(snap.capturedAt))); }}
                style={{
                  background: selectedSnapshot?.id === snap.id ? '#5F016F' : '#ede9fe',
                  color: selectedSnapshot?.id === snap.id ? '#fff' : '#5F016F',
                  border: 'none', borderRadius: 14, padding: '3px 10px',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {new Date(snap.capturedAt).toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 20px', fontSize: '0.82rem', borderBottom: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── Resizable split: map + priority panel ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left pane — map */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f9fafb' }}>
              <Spinner animation="border" style={{ color: PURPLE, width: 40, height: 40 }} />
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading Melbourne sensors…</span>
            </div>
          ) : (
            <MapContainer
              center={[-37.8136, 144.9631]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFlyTo zoneNumber={selectedZone} sensors={colouredSensors} />
              {colouredSensors.filter(s => visibleColours.has(s.colour)).map(sensor => (
                <CircleMarker
                  key={sensor.id}
                  center={[sensor.lat, sensor.lon]}
                  radius={6}
                  pathOptions={{
                    color: sensor.colour,
                    fillColor: sensor.colour,
                    fillOpacity: 0.85,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '0.82rem', minWidth: 130 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, color: PURPLE }}>
                        Zone {sensor.zoneNumber}
                      </div>
                      <div style={{ color: '#374151', marginBottom: 2 }}>
                        <span style={{ color: '#6b7280' }}>Status: </span>
                        {sensor.status === 'Present' ? 'Occupied' : 'Free'}
                      </div>
                      <div style={{ color: '#374151' }}>
                        <span style={{ color: '#6b7280' }}>Duration: </span>
                        {formatDuration(sensor.durationMinutes)}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {showCarParks && carParks.map(cp => (
                <Marker
                  key={cp.id}
                  position={[cp.lat, cp.lon]}
                  icon={carParkIcon(cp.brand)}
                  title={cp.address ?? cp.name}
                >
                  <Popup>
                    <div style={{ fontSize: '0.82rem', minWidth: 160 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, color: CARPARK_COLOURS[cp.brand] }}>
                        {cp.website ? (
                          <a href={cp.website} target="_blank" rel="noopener noreferrer"
                            style={{ color: CARPARK_COLOURS[cp.brand], textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {CARPARK_LABELS[cp.brand]} Parking ↗
                          </a>
                        ) : (
                          `${CARPARK_LABELS[cp.brand]} Parking`
                        )}
                      </div>
                      <div style={{ color: '#374151', marginBottom: 2, fontWeight: 600 }}>{cp.name}</div>
                      {cp.address && (
                        <div style={{ color: '#6b7280', fontSize: '0.76rem', marginBottom: 2 }}>{cp.address}</div>
                      )}
                      {cp.capacity && (
                        <div style={{ color: '#6b7280', fontSize: '0.76rem' }}>Capacity: {cp.capacity} bays</div>
                      )}
                      {cp.access && (
                        <div style={{ color: '#6b7280', fontSize: '0.76rem' }}>Hours: {cp.access}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* History mode banner — top-centre of map */}
          {historyMode && selectedSnapshot && (
            <div style={{
              position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: '#5F016F', color: '#fff',
              borderRadius: 8, padding: '5px 16px', fontSize: '0.78rem', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
            }}>
              Historical view — {new Date(selectedSnapshot.capturedAt).toLocaleString()}
            </div>
          )}

          {/* Last updated overlay — top-right of map */}
          {!loading && lastUpdated && (
            <div
              style={{
                position: 'absolute', top: 10, right: 10, zIndex: 1000,
                background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb',
                borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem',
                color: '#6b7280', backdropFilter: 'blur(4px)', pointerEvents: 'none',
              }}
            >
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Legend overlay — bottom-left of map */}
          {!loading && (
            <div
              style={{
                position: 'absolute', bottom: 28, left: 10, zIndex: 1000,
                background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem',
                backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', gap: 5,
              }}
            >
              <LegendRow color={GREEN} label="Free / 0 – 60 min" />
              <LegendRow color={AMBER} label="61 – 120 min" />
              <LegendRow color={RED}   label="> 120 min" />
              {showCarParks && carParks.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />
                  <LegendPin color={CARPARK_COLOURS.wilson}     label="Wilson Parking" />
                  <LegendPin color={CARPARK_COLOURS.first}      label="First Parking" />
                  <LegendPin color={CARPARK_COLOURS.nationwide} label="Nationwide Parking" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          style={{
            width: 6,
            cursor: 'col-resize',
            background: '#e8e0ea',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#5F016F')}
          onMouseLeave={e => (e.currentTarget.style.background = '#e8e0ea')}
        />

        {/* Right pane — priority panel (scrollable) */}
        <div
          style={{
            width: panelWidth,
            flexShrink: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            background: '#faf7fa',
          }}
        >
          <PriorityZonePanel zones={priorityZones} loading={loading} onSelect={setSelectedZone} />
        </div>

      </div>

      </div>{/* end full-height wrapper */}
    </React.Fragment>
  );
};

// ── Small helpers ─────────────────────────────────────────────
const StatPill = ({
  label, value, bg, color, dot, active, onToggle,
}: {
  label: string; value: number; bg: string; color: string;
  dot?: string; active?: boolean; onToggle?: () => void;
}) => (
  <div
    onClick={onToggle}
    role={onToggle ? 'button' : undefined}
    tabIndex={onToggle ? 0 : undefined}
    onKeyDown={onToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } : undefined}
    aria-pressed={onToggle ? active : undefined}
    title={onToggle ? (active ? `Hide ${label}` : `Show ${label}`) : undefined}
    style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: active === false ? '#f3f4f6' : bg,
      borderRadius: 20, padding: '3px 10px',
      fontSize: '0.75rem',
      color: active === false ? '#9ca3af' : color,
      fontWeight: 600,
      cursor: onToggle ? 'pointer' : 'default',
      opacity: active === false ? 0.6 : 1,
      transition: 'opacity 0.15s, background 0.15s',
      userSelect: 'none',
      outline: active === false ? '2px dashed #d1d5db' : 'none',
    }}
  >
    {dot && (
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: active === false ? '#9ca3af' : dot, flexShrink: 0 }} />
    )}
    {label}: {value}
  </div>
);

const LegendRow = ({ color, label }: { color: string; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ color: '#374151' }}>{label}</span>
  </div>
);

const LegendPin = ({ color, label }: { color: string; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <span style={{
      display: 'inline-block', width: 12, height: 12, flexShrink: 0,
      background: color, border: '2px solid #fff',
      borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
    <span style={{ color: '#374151' }}>{label}</span>
  </div>
);

export default MelbourneParkingMap;
