import { Request, Response, NextFunction } from 'express';
import { dataService } from './data.service';

// ---------------- EXPORTS ----------------
export const requestExport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exportType = req.body.exportType || 'full';
    const exportRecord = await dataService.requestExport(req.user!.id, exportType);
    res.status(202).json({
      message: 'Data export request submitted successfully.',
      export: exportRecord,
    });
  } catch (err) {
    next(err);
  }
};

export const listExports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await dataService.listExports(req.user!.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getExportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exportRecord = await dataService.getExportById(req.user!.id, req.params.id as string);
    res.status(200).json({ export: exportRecord });
  } catch (err) {
    next(err);
  }
};

export const downloadExport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filePath, fileName } = await dataService.getExportFile(req.user!.id, req.params.id as string);
    res.download(filePath, fileName);
  } catch (err) {
    next(err);
  }
};

// ---------------- IMPORTS ----------------
export const requestImport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const importRecord = await dataService.requestImport(req.user!.id, req.body);
    res.status(200).json({
      message: 'Data imported successfully.',
      import: importRecord,
    });
  } catch (err) {
    next(err);
  }
};

export const listImports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await dataService.listImports(req.user!.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getImportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const importRecord = await dataService.getImportById(req.user!.id, req.params.id as string);
    res.status(200).json({ import: importRecord });
  } catch (err) {
    next(err);
  }
};
