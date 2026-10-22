import { pool } from '../../config/database';

export class DashboardRepository {
  // ---------------- PREFERENCES ----------------
  async getPreferences(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM dashboard_preferences WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertPreferences(
    userId: string,
    data: { visibleWidgets?: string[]; widgetOrder?: string[]; defaultPeriod?: string },
    defaults: { visible_widgets: string[]; widget_order: string[]; default_period: string }
  ) {
    const existing = await this.getPreferences(userId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE dashboard_preferences
         SET visible_widgets = COALESCE($2, visible_widgets),
             widget_order = COALESCE($3, widget_order),
             default_period = COALESCE($4, default_period),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.visibleWidgets ? JSON.stringify(data.visibleWidgets) : null,
          data.widgetOrder ? JSON.stringify(data.widgetOrder) : null,
          data.defaultPeriod,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO dashboard_preferences (user_id, visible_widgets, widget_order, default_period)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          userId,
          JSON.stringify(data.visibleWidgets ?? defaults.visible_widgets),
          JSON.stringify(data.widgetOrder ?? defaults.widget_order),
          data.defaultPeriod ?? defaults.default_period,
        ]
      );
      return rows[0];
    }
  }
}

export const dashboardRepository = new DashboardRepository();
