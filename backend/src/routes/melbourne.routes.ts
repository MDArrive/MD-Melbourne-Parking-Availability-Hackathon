import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  handleGetSensors,
  handleGetPriorityZones,
  handleRefresh,
  handleListSnapshots,
  handleGetSnapshot,
  handleCaptureSnapshot,
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

export default router;
