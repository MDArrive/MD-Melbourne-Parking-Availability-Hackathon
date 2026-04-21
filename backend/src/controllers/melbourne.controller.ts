import { Request, Response, NextFunction } from 'express';
import * as MelbourneService from '../services/melbourne.service';

export const handleGetSensors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.getSensorsWithDuration());
  } catch (err) { next(err); }
};

export const handleGetPriorityZones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.getPriorityZones());
  } catch (err) { next(err); }
};

export const handleRefresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const synced = await MelbourneService.fetchAndSync();
    res.json({ synced });
  } catch (err) { next(err); }
};

export const handleListSnapshots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.listSnapshots());
  } catch (err) { next(err); }
};

export const handleGetSnapshot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.getSnapshotSensors(req.params.id));
  } catch (err) { next(err); }
};

export const handleCaptureSnapshot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.captureSnapshot());
  } catch (err) { next(err); }
};

export const handleOccupancyOverTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = req.query.hours !== undefined ? Number(req.query.hours) : 24;
    res.json(await MelbourneService.getOccupancyOverTime(hours));
  } catch (err) { next(err); }
};

export const handleZoneSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await MelbourneService.getZoneSummary());
  } catch (err) { next(err); }
};

export const handleSensorsCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await MelbourneService.getSensorsAsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sensors.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};

export const handleHistoryCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = req.query.hours !== undefined ? Number(req.query.hours) : 24;
    const csv = await MelbourneService.getHistoryAsCsv(hours);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="history.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};
