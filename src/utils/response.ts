import { Request, Response } from 'express';

export interface PaginationMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  // Backward compatibility fields
  total?: number;
  page?: number;
  limit?: number;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  pagination: PaginationMetadata | null;
  path: string;
  api_timestamp: string;
  requestedTime: string;
  updated_at: string | null;
  [key: string]: any;
}

export interface SuccessResponseOptions<T = any> {
  status?: number;
  message?: string;
  data?: T;
  pagination?: any;
  updatedAt?: string | Date | null;
  extra?: Record<string, any>;
}

export interface ErrorResponseOptions {
  status?: number;
  message?: string;
  errors?: any[];
  retryAfterSeconds?: number;
  data?: null;
  extra?: Record<string, any>;
}

/**
 * Normalizes the request path to exclude query parameters.
 */
export const getRequestPath = (req?: Request): string => {
  if (!req) return '';
  const url = req.originalUrl || req.url || '';
  return url.split('?')[0] || '';
};

/**
 * Retrieves the request received timestamp, falling back to now.
 */
export const getRequestedTime = (req?: Request): string => {
  if (!req) return new Date().toISOString();
  return (req as any).requestedTime || new Date().toISOString();
};

/**
 * Extracts a valid ISO date string if present, otherwise returns null.
 * Do not invent a timestamp for resources that do not have an update time.
 */
export const extractUpdatedAt = (data: any, explicit?: string | Date | null): string | null => {
  if (explicit !== undefined) {
    if (explicit === null) return null;
    if (explicit instanceof Date) return explicit.toISOString();
    return String(explicit);
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  // Direct check
  const direct = data.updated_at ?? data.updatedAt;
  if (direct) {
    return direct instanceof Date ? direct.toISOString() : String(direct);
  }

  // Check in primary nested entity (e.g. data.user, data.habit, data.profile)
  if (!Array.isArray(data)) {
    for (const key of Object.keys(data)) {
      const child = data[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const nested = child.updated_at ?? child.updatedAt;
        if (nested) {
          return nested instanceof Date ? nested.toISOString() : String(nested);
        }
      }
    }
  }

  return null;
};

/**
 * Normalizes pagination metadata to the standard structure.
 */
export const formatPagination = (p: any): PaginationMetadata | null => {
  if (!p || typeof p !== 'object') return null;

  const totalItems = Number(p.totalItems ?? p.total ?? 0);
  const pageSize = Number(p.pageSize ?? p.limit ?? (totalItems > 0 ? totalItems : 10));
  const currentPage = Number(p.currentPage ?? p.page ?? 1);
  const totalPages = Number(
    p.totalPages ?? (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1)
  );

  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    total: totalItems,
    page: currentPage,
    limit: pageSize,
  };
};

/**
 * Sends a standardized success response.
 */
export const sendSuccess = <T = any>(
  res: Response,
  options: SuccessResponseOptions<T> = {}
): Response => {
  const req = res.req as Request | undefined;
  const status = options.status || 200;
  const message = options.message || 'Request executed successfully';
  let resolvedData: any = options.data !== undefined ? options.data : {};
  let resolvedPagination: any = options.pagination ?? null;

  // Auto-detect if data contains { data, pagination } from repositories
  if (
    resolvedData &&
    typeof resolvedData === 'object' &&
    'data' in resolvedData &&
    'pagination' in resolvedData &&
    options.pagination === undefined
  ) {
    resolvedPagination = resolvedData.pagination;
    resolvedData = resolvedData.data;
  }

  const pagination = formatPagination(resolvedPagination);
  const updated_at = extractUpdatedAt(resolvedData, options.updatedAt);
  const path = getRequestPath(req);
  const requestedTime = getRequestedTime(req);
  const api_timestamp = new Date().toISOString();

  const body: StandardApiResponse<T> = {
    success: true,
    message,
    data: resolvedData,
    pagination,
    path,
    api_timestamp,
    requestedTime,
    updated_at,
    ...(options.extra || {}),
  };

  return res.status(status).json(body);
};

/**
 * Sends a standardized error response.
 */
export const sendError = (
  res: Response,
  options: ErrorResponseOptions = {}
): Response => {
  const req = res.req as Request | undefined;
  const status = options.status || 500;
  const message = options.message || 'An unexpected error occurred';
  const path = getRequestPath(req);
  const requestedTime = getRequestedTime(req);
  const api_timestamp = new Date().toISOString();

  const body: StandardApiResponse<null> = {
    success: false,
    message,
    data: null,
    pagination: null,
    path,
    api_timestamp,
    requestedTime,
    updated_at: null,
    ...(options.extra || {}),
  };

  if (options.errors && Array.isArray(options.errors)) {
    body.errors = options.errors;
  }

  if (typeof options.retryAfterSeconds === 'number') {
    body.retryAfterSeconds = options.retryAfterSeconds;
  }

  return res.status(status).json(body);
};
