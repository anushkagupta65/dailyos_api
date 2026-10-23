import { Request, Response, NextFunction } from 'express';
import { dataService } from './data.service';
import { sendSuccess } from '../../utils/response';

// ---------------- EXPORTS ----------------
export const requestExport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exportType = req.body.exportType || 'full';
    const exportRecord = await dataService.requestExport(req.user!.id, exportType);
    sendSuccess(res, {
      status: 202,
      message: 'Data export request submitted successfully.',
      data: { export: exportRecord },
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
    sendSuccess(res, {
      status: 200,
      message: 'Data exports retrieved successfully.',
      data: { exports: result.exports },
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Data export retrieved successfully.',
      data: { export: exportRecord },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Data imported successfully.',
      data: { import: importRecord },
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
    sendSuccess(res, {
      status: 200,
      message: 'Data imports retrieved successfully.',
      data: { imports: result.imports },
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Data import retrieved successfully.',
      data: { import: importRecord },
    });
  } catch (err) {
    next(err);
  }
};
