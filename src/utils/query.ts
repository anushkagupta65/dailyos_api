/**
 * Shared SQL helpers for repositories.
 */

export const toNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

/**
 * Builds a `SET col = $n, ...` clause from only the provided (non-undefined) fields,
 * so nullable columns can be explicitly cleared with `null`.
 */
export const buildUpdateSet = (
  data: Record<string, any>,
  columns: Record<string, string>,
  startIndex: number
): { sets: string[]; values: any[] } => {
  const sets: string[] = [];
  const values: any[] = [];
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      sets.push(`${column} = $${startIndex + values.length - 1}`);
    }
  }
  return { sets, values };
};

export const paginate = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

/**
 * Escapes LIKE wildcards in user input and wraps it for a contains-match.
 */
export const toContainsPattern = (term: string): string =>
  `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
