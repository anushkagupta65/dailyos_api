import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate, toContainsPattern, toNumberOrNull } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapAccount = (row: any) =>
  row && {
    ...row,
    opening_balance: toNumberOrNull(row.opening_balance),
    current_balance: toNumberOrNull(row.current_balance),
  };

const mapTransaction = (row: any) =>
  row && {
    ...row,
    amount: toNumberOrNull(row.amount),
    transaction_date: toDateString(row.transaction_date),
  };

const mapSalary = (row: any) =>
  row && {
    ...row,
    gross_salary: toNumberOrNull(row.gross_salary),
    net_salary: toNumberOrNull(row.net_salary),
    effective_from: toDateString(row.effective_from),
    effective_until: toDateString(row.effective_until),
  };

const mapHolding = (row: any) =>
  row && {
    ...row,
    units: toNumberOrNull(row.units),
    purchase_price: toNumberOrNull(row.purchase_price),
    invested_amount: toNumberOrNull(row.invested_amount),
    current_value: toNumberOrNull(row.current_value),
    interest_rate: toNumberOrNull(row.interest_rate),
    purchase_date: toDateString(row.purchase_date),
    maturity_date: toDateString(row.maturity_date),
  };

const mapInvestmentTx = (row: any) =>
  row && {
    ...row,
    amount: toNumberOrNull(row.amount),
    units: toNumberOrNull(row.units),
    nav_or_price: toNumberOrNull(row.nav_or_price),
    transaction_date: toDateString(row.transaction_date),
  };

const mapRecurring = (row: any) =>
  row && {
    ...row,
    amount: toNumberOrNull(row.amount),
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
    next_due_date: toDateString(row.next_due_date),
  };

const mapBudget = (row: any) =>
  row && {
    ...row,
    budget_amount: toNumberOrNull(row.budget_amount),
    alert_threshold: toNumberOrNull(row.alert_threshold),
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
  };

const mapGoal = (row: any) =>
  row && {
    ...row,
    target_amount: toNumberOrNull(row.target_amount),
    current_amount: toNumberOrNull(row.current_amount),
    start_date: toDateString(row.start_date),
    target_date: toDateString(row.target_date),
  };

const mapContribution = (row: any) =>
  row && {
    ...row,
    amount: toNumberOrNull(row.amount),
    contribution_date: toDateString(row.contribution_date),
  };

const mapLiability = (row: any) =>
  row && {
    ...row,
    original_amount: toNumberOrNull(row.original_amount),
    outstanding_amount: toNumberOrNull(row.outstanding_amount),
    interest_rate: toNumberOrNull(row.interest_rate),
    start_date: toDateString(row.start_date),
    due_date: toDateString(row.due_date),
  };

const mapNetWorth = (row: any) =>
  row && {
    ...row,
    snapshot_date: toDateString(row.snapshot_date),
    total_assets: toNumberOrNull(row.total_assets),
    total_liabilities: toNumberOrNull(row.total_liabilities),
    net_worth: toNumberOrNull(row.net_worth),
  };

