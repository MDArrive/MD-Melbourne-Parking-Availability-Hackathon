import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert } from 'react-bootstrap';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { fetchApi } from '../../utils/apiClient';

// ── Palette ───────────────────────────────────────────────────
const PURPLE = '#5F016F';
const GREEN  = '#22c55e';
const AMBER  = '#f59e0b';
const RED    = '#ef4444';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// ── Types ─────────────────────────────────────────────────────
interface OccupancyPoint {
  capturedAt: string;
  totalSensors: number;
  occupiedCount: number;
  occupancyPercent: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
}

interface ZoneSummary {
  zoneNumber: number;
  totalBays: number;
  occupiedBays: number;
  occupancyPercent: number;
  avgDurationMinutes: number | null;
  redCount: number;
  amberCount: number;
  greenCount: number;
}

type HoursRange = 1 | 6 | 24;

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: string;
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e8e0ea',
      overflow: 'hidden',
      height: '100%',
      boxShadow: '0 1px 4px rgba(95,1,111,0.06)',
    }}
  >
    <div style={{ height: 4, background: accent }} />
    <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
      <div
        style={{
          color: '#7a5977',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: PURPLE, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ color: '#7a5977', fontSize: '0.75rem', marginTop: 4 }}>{sub}</div>
    </div>
  </div>
);

// ── Occupancy Progress Bar ────────────────────────────────────
const OccupancyBar = ({ pct }: { pct: number }) => {
  const colour = pct >= 80 ? RED : pct >= 50 ? AMBER : GREEN;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: '#f3f4f6',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            background: colour,
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: colour, minWidth: 38 }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
};

