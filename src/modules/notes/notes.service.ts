import { withTransaction } from '../../config/database';
import { notesRepository } from './notes.repository';

/**
 * Tags are stored trimmed and lowercase, without duplicates.
 */
const normalizeTags = (tags: string[]): string[] =>
  Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)));

export class NotesService {
  // ---------------- HELPERS ----------------
  private async ensureNote(userId: string, id: string) {
    const note = await notesRepository.getNoteById(userId, id);
    if (!note) {
      throw { status: 404, message: 'Note not found.' };
    }
    return note;
  }

  private async ensureCategory(userId: string, categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const category = await notesRepository.getCategoryById(userId, categoryId);
    if (!category) {
      throw { status: 404, message: 'Note category not found.' };
    }
    return category;
  }

  private async withDetails(userId: string, id: string) {
    const [note, tags] = await Promise.all([
      notesRepository.getNoteById(userId, id),
      notesRepository.getTagsForNote(userId, id),
    ]);
    return note ? { ...note, tags } : null;
  }

  private async attachTags(userId: string, result: { data: any[]; pagination: any }) {
    const tagsByNote = await notesRepository.getTagsForNotes(userId, result.data.map((n) => n.id));
    return {
      ...result,
      data: result.data.map((note) => ({ ...note, tags: tagsByNote.get(note.id) || [] })),
    };
  }

  // ---------------- NOTES ----------------
  async createNote(userId: string, data: any) {
    await this.ensureCategory(userId, data.categoryId);
    const tags = normalizeTags(data.tags || []);

    const note = await withTransaction(async (client) => {
      const created = await notesRepository.createNote(client, userId, data);
      for (const tag of tags) {
        await notesRepository.addTag(client, userId, created.id, tag);
      }
      return created;
    });
    return this.withDetails(userId, note.id);
  }

  async getNotes(userId: string, filters: any) {
    return this.attachTags(userId, await notesRepository.findNotes(userId, filters));
  }

  async searchNotes(userId: string, filters: any) {
    return this.attachTags(userId, await notesRepository.findNotes(userId, filters));
  }

  async getNoteById(userId: string, id: string) {
    await this.ensureNote(userId, id);
    return this.withDetails(userId, id);
  }

  /**
   * Updates note fields; when `tags` is sent, the note's tags are replaced in the same transaction.
   */
  async updateNote(userId: string, id: string, data: any) {
    await this.ensureNote(userId, id);
    await this.ensureCategory(userId, data.categoryId);
    const { tags, ...fields } = data;
    const hasFields = Object.values(fields).some((value) => value !== undefined);

    await withTransaction(async (client) => {
      if (hasFields || tags === undefined) {
        await notesRepository.updateNote(userId, id, fields, client);
      }
      if (tags !== undefined) {
        await notesRepository.deleteTagsForNote(client, userId, id);
        for (const tag of normalizeTags(tags)) {
          await notesRepository.addTag(client, userId, id, tag);
        }
        await notesRepository.updateNote(userId, id, {}, client);
      }
    });
    return this.withDetails(userId, id);
  }

  async deleteNote(userId: string, id: string) {
    const deleted = await notesRepository.deleteNote(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Note not found.' };
    }
    return { message: 'Note deleted successfully.' };
  }

  async setPinned(userId: string, id: string, isPinned: boolean) {
    await this.ensureNote(userId, id);
    await notesRepository.updateNote(userId, id, { isPinned });
    return this.withDetails(userId, id);
  }

  async setArchived(userId: string, id: string, archived: boolean) {
    const note = await this.ensureNote(userId, id);
    // Keep the original archive time when archiving an already-archived note.
    const archivedAt = archived ? note.archived_at || new Date().toISOString() : null;
    await notesRepository.updateNote(userId, id, { archivedAt });
    return this.withDetails(userId, id);
  }

  async setTags(userId: string, id: string, tags: string[], mode: 'replace' | 'add') {
    await this.ensureNote(userId, id);
    await withTransaction(async (client) => {
      if (mode === 'replace') {
        await notesRepository.deleteTagsForNote(client, userId, id);
      }
      for (const tag of normalizeTags(tags)) {
        await notesRepository.addTag(client, userId, id, tag);
      }
      // Touch updated_at so tag changes are reflected in the note's modification time
      await notesRepository.updateNote(userId, id, {}, client);
    });
    return this.withDetails(userId, id);
  }

  /**
   * Most recent non-archived notes (Dashboard aggregation).
   */
  async getRecentNotes(userId: string, limit: number) {
    const notes = await notesRepository.getRecentNotes(userId, limit);
    const { data } = await this.attachTags(userId, { data: notes, pagination: null });
    return data;
  }

  // ---------------- CATEGORIES ----------------
  async getCategories(userId: string) {
    return notesRepository.getCategories(userId);
  }

  async createCategory(userId: string, data: any) {
    const duplicate = await notesRepository.findCategoryByName(userId, data.name);
    if (duplicate) {
      throw { status: 409, message: 'A note category with this name already exists.' };
    }
    return notesRepository.createCategory(userId, data);
  }

  async updateCategory(userId: string, id: string, data: any) {
    await this.ensureCategory(userId, id);
    if (data.name) {
      const duplicate = await notesRepository.findCategoryByName(userId, data.name);
      if (duplicate && duplicate.id !== id) {
        throw { status: 409, message: 'A note category with this name already exists.' };
      }
    }
    return notesRepository.updateCategory(userId, id, data);
  }

  async deleteCategory(userId: string, id: string) {
    const deleted = await notesRepository.deleteCategory(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Note category not found.' };
    }
    // Notes in this category are kept; the FK sets their category_id to NULL.
    return { message: 'Note category deleted successfully.' };
  }
}

export const notesService = new NotesService();
