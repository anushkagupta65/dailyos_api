import { Request, Response, NextFunction } from 'express';
import { notesService } from './notes.service';

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
    res.status(201).json({ message: 'Note created successfully.', note });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(200).json({ note });
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
    res.status(200).json({ message: 'Note updated successfully.', note });
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
    res.status(200).json(result);
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
    res.status(200).json({ message: `Note ${note!.is_pinned ? 'pinned' : 'unpinned'} successfully.`, note });
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
    res.status(200).json({
      message: `Note ${note!.archived_at ? 'archived' : 'unarchived'} successfully.`,
      note,
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
    res.status(200).json({ message: 'Note tags updated successfully.', note });
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
    res.status(200).json({ categories });
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
    res.status(201).json({ message: 'Note category created successfully.', category });
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
    res.status(200).json({ message: 'Note category updated successfully.', category });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
