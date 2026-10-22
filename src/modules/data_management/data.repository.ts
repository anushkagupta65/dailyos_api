import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { paginate } from '../../utils/query';

export interface UserDataExportRecord {
  id: string;
  user_id: string;
  export_type: 'full' | 'financial' | 'habits' | 'personal';
  file_url: string;
  status: 'requested' | 'processing' | 'completed' | 'failed' | 'expired';
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

export interface UserDataImportRecord {
  id: string;
  user_id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imported_at: string | null;
  error_details: Record<string, any> | null;
}

export class DataRepository {
  // ---------------- EXPORTS TRACKING ----------------
  async createExport(
    userId: string,
    exportType: 'full' | 'financial' | 'habits' | 'personal'
  ): Promise<UserDataExportRecord> {
    const { rows } = await pool.query<UserDataExportRecord>(
      `INSERT INTO user_data_exports (user_id, export_type, file_url, status)
       VALUES ($1, $2, '', 'processing')
       RETURNING id, user_id, export_type, file_url, status, requested_at, completed_at, expires_at`,
      [userId, exportType]
    );
    return rows[0];
  }

  async updateExportStatus(
    exportId: string,
    userId: string,
    status: 'completed' | 'failed' | 'expired',
    fileUrl: string,
    expiresAt?: string
  ): Promise<UserDataExportRecord> {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    const { rows } = await pool.query<UserDataExportRecord>(
      `UPDATE user_data_exports
       SET status = $3,
           file_url = $4,
           completed_at = COALESCE($5, completed_at),
           expires_at = COALESCE($6, expires_at)
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, export_type, file_url, status, requested_at, completed_at, expires_at`,
      [exportId, userId, status, fileUrl, completedAt, expiresAt]
    );
    return rows[0];
  }

  async getExportById(userId: string, exportId: string): Promise<UserDataExportRecord | null> {
    const { rows } = await pool.query<UserDataExportRecord>(
      `SELECT id, user_id, export_type, file_url, status, requested_at, completed_at, expires_at
       FROM user_data_exports
       WHERE id = $1 AND user_id = $2`,
      [exportId, userId]
    );
    return rows[0] || null;
  }

  async listExports(
    userId: string,
    options: {
      status?: string;
      exportType?: string;
      page: number;
      limit: number;
    }
  ) {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];

    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }

    if (options.exportType) {
      values.push(options.exportType);
      conditions.push(`export_type = $${values.length}`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM user_data_exports WHERE ${whereClause}`,
      values
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const offset = (options.page - 1) * options.limit;
    values.push(options.limit, offset);

    const { rows } = await pool.query<UserDataExportRecord>(
      `SELECT id, user_id, export_type, file_url, status, requested_at, completed_at, expires_at
       FROM user_data_exports
       WHERE ${whereClause}
       ORDER BY requested_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      exports: rows,
      pagination: paginate(options.page, options.limit, total),
    };
  }

  // ---------------- IMPORTS TRACKING ----------------
  async createImport(userId: string, fileName: string): Promise<UserDataImportRecord> {
    const { rows } = await pool.query<UserDataImportRecord>(
      `INSERT INTO user_data_imports (user_id, file_name, status)
       VALUES ($1, $2, 'processing')
       RETURNING id, user_id, file_name, status, imported_at, error_details`,
      [userId, fileName]
    );
    return rows[0];
  }

  async updateImportStatus(
    importId: string,
    userId: string,
    status: 'completed' | 'failed',
    errorDetails?: Record<string, any>
  ): Promise<UserDataImportRecord> {
    const importedAt = status === 'completed' ? new Date().toISOString() : null;
    const { rows } = await pool.query<UserDataImportRecord>(
      `UPDATE user_data_imports
       SET status = $3,
           imported_at = $4,
           error_details = $5
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, file_name, status, imported_at, error_details`,
      [importId, userId, status, importedAt, errorDetails ? JSON.stringify(errorDetails) : null]
    );
    return rows[0];
  }

  async getImportById(userId: string, importId: string): Promise<UserDataImportRecord | null> {
    const { rows } = await pool.query<UserDataImportRecord>(
      `SELECT id, user_id, file_name, status, imported_at, error_details
       FROM user_data_imports
       WHERE id = $1 AND user_id = $2`,
      [importId, userId]
    );
    return rows[0] || null;
  }

