import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  handleGetSensors,
  handleGetPriorityZones,
  handleRefresh,
  handleListSnapshots,
  handleGetSnapshot,
  handleCaptureSnapshot,
  handleOccupancyOverTime,
  handleZoneSummary,
  handleSensorsCsv,
  handleHistoryCsv,
  handleGetWeather,
} from '../controllers/melbourne.controller';

const router = Router();

// GET /api/melbourne/sensors
router.get('/sensors', asyncHandler(handleGetSensors));

// GET /api/melbourne/priority-zones
router.get('/priority-zones', asyncHandler(handleGetPriorityZones));

// POST /api/melbourne/refresh
router.post('/refresh', asyncHandler(handleRefresh));

// GET /api/melbourne/snapshots
router.get('/snapshots', asyncHandler(handleListSnapshots));

// GET /api/melbourne/snapshots/:id/sensors
router.get('/snapshots/:id/sensors', asyncHandler(handleGetSnapshot));

// POST /api/melbourne/snapshots/capture
router.post('/snapshots/capture', asyncHandler(handleCaptureSnapshot));

// GET /api/melbourne/reports/occupancy-over-time?hours=24
router.get('/reports/occupancy-over-time', asyncHandler(handleOccupancyOverTime));

// GET /api/melbourne/reports/zone-summary
router.get('/reports/zone-summary', asyncHandler(handleZoneSummary));

// GET /api/melbourne/reports/sensors/csv
router.get('/reports/sensors/csv', asyncHandler(handleSensorsCsv));

// GET /api/melbourne/reports/history/csv?hours=24
router.get('/reports/history/csv', asyncHandler(handleHistoryCsv));

// GET /api/melbourne/weather
router.get('/weather', asyncHandler(handleGetWeather));

export default router;