export class FinanceRepository {
  // ---------------- ACCOUNTS ----------------
  async createAccount(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_accounts (
         user_id, name, institution_name, account_type, account_number_masked,
         currency, opening_balance, current_balance, is_default, is_active, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.name,
        data.institutionName ?? null,
        data.accountType,
        data.accountNumberMasked ?? null,
        data.currency || 'INR',
        data.openingBalance || 0,
        data.isDefault || false,
        data.isActive ?? true,
        data.notes ?? null,
      ]
    );
    return mapAccount(rows[0]);
  }

  async getAccountById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM financial_accounts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapAccount(rows[0]) : null;
  }

  async listAccounts(userId: string, filters: any) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.accountType) {
      params.push(filters.accountType);
      where.push(`account_type = $${params.length}`);
    }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      where.push(`is_active = $${params.length}`);
    }
    if (filters.search) {
      params.push(toContainsPattern(filters.search));
      where.push(`(name ILIKE $${params.length} OR institution_name ILIKE $${params.length})`);
    }

    const whereClause = where.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM financial_accounts WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM financial_accounts
       WHERE ${whereClause}
       ORDER BY is_default DESC, is_active DESC, name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      accounts: rows.map(mapAccount),
      pagination: paginate(filters.page, filters.limit, total),
    };
  }

  async updateAccount(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        name: 'name',
        institutionName: 'institution_name',
        accountType: 'account_type',
        accountNumberMasked: 'account_number_masked',
        currency: 'currency',
        openingBalance: 'opening_balance',
        isDefault: 'is_default',
        isActive: 'is_active',
        notes: 'notes',
      },
      3
    );

    if (sets.length === 0) {
      return this.getAccountById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE financial_accounts
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapAccount(rows[0]) : null;
  }

  async deleteAccount(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM financial_accounts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async reconcileAccountBalance(db: Queryable, userId: string, accountId: string) {
    // Double-entry style reconciliation:
    // current_balance = opening_balance + sum(completed inflows) - sum(completed outflows)
    const { rows: accRows } = await db.query(
      `SELECT opening_balance FROM financial_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );
    if (!accRows[0]) return null;

    const openingBalance = Number(accRows[0].opening_balance) || 0;

    const { rows: txSumRows } = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)::numeric(15,2) AS net_movement
       FROM financial_transactions
       WHERE account_id = $1 AND user_id = $2 AND status = 'completed'`,
      [accountId, userId]
    );

    const netMovement = Number(txSumRows[0]?.net_movement) || 0;
    const newBalance = Number((openingBalance + netMovement).toFixed(2));

    const { rows: updatedRows } = await db.query(
      `UPDATE financial_accounts
       SET current_balance = $1, balance_updated_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [newBalance, accountId, userId]
    );

    return mapAccount(updatedRows[0]);
  }

  // ---------------- CATEGORIES ----------------
  async createCategory(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_categories (
         user_id, name, category_type, parent_category_id, icon, color, is_system, is_active, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, $7)
       RETURNING *`,
      [
        userId,
        data.name,
        data.categoryType,
        data.parentCategoryId ?? null,
        data.icon ?? null,
        data.color ?? null,
        data.sortOrder || 0,
      ]
    );
    return rows[0];
  }

  async getCategoryById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM financial_categories
       WHERE id = $1 AND (user_id = $2 OR (is_system = TRUE AND user_id IS NULL))`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async listCategories(userId: string, categoryType?: string, includeSystem: boolean = true) {
    const where: string[] = ['is_active = TRUE'];
    const params: any[] = [];

    if (includeSystem) {
      params.push(userId);
      where.push(`(user_id = $${params.length} OR (is_system = TRUE AND user_id IS NULL))`);
    } else {
      params.push(userId);
      where.push(`user_id = $${params.length}`);
    }

    if (categoryType) {
      params.push(categoryType);
      where.push(`category_type = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM financial_categories
       WHERE ${where.join(' AND ')}
       ORDER BY is_system DESC, sort_order ASC, name ASC`,
      params
    );
    return rows;
  }

  async updateCategory(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        name: 'name',
        categoryType: 'category_type',
        parentCategoryId: 'parent_category_id',
        icon: 'icon',
        color: 'color',
        sortOrder: 'sort_order',
      },
      3
    );

    if (sets.length === 0) {
      return this.getCategoryById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE financial_categories
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2 AND is_system = FALSE
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] || null;
  }

  async deleteCategory(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM financial_categories
       WHERE id = $1 AND user_id = $2 AND is_system = FALSE`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- TRANSACTIONS ----------------
  async createTransaction(db: Queryable, userId: string, data: any) {
    // Determine default direction based on transaction type if not specified
    let direction = data.direction;
    if (!direction) {
      if (data.transactionType === 'income') direction = 'inflow';
      else direction = 'outflow';
    }

    const { rows } = await db.query(
      `INSERT INTO financial_transactions (
         user_id, account_id, category_id, recurring_payment_id, transfer_group_id,
         transaction_type, amount, currency, transaction_date, direction,
         description, notes, attachment_url, merchant, payment_method,
         reference_number, status, original_transaction_id, destination_account_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        userId,
        data.accountId,
        data.categoryId ?? null,
        data.recurringPaymentId ?? null,
        data.transferGroupId ?? null,
        data.transactionType,
        data.amount,
        data.currency || 'INR',
        data.transactionDate,
        direction,
        data.description ?? null,
        data.notes ?? null,
        data.attachmentUrl ?? null,
        data.merchant ?? null,
        data.paymentMethod ?? null,
        data.referenceNumber ?? null,
        data.status || 'completed',
        data.originalTransactionId ?? null,
        data.destinationAccountId ?? null,
      ]
    );
    return mapTransaction(rows[0]);
  }

  async getTransactionById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT t.*, a.name AS account_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM financial_transactions t
       LEFT JOIN financial_accounts a ON a.id = t.account_id
       LEFT JOIN financial_categories c ON c.id = t.category_id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapTransaction(rows[0]) : null;
  }

  async listTransactions(userId: string, filters: any) {
    const where: string[] = ['t.user_id = $1'];
    const params: any[] = [userId];

    if (filters.accountId) {
      params.push(filters.accountId);
      where.push(`t.account_id = $${params.length}`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      where.push(`t.category_id = $${params.length}`);
    }
    if (filters.transactionType) {
      params.push(filters.transactionType);
      where.push(`t.transaction_type = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`t.status = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      where.push(`t.transaction_date >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      where.push(`t.transaction_date <= $${params.length}`);
    }
    if (filters.search) {
      params.push(toContainsPattern(filters.search));
      where.push(`(t.description ILIKE $${params.length} OR t.merchant ILIKE $${params.length} OR t.notes ILIKE $${params.length})`);
    }

    const whereClause = where.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM financial_transactions t WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const { rows } = await pool.query(
      `SELECT t.*, a.name AS account_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM financial_transactions t
       LEFT JOIN financial_accounts a ON a.id = t.account_id
       LEFT JOIN financial_categories c ON c.id = t.category_id
       WHERE ${whereClause}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      transactions: rows.map(mapTransaction),
      pagination: paginate(filters.page, filters.limit, total),
    };
  }

  async updateTransaction(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        accountId: 'account_id',
        categoryId: 'category_id',
        transactionType: 'transaction_type',
        amount: 'amount',
        currency: 'currency',
        transactionDate: 'transaction_date',
        direction: 'direction',
        description: 'description',
        notes: 'notes',
        attachmentUrl: 'attachment_url',
        merchant: 'merchant',
        paymentMethod: 'payment_method',
        referenceNumber: 'reference_number',
        status: 'status',
      },
      3
    );

    if (sets.length === 0) {
      return this.getTransactionById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE financial_transactions
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapTransaction(rows[0]) : null;
  }

  async deleteTransaction(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM financial_transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async getTransactionsByTransferGroup(userId: string, transferGroupId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM financial_transactions WHERE transfer_group_id = $1 AND user_id = $2`,
      [transferGroupId, userId]
    );
    return rows.map(mapTransaction);
  }

  // ---------------- SALARY ----------------
  async createSalary(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO salary_records (
         user_id, employer, designation, salary_type, gross_salary,
         net_salary, currency, effective_from, effective_until, payment_day, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        data.employer,
        data.designation,
        data.salaryType || 'monthly',
        data.grossSalary,
        data.netSalary,
        data.currency || 'INR',
        data.effectiveFrom,
        data.effectiveUntil ?? null,
        data.paymentDay ?? null,
        data.notes ?? null,
      ]
    );
    return mapSalary(rows[0]);
  }

  async getSalaryById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM salary_records WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapSalary(rows[0]) : null;
  }

  async listSalaries(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM salary_records WHERE user_id = $1 ORDER BY effective_from DESC, created_at DESC`,
      [userId]
    );
    return rows.map(mapSalary);
  }

  async getCurrentSalary(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT * FROM salary_records
       WHERE user_id = $1 AND effective_from <= $2
         AND (effective_until IS NULL OR effective_until >= $2)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [userId, today]
    );
    return rows[0] ? mapSalary(rows[0]) : null;
  }

  async updateSalary(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        employer: 'employer',
        designation: 'designation',
        salaryType: 'salary_type',
        grossSalary: 'gross_salary',
        netSalary: 'net_salary',
        currency: 'currency',
        effectiveFrom: 'effective_from',
        effectiveUntil: 'effective_until',
        paymentDay: 'payment_day',
        notes: 'notes',
      },
      3
    );

    if (sets.length === 0) {
      return this.getSalaryById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE salary_records
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapSalary(rows[0]) : null;
  }

  async deleteSalary(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM salary_records WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- INVESTMENTS ----------------
  async createHolding(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO investment_holdings (
         user_id, account_id, name, investment_type, institution, units,
         purchase_price, invested_amount, current_value, purchase_date,
         maturity_date, interest_rate, status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId,
        data.accountId ?? null,
        data.name,
        data.investmentType,
        data.institution ?? null,
        data.units ?? null,
        data.purchasePrice ?? null,
        data.investedAmount || 0,
        data.currentValue ?? data.investedAmount ?? null,
        data.purchaseDate,
        data.maturityDate ?? null,
        data.interestRate ?? null,
        data.status || 'active',
        data.notes ?? null,
      ]
    );
    return mapHolding(rows[0]);
  }

  async getHoldingById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT h.*, a.name AS account_name
       FROM investment_holdings h
       LEFT JOIN financial_accounts a ON a.id = h.account_id
       WHERE h.id = $1 AND h.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapHolding(rows[0]) : null;
  }

  async listHoldings(userId: string, filters: any) {
    const where: string[] = ['h.user_id = $1'];
    const params: any[] = [userId];

    if (filters.investmentType) {
      params.push(filters.investmentType);
      where.push(`h.investment_type = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`h.status = $${params.length}`);
    }
    if (filters.search) {
      params.push(toContainsPattern(filters.search));
      where.push(`(h.name ILIKE $${params.length} OR h.institution ILIKE $${params.length})`);
    }

    const whereClause = where.join(' AND ');
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM investment_holdings h WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const { rows } = await pool.query(
      `SELECT h.*, a.name AS account_name
       FROM investment_holdings h
       LEFT JOIN financial_accounts a ON a.id = h.account_id
       WHERE ${whereClause}
       ORDER BY h.status ASC, h.current_value DESC NULLS LAST, h.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      holdings: rows.map(mapHolding),
      pagination: paginate(filters.page, filters.limit, total),
    };
  }

  async updateHolding(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        accountId: 'account_id',
        name: 'name',
        investmentType: 'investment_type',
        institution: 'institution',
        units: 'units',
        purchasePrice: 'purchase_price',
        investedAmount: 'invested_amount',
        currentValue: 'current_value',
        purchaseDate: 'purchase_date',
        maturityDate: 'maturity_date',
        interestRate: 'interest_rate',
        status: 'status',
        notes: 'notes',
      },
      3
    );

    if (sets.length === 0) {
      return this.getHoldingById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE investment_holdings
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapHolding(rows[0]) : null;
  }

  async deleteHolding(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM investment_holdings WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async createInvestmentTransaction(db: Queryable, userId: string, holdingId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO investment_transactions (
         user_id, holding_id, transaction_type, amount, units, nav_or_price, transaction_date, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        holdingId,
        data.transactionType,
        data.amount,
        data.units ?? null,
        data.navOrPrice ?? null,
        data.transactionDate,
        data.notes ?? null,
      ]
    );
    return mapInvestmentTx(rows[0]);
  }

  async listInvestmentTransactions(userId: string, holdingId?: string) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (holdingId) {
      params.push(holdingId);
      where.push(`holding_id = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM investment_transactions
       WHERE ${where.join(' AND ')}
       ORDER BY transaction_date DESC, created_at DESC`,
      params
    );
    return rows.map(mapInvestmentTx);
  }

  async deleteInvestmentTransaction(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM investment_transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- RECURRING PAYMENTS ----------------
  async createRecurringPayment(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO recurring_payments (
         user_id, account_id, category_id, name, payment_type, amount,
         frequency, interval_value, start_date, end_date, next_due_date,
         auto_record, status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId,
        data.accountId ?? null,
        data.categoryId ?? null,
        data.name,
        data.paymentType,
        data.amount,
        data.frequency,
        data.intervalValue || 1,
        data.startDate,
        data.endDate ?? null,
        data.nextDueDate,
        data.autoRecord || false,
        data.status || 'active',
        data.notes ?? null,
      ]
    );
    return mapRecurring(rows[0]);
  }

  async getRecurringPaymentById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT r.*, a.name AS account_name, c.name AS category_name
       FROM recurring_payments r
       LEFT JOIN financial_accounts a ON a.id = r.account_id
       LEFT JOIN financial_categories c ON c.id = r.category_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapRecurring(rows[0]) : null;
  }

  async listRecurringPayments(userId: string) {
    const { rows } = await pool.query(
      `SELECT r.*, a.name AS account_name, c.name AS category_name
       FROM recurring_payments r
       LEFT JOIN financial_accounts a ON a.id = r.account_id
       LEFT JOIN financial_categories c ON c.id = r.category_id
       WHERE r.user_id = $1
       ORDER BY r.status ASC, r.next_due_date ASC`,
      [userId]
    );
    return rows.map(mapRecurring);
  }

  async getDueRecurringPayments(userId: string, asOfDate: string) {
    const { rows } = await pool.query(
      `SELECT r.*, a.name AS account_name, c.name AS category_name
       FROM recurring_payments r
       LEFT JOIN financial_accounts a ON a.id = r.account_id
       LEFT JOIN financial_categories c ON c.id = r.category_id
       WHERE r.user_id = $1 AND r.status = 'active' AND r.next_due_date <= $2
         AND (r.end_date IS NULL OR r.next_due_date <= r.end_date)
       ORDER BY r.next_due_date ASC`,
      [userId, asOfDate]
    );
    return rows.map(mapRecurring);
  }

  async updateRecurringPayment(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        accountId: 'account_id',
        categoryId: 'category_id',
        name: 'name',
        paymentType: 'payment_type',
        amount: 'amount',
        frequency: 'frequency',
        intervalValue: 'interval_value',
        startDate: 'start_date',
        endDate: 'end_date',
        nextDueDate: 'next_due_date',
        autoRecord: 'auto_record',
        status: 'status',
        notes: 'notes',
      },
      3
    );

    if (sets.length === 0) {
      return this.getRecurringPaymentById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE recurring_payments
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapRecurring(rows[0]) : null;
  }

  async deleteRecurringPayment(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM recurring_payments WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- BUDGETS ----------------
  async createBudget(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO budgets (
         user_id, category_id, name, budget_amount, period, start_date, end_date, alert_threshold, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        data.categoryId ?? null,
        data.name,
        data.budgetAmount,
        data.period || 'monthly',
        data.startDate,
        data.endDate ?? null,
        data.alertThreshold || 80,
        data.isActive ?? true,
      ]
    );
    return mapBudget(rows[0]);
  }

  async getBudgetById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       LEFT JOIN financial_categories c ON c.id = b.category_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapBudget(rows[0]) : null;
  }

  async listBudgets(userId: string) {
    const { rows } = await pool.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       LEFT JOIN financial_categories c ON c.id = b.category_id
       WHERE b.user_id = $1
       ORDER BY b.is_active DESC, b.name ASC`,
      [userId]
    );
    return rows.map(mapBudget);
  }

  async updateBudget(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        categoryId: 'category_id',
        name: 'name',
        budgetAmount: 'budget_amount',
        period: 'period',
        startDate: 'start_date',
        endDate: 'end_date',
        alertThreshold: 'alert_threshold',
        isActive: 'is_active',
      },
      3
    );

    if (sets.length === 0) {
      return this.getBudgetById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE budgets
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapBudget(rows[0]) : null;
  }

  async deleteBudget(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async getBudgetActualSpending(userId: string, categoryId: string | null, startDate: string, endDate: string) {
    const where = [
      'user_id = $1',
      "transaction_type = 'expense'",
      "status = 'completed'",
      'transaction_date >= $2',
      'transaction_date <= $3',
    ];
    const params: any[] = [userId, startDate, endDate];

    if (categoryId) {
      params.push(categoryId);
      where.push(`category_id = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric(15,2) AS spent
       FROM financial_transactions
       WHERE ${where.join(' AND ')}`,
      params
    );
    return Number(rows[0]?.spent) || 0;
  }

  // ---------------- GOALS & CONTRIBUTIONS ----------------
  async createGoal(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_goals (
         user_id, title, description, goal_type, target_amount, current_amount,
         currency, start_date, target_date, linked_account_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        data.title,
        data.description ?? null,
        data.goalType,
        data.targetAmount,
        data.currentAmount || 0,
        data.currency || 'INR',
        data.startDate,
        data.targetDate ?? null,
        data.linkedAccountId ?? null,
        data.status || 'active',
      ]
    );
    return mapGoal(rows[0]);
  }

  async getGoalById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT g.*, a.name AS linked_account_name
       FROM financial_goals g
       LEFT JOIN financial_accounts a ON a.id = g.linked_account_id
       WHERE g.id = $1 AND g.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapGoal(rows[0]) : null;
  }

  async listGoals(userId: string, status?: string) {
    const where: string[] = ['g.user_id = $1'];
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      where.push(`g.status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT g.*, a.name AS linked_account_name
       FROM financial_goals g
       LEFT JOIN financial_accounts a ON a.id = g.linked_account_id
       WHERE ${where.join(' AND ')}
       ORDER BY g.status ASC, g.target_date ASC NULLS LAST, g.title ASC`,
      params
    );
    return rows.map(mapGoal);
  }

  async updateGoal(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        title: 'title',
        description: 'description',
        goalType: 'goal_type',
        targetAmount: 'target_amount',
        currentAmount: 'current_amount',
        currency: 'currency',
        startDate: 'start_date',
        targetDate: 'target_date',
        linkedAccountId: 'linked_account_id',
        status: 'status',
      },
      3
    );

    if (sets.length === 0) {
      return this.getGoalById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE financial_goals
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapGoal(rows[0]) : null;
  }

  async deleteGoal(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM financial_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async createGoalContribution(db: Queryable, userId: string, goalId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_goal_contributions (
         user_id, goal_id, transaction_id, amount, contribution_date, notes
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        goalId,
        data.transactionId ?? null,
        data.amount,
        data.contributionDate,
        data.notes ?? null,
      ]
    );
    return mapContribution(rows[0]);
  }

  async listGoalContributions(userId: string, goalId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM financial_goal_contributions
       WHERE user_id = $1 AND goal_id = $2
       ORDER BY contribution_date DESC, created_at DESC`,
      [userId, goalId]
    );
    return rows.map(mapContribution);
  }

  async deleteGoalContribution(userId: string, contributionId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `DELETE FROM financial_goal_contributions
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [contributionId, userId]
    );
    return rows[0] ? mapContribution(rows[0]) : null;
  }

  // ---------------- EMERGENCY FUND ----------------
  async getEmergencyFundSettings(userId: string) {
    const { rows } = await pool.query(
      `SELECT e.*, a.name AS linked_account_name, a.current_balance AS linked_account_balance
       FROM emergency_fund_settings e
       LEFT JOIN financial_accounts a ON a.id = e.linked_account_id
       WHERE e.user_id = $1`,
      [userId]
    );
    return rows[0]
      ? {
          ...rows[0],
          target_months: toNumberOrNull(rows[0].target_months),
          target_amount: toNumberOrNull(rows[0].target_amount),
          linked_account_balance: toNumberOrNull(rows[0].linked_account_balance),
        }
      : null;
  }

  async upsertEmergencyFundSettings(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO emergency_fund_settings (
         user_id, target_months, target_amount, linked_account_id, updated_at
       ) VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         target_months = EXCLUDED.target_months,
         target_amount = EXCLUDED.target_amount,
         linked_account_id = EXCLUDED.linked_account_id,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        data.targetMonths ?? 6.0,
        data.targetAmount ?? null,
        data.linkedAccountId ?? null,
      ]
    );
    return rows[0];
  }

  async getMonthlyExpensesPastMonths(userId: string, daysLookback: number = 90) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)::numeric(15,2) AS total_expense,
         COUNT(DISTINCT transaction_date)::int AS distinct_active_days
       FROM financial_transactions
       WHERE user_id = $1 AND transaction_type = 'expense' AND status = 'completed'
         AND transaction_date >= (CURRENT_DATE - $2::integer)`,
      [userId, daysLookback]
    );
    const total = Number(rows[0]?.total_expense) || 0;
    const months = daysLookback / 30;
    return total > 0 ? Number((total / months).toFixed(2)) : 0;
  }

  // ---------------- NET WORTH & SNAPSHOTS ----------------
  async getNetWorthAssetsAndLiabilities(userId: string) {
    // Assets from non-liability accounts (bank, cash, wallet, mutual_funds, sips, fixed_deposits, etc.)
    const { rows: accountRows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0)::numeric(15,2) AS accounts_asset,
         COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0)::numeric(15,2) AS accounts_debt
       FROM financial_accounts
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Assets from investment holdings
    const { rows: holdingRows } = await pool.query(
      `SELECT
         COALESCE(SUM(COALESCE(current_value, invested_amount)), 0)::numeric(15,2) AS investments_value
       FROM investment_holdings
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Liabilities from financial_liabilities
    const { rows: liabilityRows } = await pool.query(
      `SELECT
         COALESCE(SUM(outstanding_amount), 0)::numeric(15,2) AS total_liabilities
       FROM financial_liabilities
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const accountsAsset = Number(accountRows[0]?.accounts_asset) || 0;
    const accountsDebt = Number(accountRows[0]?.accounts_debt) || 0;
    const investmentsValue = Number(holdingRows[0]?.investments_value) || 0;
    const directLiabilities = Number(liabilityRows[0]?.total_liabilities) || 0;

    const totalAssets = Number((accountsAsset + investmentsValue).toFixed(2));
    const totalLiabilities = Number((directLiabilities + accountsDebt).toFixed(2));
    const netWorth = Number((totalAssets - totalLiabilities).toFixed(2));

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      breakdown: {
        accountsAsset,
        investmentsValue,
        directLiabilities,
        accountsDebt,
      },
    };
  }

  async upsertNetWorthSnapshot(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_net_worth_snapshots (
         user_id, snapshot_date, total_assets, total_liabilities, net_worth, currency
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
         total_assets = EXCLUDED.total_assets,
         total_liabilities = EXCLUDED.total_liabilities,
         net_worth = EXCLUDED.net_worth,
         currency = EXCLUDED.currency
       RETURNING *`,
      [
        userId,
        data.snapshotDate,
        data.totalAssets,
        data.totalLiabilities,
        data.netWorth,
        data.currency || 'INR',
      ]
    );
    return mapNetWorth(rows[0]);
  }

  async listNetWorthSnapshots(userId: string, limit: number = 30) {
    const { rows } = await pool.query(
      `SELECT * FROM financial_net_worth_snapshots
       WHERE user_id = $1
       ORDER BY snapshot_date DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows.map(mapNetWorth);
  }

  // ---------------- LIABILITIES ----------------
  async createLiability(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO financial_liabilities (
         user_id, name, liability_type, institution, original_amount,
         outstanding_amount, interest_rate, start_date, due_date,
         linked_account_id, status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        data.name,
        data.liabilityType,
        data.institution ?? null,
        data.originalAmount || 0,
        data.outstandingAmount ?? data.originalAmount ?? 0,
        data.interestRate ?? null,
        data.startDate,
        data.dueDate ?? null,
        data.linkedAccountId ?? null,
        data.status || 'active',
        data.notes ?? null,
      ]
    );
    return mapLiability(rows[0]);
  }

  async getLiabilityById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT l.*, a.name AS linked_account_name
       FROM financial_liabilities l
       LEFT JOIN financial_accounts a ON a.id = l.linked_account_id
       WHERE l.id = $1 AND l.user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapLiability(rows[0]) : null;
  }

  async listLiabilities(userId: string, status?: string) {
    const where: string[] = ['l.user_id = $1'];
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      where.push(`l.status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT l.*, a.name AS linked_account_name
       FROM financial_liabilities l
       LEFT JOIN financial_accounts a ON a.id = l.linked_account_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.status ASC, l.outstanding_amount DESC, l.name ASC`,
      params
    );
    return rows.map(mapLiability);
  }

  async updateLiability(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        name: 'name',
        liabilityType: 'liability_type',
        institution: 'institution',
        originalAmount: 'original_amount',
        outstandingAmount: 'outstanding_amount',
        interestRate: 'interest_rate',
        startDate: 'start_date',
        dueDate: 'due_date',
        linkedAccountId: 'linked_account_id',
        status: 'status',
        notes: 'notes',
      },
      3
    );

    if (sets.length === 0) {
      return this.getLiabilityById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE financial_liabilities
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapLiability(rows[0]) : null;
  }

  async deleteLiability(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM financial_liabilities WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- ANALYTICS & SUMMARY ----------------
  async getFinancialTotals(userId: string, startDate?: string, endDate?: string) {
    const where = ["user_id = $1 AND status = 'completed'"];
    const params: any[] = [userId];

    if (startDate) {
      params.push(startDate);
      where.push(`transaction_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`transaction_date <= $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT
         transaction_type,
         direction,
         COALESCE(SUM(amount), 0)::numeric(15,2) AS total_amount
       FROM financial_transactions
       WHERE ${where.join(' AND ')}
       GROUP BY transaction_type, direction`,
      params
    );
    return rows;
  }

  async getSpendingByCategory(userId: string, startDate?: string, endDate?: string) {
    const where = [
      't.user_id = $1',
      "t.status = 'completed'",
      "t.transaction_type = 'expense'",
    ];
    const params: any[] = [userId];

    if (startDate) {
      params.push(startDate);
      where.push(`t.transaction_date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`t.transaction_date <= $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT
         COALESCE(c.name, 'Uncategorized') AS category_name,
         c.color AS category_color,
         c.icon AS category_icon,
         COALESCE(SUM(t.amount), 0)::numeric(15,2) AS total_amount
       FROM financial_transactions t
       LEFT JOIN financial_categories c ON c.id = t.category_id
       WHERE ${where.join(' AND ')}
       GROUP BY c.name, c.color, c.icon
       ORDER BY total_amount DESC`,
      params
    );

    return rows.map((r) => ({
      category_name: r.category_name,
      category_color: r.category_color,
      category_icon: r.category_icon,
      total_amount: Number(r.total_amount) || 0,
    }));
  }
}

export const financeRepository = new FinanceRepository();
