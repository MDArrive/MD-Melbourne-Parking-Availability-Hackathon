import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Spinner, Button } from 'react-bootstrap';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchApi } from '../../utils/apiClient';
import PriorityZonePanel, { PriorityZone } from '../../components/melbourne/PriorityZonePanel';

// ── Palette ───────────────────────────────────────────────────
const PURPLE = '#5F016F';
const GREEN  = '#22c55e';
const AMBER  = '#f59e0b';
const RED    = '#ef4444';

// ── Types ─────────────────────────────────────────────────────
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
  if (sensor.durationMinutes < 4)   return GREEN;
  if (sensor.durationMinutes <= 12) return AMBER;
  return RED;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Free';
  return `${minutes} min`;
}

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

  const toDatetimeLocal = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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

  // ── Stat counts ───────────────────────────────────────────
  const total    = sensors.length;
  const occupied = sensors.filter(s => s.status === 'Present').length;
  const green    = sensors.filter(s => sensorColour(s) === GREEN).length;
  const amber    = sensors.filter(s => sensorColour(s) === AMBER).length;
  const red      = sensors.filter(s => sensorColour(s) === RED).length;

  return (
    <React.Fragment>
      <Helmet title="Melbourne Parking" />

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
            {snapshots.slice(0, 8).map(snap => (
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
                {new Date(snap.capturedAt).toLocaleTimeString()}
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
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

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
              {sensors.filter(s => visibleColours.has(sensorColour(s))).map(sensor => (
                <CircleMarker
                  key={sensor.id}
                  center={[sensor.lat, sensor.lon]}
                  radius={6}
                  pathOptions={{
                    color: sensorColour(sensor),
                    fillColor: sensorColour(sensor),
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
              <LegendRow color={GREEN} label="Free / &lt; 4 min" />
              <LegendRow color={AMBER} label="4 – 12 min" />
              <LegendRow color={RED}   label="&gt; 12 min" />
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
          <PriorityZonePanel zones={priorityZones} loading={loading} />
        </div>

      </div>
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
    <span style={{ color: '#374151' }} dangerouslySetInnerHTML={{ __html: label }} />
  </div>
);

export default MelbourneParkingMap;
