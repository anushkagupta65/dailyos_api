import { Request, Response, NextFunction } from 'express';
import { notesService } from './notes.service';
import { sendSuccess } from '../../utils/response';

const listFilters = (query: any) => ({
  noteType: query.noteType,
  categoryId: query.categoryId,
  tag: query.tag,
  isPinned: query.isPinned,
  archived: query.archived,
  sortBy: query.sortBy,
  sortOrder: query.sortOrder,
  page: Number(query.page) || 1,
  limit: Number(query.limit) || 20,
});

// ---------------- NOTES ----------------
export const createNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.createNote(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Note created successfully.',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

export const getNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notesService.getNotes(req.user!.id, listFilters(res.locals.validatedQuery));
    sendSuccess(res, {
      status: 200,
      message: 'Notes retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const searchNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await notesService.searchNotes(req.user!.id, { ...listFilters(query), q: query.q });
    sendSuccess(res, {
      status: 200,
      message: 'Notes search results retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getNoteById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.getNoteById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Note retrieved successfully.',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.updateNote(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Note updated successfully.',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notesService.deleteNote(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Note deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const pinNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.setPinned(req.user!.id, req.params.id as string, req.body.isPinned);
    sendSuccess(res, {
      status: 200,
      message: `Note ${note!.is_pinned ? 'pinned' : 'unpinned'} successfully.`,
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

export const archiveNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.setArchived(req.user!.id, req.params.id as string, req.body.archived);
    sendSuccess(res, {
      status: 200,
      message: `Note ${note!.archived_at ? 'archived' : 'unarchived'} successfully.`,
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

export const setNoteTags = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = await notesService.setTags(
      req.user!.id,
      req.params.id as string,
      req.body.tags,
      req.body.mode
    );
    sendSuccess(res, {
      status: 200,
      message: 'Note tags updated successfully.',
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- CATEGORIES ----------------
export const getNoteCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await notesService.getCategories(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Note categories retrieved successfully.',
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

export const createNoteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await notesService.createCategory(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Note category created successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNoteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await notesService.updateCategory(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Note category updated successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNoteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notesService.deleteCategory(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Note category deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
