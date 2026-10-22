import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createNote,
  getNotes,
  searchNotes,
  getNoteById,
  updateNote,
  deleteNote,
  pinNote,
  archiveNote,
  setNoteTags,
  getNoteCategories,
  createNoteCategory,
  updateNoteCategory,
  deleteNoteCategory,
} from './notes.controller';
import {
  idParamSchema,
  createNoteSchema,
  updateNoteSchema,
  pinNoteSchema,
  archiveNoteSchema,
  noteTagsSchema,
  notesQuerySchema,
  searchNotesQuerySchema,
  createNoteCategorySchema,
  updateNoteCategorySchema,
} from './notes.validation';

const router = Router();

// All notes endpoints require authentication
router.use(authenticate);

// ---------------- CATEGORIES & SEARCH ----------------
// Registered before '/:id' so these static paths are not treated as note IDs.
router.get('/categories', getNoteCategories);
router.post('/categories', validate({ body: createNoteCategorySchema }), createNoteCategory);
router.put('/categories/:id', validate({ params: idParamSchema, body: updateNoteCategorySchema }), updateNoteCategory);
router.delete('/categories/:id', validate({ params: idParamSchema }), deleteNoteCategory);
router.get('/search', validate({ query: searchNotesQuerySchema }), searchNotes);

// ---------------- NOTES ----------------
router.post('/', validate({ body: createNoteSchema }), createNote);
router.get('/', validate({ query: notesQuerySchema }), getNotes);
router.get('/:id', validate({ params: idParamSchema }), getNoteById);
router.put('/:id', validate({ params: idParamSchema, body: updateNoteSchema }), updateNote);
router.delete('/:id', validate({ params: idParamSchema }), deleteNote);
router.patch('/:id/pin', validate({ params: idParamSchema, body: pinNoteSchema }), pinNote);
router.patch('/:id/archive', validate({ params: idParamSchema, body: archiveNoteSchema }), archiveNote);
router.put('/:id/tags', validate({ params: idParamSchema, body: noteTagsSchema }), setNoteTags);

export default router;
