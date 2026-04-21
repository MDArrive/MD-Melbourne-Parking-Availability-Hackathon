import React from 'react';
import { Card, Badge, Spinner } from 'react-bootstrap';

// ── Brand colours ─────────────────────────────────────────────
const C = {
  purple:  '#5F016F',
  red:     '#ef4444',
  amber:   '#f59e0b',
  green:   '#22c55e',
  surface: '#ffffff',
  surfaceAlt: '#faf7fa',
  border:  '#e5e7eb',
  textPrimary: '#1f2937',
  textMuted:   '#6b7280',
} as const;

// ── Types ─────────────────────────────────────────────────────
export interface PriorityZone {
  zoneNumber: number;
  totalBays: number;
  occupiedBays: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
  score: number;
  averageDurationMinutes: number | null;
}

export interface PriorityZonePanelProps {
  zones: PriorityZone[];
  loading: boolean;
}

// ── Priority helpers ──────────────────────────────────────────
const getPriority = (score: number): { label: string; colour: string } => {
  if (score > 10) return { label: 'HIGH',   colour: C.red   };
  if (score >= 4) return { label: 'MEDIUM', colour: C.amber };
  return               { label: 'LOW',    colour: C.green  };
};

// ── Zone card ─────────────────────────────────────────────────
const ZoneCard = ({ zone }: { zone: PriorityZone }) => {
  const priority = getPriority(zone.score);
  const total    = zone.totalBays;

  // Bar chart segment widths as percentages of total bays
  const redPct   = total > 0 ? (zone.redCount   / total) * 100 : 0;
  const amberPct = total > 0 ? (zone.amberCount / total) * 100 : 0;
  const greenPct = total > 0 ? (zone.greenCount / total) * 100 : 0;

  // Red dot overstay indicators (max 5, then "+N more")
  const maxDots      = 5;
  const extraDots    = Math.max(0, zone.redCount - maxDots);
  const dotsToRender = Math.min(zone.redCount, maxDots);

  return (
    <div
      style={{
        background:   C.surface,
        border:       `1px solid ${C.border}`,
        borderLeft:   `4px solid ${priority.colour}`,
        borderRadius: 8,
        padding:      '10px 12px',
        marginBottom: 8,
      }}
    >
      {/* Header row: zone number + priority badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.textPrimary }}>
          Zone {zone.zoneNumber}
        </span>
        <span
          style={{
            background:   priority.colour,
            color:        '#fff',
            fontSize:     '0.65rem',
            fontWeight:   700,
            letterSpacing:'0.06em',
            padding:      '2px 7px',
            borderRadius: 10,
          }}
        >
          {priority.label}
        </span>
      </div>

      {/* Segmented bar chart */}
      <div
        style={{
          display:      'flex',
          height:       6,
          borderRadius: 3,
          overflow:     'hidden',
          background:   '#f3f4f6',
          marginBottom: 6,
          gap:          1,
        }}
      >
        {redPct   > 0 && <div style={{ width: `${redPct}%`,   background: C.red,   borderRadius: 2 }} />}
        {amberPct > 0 && <div style={{ width: `${amberPct}%`, background: C.amber, borderRadius: 2 }} />}
        {greenPct > 0 && <div style={{ width: `${greenPct}%`, background: C.green, borderRadius: 2 }} />}
      </div>

      {/* Bay stat row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: '0.75rem', color: C.textMuted }}>
            {zone.occupiedBays} / {zone.totalBays} bays occupied
          </span>
          {zone.averageDurationMinutes !== null && (
            <span style={{ fontSize: '0.72rem', color: C.textMuted }}>
              Avg stay: <strong style={{ color: C.textPrimary }}>{zone.averageDurationMinutes} min</strong>
            </span>
          )}
        </div>

        {/* Overstay dots */}
        {zone.redCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {Array.from({ length: dotsToRender }).map((_, i) => (
              <span
                key={i}
                title="Bay occupied > 60 min"
                style={{
                  display:      'inline-block',
                  width:        8,
                  height:       8,
                  borderRadius: '50%',
                  background:   C.red,
                  flexShrink:   0,
                }}
              />
            ))}
            {extraDots > 0 && (
              <span style={{ fontSize: '0.65rem', color: C.red, fontWeight: 700, marginLeft: 1 }}>
                +{extraDots} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Panel ─────────────────────────────────────────────────────
const PriorityZonePanel: React.FC<PriorityZonePanelProps> = ({ zones, loading }) => {
  const highPriorityCount = zones.filter(z => z.score > 5).length;

  return (
    <Card
      style={{
        border:       `1px solid ${C.border}`,
        borderRadius: 10,
        boxShadow:    '0 1px 6px rgba(0,0,0,0.07)',
        overflow:     'hidden',
        height:       '100%',
        display:      'flex',
        flexDirection:'column',
      }}
    >
      {/* Header */}
      <Card.Header
        style={{
          background:  C.purple,
          color:       '#fff',
          padding:     '10px 14px',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          borderBottom: 'none',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.01em' }}>
          Officer Priority Zones
        </span>
        {highPriorityCount > 0 && (
          <Badge
            style={{
              background:   C.red,
              fontSize:     '0.7rem',
              fontWeight:   700,
              padding:      '3px 8px',
              borderRadius: 10,
            }}
          >
            {highPriorityCount} high
          </Badge>
        )}
      </Card.Header>

      {/* Zone list */}
      <Card.Body
        style={{
          padding:   '10px 12px',
          flex:      1,
          overflowY: 'auto',
          background: C.surfaceAlt,
          minHeight: 0,
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Spinner animation="border" size="sm" style={{ color: C.purple }} />
            <div style={{ color: C.textMuted, fontSize: '0.78rem', marginTop: 8 }}>Loading zones…</div>
          </div>
        )}

        {!loading && zones.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: C.textMuted, fontSize: '0.82rem' }}>
            No zone data available.
          </div>
        )}

        {!loading && zones.map(zone => (
          <ZoneCard key={zone.zoneNumber} zone={zone} />
        ))}
      </Card.Body>

      {/* Footer */}
      <Card.Footer
        style={{
          background:  C.surface,
          borderTop:   `1px solid ${C.border}`,
          padding:     '6px 12px',
          textAlign:   'center',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: C.textMuted }}>
          Auto-updates every 30s
        </span>
      </Card.Footer>
    </Card>
  );
};

export default PriorityZonePanel;