// ── CSV download helper ───────────────────────────────────────
const downloadCsv = (path: string) => {
  const a = document.createElement('a');
  a.href = `${API_BASE}${path}`;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ── Main component ────────────────────────────────────────────
const MelbourneReporting: React.FC = () => {
  const [hours, setHours]             = useState<HoursRange>(24);
  const [occupancy, setOccupancy]     = useState<OccupancyPoint[]>([]);
  const [zones, setZones]             = useState<ZoneSummary[]>([]);
  const [loadingOcc, setLoadingOcc]   = useState(true);
  const [loadingZone, setLoadingZone] = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Fetch occupancy over time ──────────────────────────────
  const fetchOccupancy = useCallback(async (h: HoursRange, showSpinner = true) => {
    if (showSpinner) setLoadingOcc(true);
    try {
      const data = await fetchApi<OccupancyPoint[]>(`/melbourne/reports/occupancy-over-time?hours=${h}`);
      setOccupancy(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load occupancy data');
    } finally {
      setLoadingOcc(false);
    }
  }, []);

  // ── Fetch zone summary ─────────────────────────────────────
  const fetchZones = useCallback(async () => {
    setLoadingZone(true);
    try {
      const data = await fetchApi<ZoneSummary[]>('/melbourne/reports/zone-summary');
      setZones(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load zone data');
    } finally {
      setLoadingZone(false);
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    fetchOccupancy(hours);
    fetchZones();
  }, [fetchOccupancy, fetchZones, hours]);

  // ── Auto-refresh occupancy every 60 s ─────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOccupancy(hours, false);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchOccupancy, hours]);

  // ── Derived stats from most recent point ──────────────────
  const latest = occupancy.length ? occupancy[occupancy.length - 1] : null;

  const totalSensors   = latest?.totalSensors   ?? 0;
  const occupiedCount  = latest?.occupiedCount  ?? 0;
  const occupancyPct   = latest?.occupancyPercent ?? 0;
  const greenCount     = latest?.greenCount     ?? 0;
  const amberCount     = latest?.amberCount     ?? 0;
  const redCount       = latest?.redCount       ?? 0;

  // ── Area chart: occupancy over time ───────────────────────
  const timestamps = occupancy.map(d => new Date(d.capturedAt).getTime());

  const areaOptions: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      animations: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.02,
        stops: [0, 95],
      },
    },
    colors: [PURPLE, GREEN, AMBER, RED],
    xaxis: {
      type: 'datetime',
      categories: timestamps,
      labels: {
        style: { fontSize: '11px', colors: '#7a5977' },
        datetimeUTC: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: (v: number) => `${v.toFixed(0)}%`,
        style: { fontSize: '11px', colors: ['#7a5977'] },
      },
    },
    grid: {
      borderColor: '#ede0eb',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'dd MMM HH:mm' },
      y: { formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
    },
    markers: { size: 0 },
  };

  const areaSeries = [
    {
      name: 'Occupied %',
      data: occupancy.map(d => parseFloat(d.occupancyPercent.toFixed(1))),
    },
  ];

  // ── Stacked bar: green / amber / red counts ───────────────
  const stackedOptions: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      animations: { enabled: false },
    },
    dataLabels: { enabled: false },
    colors: [GREEN, AMBER, RED],
    xaxis: {
      type: 'datetime',
      categories: timestamps,
      labels: {
        style: { fontSize: '11px', colors: '#7a5977' },
        datetimeUTC: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: ['#7a5977'] },
      },
    },
    grid: {
      borderColor: '#ede0eb',
      strokeDashArray: 4,
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'dd MMM HH:mm' },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
    },
    plotOptions: {
      bar: { columnWidth: '80%' },
    },
  };

  const stackedSeries = [
    { name: 'Free / <4 min',  data: occupancy.map(d => d.greenCount) },
    { name: '4–12 min',       data: occupancy.map(d => d.amberCount) },
    { name: '>12 min',        data: occupancy.map(d => d.redCount)   },
  ];

  // ── Donut chart: current status ───────────────────────────
  const donutOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'inherit',
    },
    labels: ['Free / <4 min', '4–12 min', '>12 min'],
    colors: [GREEN, AMBER, RED],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    legend: {
      position: 'bottom',
      fontSize: '13px',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => String(totalSensors),
              color: PURPLE,
              fontSize: '1rem',
              fontWeight: 700,
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (v: number) => `${v} bays` },
    },
  };

  const donutSeries = [greenCount, amberCount, redCount];

  // ── Range button styles ────────────────────────────────────
  const rangeBtn = (h: HoursRange) => ({
    background: hours === h ? PURPLE : 'transparent',
    border: `1.5px solid ${PURPLE}`,
    color: hours === h ? '#fff' : PURPLE,
    borderRadius: 6,
    padding: '4px 14px',
    fontWeight: 600,
    fontSize: '0.78rem',
    cursor: 'pointer',
    marginRight: 6,
  } as React.CSSProperties);

  const handleHoursChange = (h: HoursRange) => {
    setHours(h);
  };

  return (
    <React.Fragment>
      <Helmet title="Parking Reports" />
      <Container fluid className="p-4">

        {/* ── Page header ─────────────────────────────────── */}
        <div
          className="d-flex align-items-center justify-content-between flex-wrap mb-4"
          style={{ gap: 12 }}
        >
          <div>
            <h1 className="h3 mb-0" style={{ color: PURPLE, fontWeight: 800 }}>
              Parking Reports
            </h1>
            <div style={{ color: '#7a5977', fontSize: '0.82rem', marginTop: 2 }}>
              Melbourne CBD sensor data — auto-refreshes every 60 s
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              onClick={() => downloadCsv('/melbourne/reports/sensors/csv')}
              style={{ background: PURPLE, border: 'none', fontWeight: 600 }}
            >
              Download Current CSV
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => downloadCsv(`/melbourne/reports/history/csv?hours=${hours}`)}
              style={{ fontWeight: 600 }}
            >
              Download History CSV ({hours}h)
            </Button>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────── */}
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* ── Stat summary bar ────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col xs={6} md={3}>
            <StatCard
              accent={PURPLE}
              label="Total Sensors"
              value={totalSensors.toLocaleString()}
              sub="active bays"
            />
          </Col>
          <Col xs={6} md={3}>
            <StatCard
              accent={RED}
              label="Occupied"
              value={occupiedCount.toLocaleString()}
              sub={`${occupancyPct.toFixed(1)}% occupancy`}
            />
          </Col>
          <Col xs={6} md={3}>
            <StatCard
              accent={GREEN}
              label="Free"
              value={greenCount.toLocaleString()}
              sub="< 4 min"
            />
          </Col>
          <Col xs={6} md={3}>
            <StatCard
              accent={AMBER}
              label="Near Limit"
              value={amberCount.toLocaleString()}
              sub={`${redCount} over limit`}
            />
          </Col>
        </Row>

        {/* ── Charts row ──────────────────────────────────── */}
        <Row className="g-3 mb-4">

          {/* Section 1: Occupancy over time */}
          <Col lg={8}>
            <Card style={{ height: '100%' }}>
              <Card.Header className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 8 }}>
                <div>
                  <Card.Title className="mb-0" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    Occupancy Over Time
                  </Card.Title>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Occupancy % — last {hours}h
                  </div>
                </div>
                <div>
                  {([1, 6, 24] as HoursRange[]).map(h => (
                    <button key={h} style={rangeBtn(h)} onClick={() => handleHoursChange(h)}>
                      {h}h
                    </button>
                  ))}
                </div>
              </Card.Header>
              <Card.Body>
                {loadingOcc ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: PURPLE }} />
                  </div>
                ) : occupancy.length === 0 ? (
                  <div className="text-center py-5 text-muted">No data available for this range.</div>
                ) : (
                  <>
                    <ReactApexChart
                      options={areaOptions}
                      series={areaSeries}
                      type="area"
                      height={200}
                    />
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#7a5977',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          marginBottom: 4,
                        }}
                      >
                        Bay Status Breakdown
                      </div>
                      <ReactApexChart
                        options={stackedOptions}
                        series={stackedSeries}
                        type="bar"
                        height={160}
                      />
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Section 2: Donut — current status */}
          <Col lg={4}>
            <Card style={{ height: '100%' }}>
              <Card.Header>
                <Card.Title className="mb-0" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  Current Status
                </Card.Title>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                  Most recent snapshot
                </div>
              </Card.Header>
              <Card.Body className="d-flex align-items-center justify-content-center">
                {loadingOcc ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: PURPLE }} />
                  </div>
                ) : !latest ? (
                  <div className="text-center text-muted">No data</div>
                ) : (
                  <ReactApexChart
                    options={donutOptions}
                    series={donutSeries}
                    type="donut"
                    height={300}
                    width="100%"
                  />
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Zone Summary Table ───────────────────────────── */}
        <Card>
          <Card.Header>
            <Card.Title className="mb-0" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Zone Summary
            </Card.Title>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
              All zones sorted by occupancy — {zones.length} zones
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loadingZone ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: PURPLE }} />
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-4 text-muted">No zone data available.</div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <Table hover responsive className="mb-0" style={{ fontSize: '0.82rem' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                      zIndex: 1,
                      borderBottom: '2px solid #e8e0ea',
                    }}
                  >
                    <tr>
                      <th style={{ color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap' }}>Zone</th>
                      <th style={{ color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap' }}>Total Bays</th>
                      <th style={{ color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap' }}>Occupied</th>
                      <th style={{ color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 160 }}>Occupancy %</th>
                      <th style={{ color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap' }}>Avg Stay</th>
                      <th style={{ color: RED,    fontWeight: 700, whiteSpace: 'nowrap' }}>Red</th>
                      <th style={{ color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>Amber</th>
                      <th style={{ color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap' }}>Green</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map(zone => (
                      <tr key={zone.zoneNumber}>
                        <td style={{ fontWeight: 700, color: PURPLE }}>{zone.zoneNumber}</td>
                        <td>{zone.totalBays}</td>
                        <td>{zone.occupiedBays}</td>
                        <td>
                          <OccupancyBar pct={zone.occupancyPercent} />
                        </td>
                        <td>
                          {zone.avgDurationMinutes !== null
                            ? `${zone.avgDurationMinutes.toFixed(0)} min`
                            : '—'}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#fee2e2',
                              color: '#991b1b',
                              borderRadius: 10,
                              padding: '2px 8px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {zone.redCount}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#fef3c7',
                              color: '#92400e',
                              borderRadius: 10,
                              padding: '2px 8px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {zone.amberCount}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#dcfce7',
                              color: '#15803d',
                              borderRadius: 10,
                              padding: '2px 8px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {zone.greenCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

      </Container>
    </React.Fragment>
  );
};

export default MelbourneReporting;