  async listImports(
    userId: string,
    options: {
      status?: string;
      page: number;
      limit: number;
    }
  ) {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];

    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM user_data_imports WHERE ${whereClause}`,
      values
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const offset = (options.page - 1) * options.limit;
    values.push(options.limit, offset);

    const { rows } = await pool.query<UserDataImportRecord>(
      `SELECT id, user_id, file_name, status, imported_at, error_details
       FROM user_data_imports
       WHERE ${whereClause}
       ORDER BY id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      imports: rows,
      pagination: paginate(options.page, options.limit, total),
    };
  }

  // ---------------- MODULE DATA EXPORTERS ----------------
  async fetchProfileData(userId: string) {
    const [personal, health, measurements, professional, lifestyle, goals] = await Promise.all([
      pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_health_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_body_measurements WHERE user_id = $1 ORDER BY recorded_at DESC`, [userId]),
      pool.query(`SELECT * FROM user_professional_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_lifestyle_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
    ]);

    return {
      personal_profile: personal.rows[0] || null,
      health_profile: health.rows[0] || null,
      body_measurements: measurements.rows,
      professional_profile: professional.rows[0] || null,
      lifestyle_profile: lifestyle.rows[0] || null,
      goals: goals.rows,
    };
  }

  async fetchHabitsData(userId: string) {
    const [categories, habits, schedules, logs, flexibility, reminders] = await Promise.all([
      pool.query(`SELECT * FROM habit_categories WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM habits WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC`, [userId]),
      pool.query(`SELECT * FROM habit_schedules WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM habit_logs WHERE user_id = $1 ORDER BY log_date DESC`, [userId]),
      pool.query(`SELECT * FROM habit_flexibility WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM habit_reminders WHERE user_id = $1`, [userId]),
    ]);

    return {
      categories: categories.rows,
      habits: habits.rows,
      schedules: schedules.rows,
      logs: logs.rows,
      flexibility: flexibility.rows,
      reminders: reminders.rows,
    };
  }

  async fetchTasksData(userId: string) {
    const [tasks, subtasks, history] = await Promise.all([
      pool.query(`SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT * FROM task_subtasks WHERE user_id = $1 ORDER BY sort_order ASC`, [userId]),
      pool.query(`SELECT * FROM task_status_history WHERE user_id = $1 ORDER BY changed_at DESC`, [userId]),
    ]);

    return {
      tasks: tasks.rows,
      subtasks: subtasks.rows,
      history: history.rows,
    };
  }

  async fetchIntentionsData(userId: string) {
    const [intentions, priorities] = await Promise.all([
      pool.query(`SELECT * FROM daily_intentions WHERE user_id = $1 ORDER BY date DESC`, [userId]),
      pool.query(`SELECT * FROM daily_priorities WHERE user_id = $1 ORDER BY date DESC`, [userId]),
    ]);

    return {
      daily_intentions: intentions.rows,
      daily_priorities: priorities.rows,
    };
  }

  async fetchLearningAndNotesData(userId: string) {
    const [noteCategories, notes, tags, entries, reviews] = await Promise.all([
      pool.query(`SELECT * FROM note_categories WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT * FROM note_tags WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM learning_entries WHERE user_id = $1 ORDER BY learned_at DESC`, [userId]),
      pool.query(`SELECT * FROM learning_reviews WHERE user_id = $1 ORDER BY reviewed_at DESC`, [userId]),
    ]);

    return {
      note_categories: noteCategories.rows,
      notes: notes.rows,
      note_tags: tags.rows,
      learning_entries: entries.rows,
      learning_reviews: reviews.rows,
    };
  }

  async fetchReviewsData(userId: string) {
    const [reviews, daily, weekly, monthly, habitRatings, taskRatings, actions] = await Promise.all([
      pool.query(`SELECT * FROM reviews WHERE user_id = $1 ORDER BY period_start DESC`, [userId]),
      pool.query(`SELECT dr.* FROM daily_reviews dr JOIN reviews r ON dr.review_id = r.id WHERE r.user_id = $1`, [userId]),
      pool.query(`SELECT wr.* FROM weekly_reviews wr JOIN reviews r ON wr.review_id = r.id WHERE r.user_id = $1`, [userId]),
      pool.query(`SELECT mr.* FROM monthly_reviews mr JOIN reviews r ON mr.review_id = r.id WHERE r.user_id = $1`, [userId]),
      pool.query(`SELECT rhr.* FROM review_habit_ratings rhr JOIN reviews r ON rhr.review_id = r.id WHERE r.user_id = $1`, [userId]),
      pool.query(`SELECT rtr.* FROM review_task_ratings rtr JOIN reviews r ON rtr.review_id = r.id WHERE r.user_id = $1`, [userId]),
      pool.query(`SELECT * FROM review_actions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    ]);

    return {
      reviews: reviews.rows,
      daily_reviews: daily.rows,
      weekly_reviews: weekly.rows,
      monthly_reviews: monthly.rows,
      review_habit_ratings: habitRatings.rows,
      review_task_ratings: taskRatings.rows,
      review_actions: actions.rows,
    };
  }

  async fetchFinanceData(userId: string) {
    const [
      accounts,
      categories,
      recurring,
      transactions,
      salary,
      holdings,
      investmentTx,
      budgets,
      goals,
      contributions,
      emergencySettings,
      liabilities,
      netWorthSnapshots,
    ] = await Promise.all([
      pool.query(`SELECT * FROM financial_accounts WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_categories WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM recurring_payments WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_transactions WHERE user_id = $1 ORDER BY transaction_date DESC`, [userId]),
      pool.query(`SELECT * FROM salary_records WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM investment_holdings WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM investment_transactions WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM budgets WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_goals WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_goal_contributions WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM emergency_fund_settings WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_liabilities WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM financial_net_worth_snapshots WHERE user_id = $1`, [userId]),
    ]);

    return {
      accounts: accounts.rows,
      custom_categories: categories.rows,
      recurring_payments: recurring.rows,
      transactions: transactions.rows,
      salary_records: salary.rows,
      investment_holdings: holdings.rows,
      investment_transactions: investmentTx.rows,
      budgets: budgets.rows,
      financial_goals: goals.rows,
      financial_goal_contributions: contributions.rows,
      emergency_fund_settings: emergencySettings.rows[0] || null,
      liabilities: liabilities.rows,
      net_worth_snapshots: netWorthSnapshots.rows,
    };
  }

  async fetchPreferencesData(userId: string) {
    const [userPrefs, privacy, dashPrefs, insightPrefs] = await Promise.all([
      pool.query(`SELECT * FROM user_preferences WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_privacy_settings WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM dashboard_preferences WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_insight_preferences WHERE user_id = $1`, [userId]),
    ]);

    return {
      user_preferences: userPrefs.rows[0] || null,
      user_privacy_settings: privacy.rows[0] || null,
      dashboard_preferences: dashPrefs.rows[0] || null,
      user_insight_preferences: insightPrefs.rows[0] || null,
    };
  }
}

export const dataRepository = new DataRepository();
