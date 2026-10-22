import { withTransaction } from '../../config/database';
import { financeRepository } from './finance.repository';
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from '../../utils/date';
import crypto from 'node:crypto';

const advanceDueDate = (currentDueDate: string, frequency: string, intervalValue: number = 1): string => {
  const d = new Date(`${currentDueDate}T00:00:00.000Z`);
  const interval = Math.max(1, intervalValue);

  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + interval);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + interval * 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + interval);
      break;
    case 'quarterly':
      d.setUTCMonth(d.getUTCMonth() + interval * 3);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + interval);
      break;
    default:
      d.setUTCDate(d.getUTCDate() + interval);
      break;
  }
  return d.toISOString().slice(0, 10);
};

export class FinanceService {
  // ---------------- ACCOUNTS ----------------
  async createAccount(userId: string, data: any) {
    return withTransaction(async (client) => {
      const account = await financeRepository.createAccount(client, userId, data);
      return account;
    });
  }

  async getAccountById(userId: string, id: string) {
    const account = await financeRepository.getAccountById(userId, id);
    if (!account) {
      throw { status: 404, message: 'Financial account not found.' };
    }
    return account;
  }

  async listAccounts(userId: string, filters: any) {
    return financeRepository.listAccounts(userId, filters);
  }

  async updateAccount(userId: string, id: string, data: any) {
    await this.getAccountById(userId, id);
    return withTransaction(async (client) => {
      const updated = await financeRepository.updateAccount(client, userId, id, data);
      if (data.openingBalance !== undefined) {
        return financeRepository.reconcileAccountBalance(client, userId, id);
      }
      return updated;
    });
  }

  async deleteAccount(userId: string, id: string) {
    await this.getAccountById(userId, id);
    await financeRepository.deleteAccount(userId, id);
    return { success: true, message: 'Account deleted successfully.' };
  }

  async reconcileAccount(userId: string, id: string) {
    await this.getAccountById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.reconcileAccountBalance(client, userId, id);
    });
  }

  // ---------------- CATEGORIES ----------------
  async createCategory(userId: string, data: any) {
    return withTransaction(async (client) => {
      return financeRepository.createCategory(client, userId, data);
    });
  }

  async getCategoryById(userId: string, id: string) {
    const category = await financeRepository.getCategoryById(userId, id);
    if (!category) {
      throw { status: 404, message: 'Category not found.' };
    }
    return category;
  }

  async listCategories(userId: string, categoryType?: string, includeSystem: boolean = true) {
    return financeRepository.listCategories(userId, categoryType, includeSystem);
  }

  async updateCategory(userId: string, id: string, data: any) {
    const category = await this.getCategoryById(userId, id);
    if (category.is_system) {
      throw { status: 403, message: 'System categories cannot be modified.' };
    }
    return withTransaction(async (client) => {
      return financeRepository.updateCategory(client, userId, id, data);
    });
  }

  async deleteCategory(userId: string, id: string) {
    const category = await this.getCategoryById(userId, id);
    if (category.is_system) {
      throw { status: 403, message: 'System categories cannot be deleted.' };
    }
    await financeRepository.deleteCategory(userId, id);
    return { success: true, message: 'Category deleted successfully.' };
  }

  // ---------------- TRANSACTIONS ----------------
  async createTransaction(userId: string, data: any) {
    await this.getAccountById(userId, data.accountId);

    if (data.categoryId) {
      await this.getCategoryById(userId, data.categoryId);
    }

    return withTransaction(async (client) => {
      const tx = await financeRepository.createTransaction(client, userId, data);
      await financeRepository.reconcileAccountBalance(client, userId, data.accountId);
      return tx;
    });
  }

  async createTransfer(userId: string, data: any) {
    if (data.fromAccountId === data.toAccountId) {
      throw { status: 400, message: 'Source and destination accounts cannot be the same.' };
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.getAccountById(userId, data.fromAccountId),
      this.getAccountById(userId, data.toAccountId),
    ]);

    const transferGroupId = crypto.randomUUID();

    return withTransaction(async (client) => {
      const fromDescription = data.description || `Transfer to ${toAccount.name}`;
      const toDescription = data.description || `Transfer from ${fromAccount.name}`;

      const fromTx = await financeRepository.createTransaction(client, userId, {
        accountId: data.fromAccountId,
        destinationAccountId: data.toAccountId,
        transferGroupId,
        transactionType: 'transfer',
        direction: 'outflow',
        amount: data.amount,
        currency: data.currency || fromAccount.currency || 'INR',
        transactionDate: data.transactionDate,
        description: fromDescription,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        status: 'completed',
      });

      const toTx = await financeRepository.createTransaction(client, userId, {
        accountId: data.toAccountId,
        destinationAccountId: data.fromAccountId,
        transferGroupId,
        transactionType: 'transfer',
        direction: 'inflow',
        amount: data.amount,
        currency: data.currency || toAccount.currency || 'INR',
        transactionDate: data.transactionDate,
        description: toDescription,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        status: 'completed',
      });

      await Promise.all([
        financeRepository.reconcileAccountBalance(client, userId, data.fromAccountId),
        financeRepository.reconcileAccountBalance(client, userId, data.toAccountId),
      ]);

      return {
        transferGroupId,
        outflowTransaction: fromTx,
        inflowTransaction: toTx,
      };
    });
  }

  async getTransactionById(userId: string, id: string) {
    const tx = await financeRepository.getTransactionById(userId, id);
    if (!tx) {
      throw { status: 404, message: 'Transaction not found.' };
    }
    return tx;
  }

  async listTransactions(userId: string, filters: any) {
    return financeRepository.listTransactions(userId, filters);
  }

  async updateTransaction(userId: string, id: string, data: any) {
    const existing = await this.getTransactionById(userId, id);

    return withTransaction(async (client) => {
      const updated = await financeRepository.updateTransaction(client, userId, id, data);

      await financeRepository.reconcileAccountBalance(client, userId, existing.account_id);
      if (data.accountId && data.accountId !== existing.account_id) {
        await financeRepository.reconcileAccountBalance(client, userId, data.accountId);
      }

      return updated;
    });
  }

  async deleteTransaction(userId: string, id: string) {
    const existing = await this.getTransactionById(userId, id);

    return withTransaction(async (client) => {
      // If this transaction belongs to a transfer group, delete the counterpart too
      if (existing.transfer_group_id) {
        const groupTxs = await financeRepository.getTransactionsByTransferGroup(userId, existing.transfer_group_id, client);
        for (const t of groupTxs) {
          await financeRepository.deleteTransaction(userId, t.id, client);
          await financeRepository.reconcileAccountBalance(client, userId, t.account_id);
        }
      } else {
        await financeRepository.deleteTransaction(userId, id, client);
        await financeRepository.reconcileAccountBalance(client, userId, existing.account_id);
      }
      return { success: true, message: 'Transaction deleted successfully.' };
    });
  }

  // ---------------- SALARY ----------------
  async createSalary(userId: string, data: any) {
    return withTransaction(async (client) => {
      // Find current active salary and close its effective_until if open
      const current = await financeRepository.getCurrentSalary(userId);
      if (current && (!current.effective_until || current.effective_until >= data.effectiveFrom)) {
        const dayBefore = addDays(data.effectiveFrom, -1);
        if (dayBefore >= current.effective_from) {
          await financeRepository.updateSalary(client, userId, current.id, {
            effectiveUntil: dayBefore,
          });
        }
      }
      return financeRepository.createSalary(client, userId, data);
    });
  }

  async listSalaries(userId: string) {
    return financeRepository.listSalaries(userId);
  }

  async getCurrentSalary(userId: string) {
    const salary = await financeRepository.getCurrentSalary(userId);
    return salary || null;
  }

  async getSalaryById(userId: string, id: string) {
    const salary = await financeRepository.getSalaryById(userId, id);
    if (!salary) {
      throw { status: 404, message: 'Salary record not found.' };
    }
    return salary;
  }

  async updateSalary(userId: string, id: string, data: any) {
    await this.getSalaryById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateSalary(client, userId, id, data);
    });
  }

  async deleteSalary(userId: string, id: string) {
    await this.getSalaryById(userId, id);
    await financeRepository.deleteSalary(userId, id);
    return { success: true, message: 'Salary record deleted successfully.' };
  }

  // ---------------- INVESTMENTS ----------------
  async createHolding(userId: string, data: any) {
    if (data.accountId) {
      await this.getAccountById(userId, data.accountId);
    }
    return withTransaction(async (client) => {
      return financeRepository.createHolding(client, userId, data);
    });
  }

  async getHoldingById(userId: string, id: string) {
    const holding = await financeRepository.getHoldingById(userId, id);
    if (!holding) {
      throw { status: 404, message: 'Investment holding not found.' };
    }
    const transactions = await financeRepository.listInvestmentTransactions(userId, id);

    const invested = holding.invested_amount || 0;
    const currentVal = holding.current_value !== null ? holding.current_value : invested;
    const unrealizedGainLoss = Number((currentVal - invested).toFixed(2));
    const returnsPercentage = invested > 0 ? Number(((unrealizedGainLoss / invested) * 100).toFixed(2)) : 0;

    return {
      ...holding,
      unrealized_gain_loss: unrealizedGainLoss,
      returns_percentage: returnsPercentage,
      transactions,
    };
  }

  async listHoldings(userId: string, filters: any) {
    const result = await financeRepository.listHoldings(userId, filters);
    const enrichedHoldings = result.holdings.map((h: any) => {
      const invested = h.invested_amount || 0;
      const currentVal = h.current_value !== null ? h.current_value : invested;
      const unrealizedGainLoss = Number((currentVal - invested).toFixed(2));
      const returnsPercentage = invested > 0 ? Number(((unrealizedGainLoss / invested) * 100).toFixed(2)) : 0;
      return {
        ...h,
        unrealized_gain_loss: unrealizedGainLoss,
        returns_percentage: returnsPercentage,
      };
    });
    return {
      holdings: enrichedHoldings,
      pagination: result.pagination,
    };
  }

  async updateHolding(userId: string, id: string, data: any) {
    await this.getHoldingById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateHolding(client, userId, id, data);
    });
  }

  async deleteHolding(userId: string, id: string) {
    await this.getHoldingById(userId, id);
    await financeRepository.deleteHolding(userId, id);
    return { success: true, message: 'Holding deleted successfully.' };
  }

  async addInvestmentTransaction(userId: string, holdingId: string, data: any) {
    const holding = await this.getHoldingById(userId, holdingId);

    return withTransaction(async (client) => {
      const tx = await financeRepository.createInvestmentTransaction(client, userId, holdingId, data);

      // Adjust holding units, invested amount, and current value
      let newInvested = Number(holding.invested_amount) || 0;
      let newUnits = holding.units !== null ? Number(holding.units) : null;
      let newCurrentVal = holding.current_value !== null ? Number(holding.current_value) : null;

      if (['purchase', 'contribution'].includes(data.transactionType)) {
        newInvested += Number(data.amount);
        if (data.units && newUnits !== null) newUnits += Number(data.units);
        else if (data.units) newUnits = Number(data.units);
      } else if (data.transactionType === 'redemption') {
        newInvested = Math.max(0, newInvested - Number(data.amount));
        if (data.units && newUnits !== null) newUnits = Math.max(0, newUnits - Number(data.units));
      }

      if (newUnits !== null && data.navOrPrice) {
        newCurrentVal = Number((newUnits * Number(data.navOrPrice)).toFixed(2));
      }

      await financeRepository.updateHolding(client, userId, holdingId, {
        investedAmount: newInvested,
        units: newUnits,
        currentValue: newCurrentVal,
      });

      return tx;
    });
  }

  async listInvestmentTransactions(userId: string, holdingId?: string) {
    return financeRepository.listInvestmentTransactions(userId, holdingId);
  }

  async deleteInvestmentTransaction(userId: string, id: string) {
    await financeRepository.deleteInvestmentTransaction(userId, id);
    return { success: true, message: 'Investment transaction deleted successfully.' };
  }

  // ---------------- RECURRING PAYMENTS ----------------
  async createRecurringPayment(userId: string, data: any) {
    if (data.accountId) {
      await this.getAccountById(userId, data.accountId);
    }
    if (data.categoryId) {
      await this.getCategoryById(userId, data.categoryId);
    }
    return withTransaction(async (client) => {
      return financeRepository.createRecurringPayment(client, userId, data);
    });
  }

  async getRecurringPaymentById(userId: string, id: string) {
    const rec = await financeRepository.getRecurringPaymentById(userId, id);
    if (!rec) {
      throw { status: 404, message: 'Recurring payment not found.' };
    }
    return rec;
  }

  async listRecurringPayments(userId: string) {
    return financeRepository.listRecurringPayments(userId);
  }

  async getDueRecurringPayments(userId: string, asOfDate?: string) {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    return financeRepository.getDueRecurringPayments(userId, targetDate);
  }

  async updateRecurringPayment(userId: string, id: string, data: any) {
    await this.getRecurringPaymentById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateRecurringPayment(client, userId, id, data);
    });
  }

  async deleteRecurringPayment(userId: string, id: string) {
    await this.getRecurringPaymentById(userId, id);
    await financeRepository.deleteRecurringPayment(userId, id);
    return { success: true, message: 'Recurring payment deleted successfully.' };
  }

  async recordRecurringPaymentOccurrence(userId: string, id: string) {
    const rec = await this.getRecurringPaymentById(userId, id);
    if (rec.status !== 'active') {
      throw { status: 400, message: 'Cannot record occurrence for non-active recurring payment.' };
    }

    if (!rec.account_id) {
      throw { status: 400, message: 'Recurring payment requires a linked account to generate a transaction.' };
    }

    return withTransaction(async (client) => {
      // Prevent duplicate transaction for the same recurring payment and due date
      const { rows: dupCheck } = await client.query(
        `SELECT id FROM financial_transactions
         WHERE recurring_payment_id = $1 AND transaction_date = $2 AND status != 'cancelled'`,
        [rec.id, rec.next_due_date]
      );

      if (dupCheck.length > 0) {
        throw {
          status: 409,
          message: `A transaction has already been recorded for this recurring payment on ${rec.next_due_date}.`,
        };
      }

      const tx = await financeRepository.createTransaction(client, userId, {
        accountId: rec.account_id,
        categoryId: rec.category_id,
        recurringPaymentId: rec.id,
        transactionType: rec.payment_type,
        amount: rec.amount,
        currency: 'INR',
        transactionDate: rec.next_due_date,
        description: `Recurring payment: ${rec.name}`,
        notes: rec.notes,
        status: 'completed',
      });

      await financeRepository.reconcileAccountBalance(client, userId, rec.account_id);

      // Advance next_due_date
      const nextDue = advanceDueDate(rec.next_due_date, rec.frequency, rec.interval_value);
      const isPastEnd = rec.end_date && nextDue > rec.end_date;

      await financeRepository.updateRecurringPayment(client, userId, id, {
        nextDueDate: nextDue,
        status: isPastEnd ? 'completed' : 'active',
      });

      return {
        transaction: tx,
        next_due_date: nextDue,
        status: isPastEnd ? 'completed' : 'active',
      };
    });
  }

  async processDueRecurringPayments(userId: string, asOfDate?: string) {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const duePayments = await financeRepository.getDueRecurringPayments(userId, targetDate);
    const autoRecordPayments = duePayments.filter((p: any) => p.auto_record && p.account_id);

    const generated = [];
    for (const p of autoRecordPayments) {
      try {
        const res = await this.recordRecurringPaymentOccurrence(userId, p.id);
        generated.push({ id: p.id, name: p.name, transaction: res.transaction });
      } catch (e) {
        // Skip already processed or errored
      }
    }

    return {
      processedCount: generated.length,
      records: generated,
    };
  }

  // ---------------- BUDGETS ----------------
  async createBudget(userId: string, data: any) {
    if (data.categoryId) {
      await this.getCategoryById(userId, data.categoryId);
    }
    return withTransaction(async (client) => {
      return financeRepository.createBudget(client, userId, data);
    });
  }

  async getBudgetById(userId: string, id: string) {
    const budget = await financeRepository.getBudgetById(userId, id);
    if (!budget) {
      throw { status: 404, message: 'Budget not found.' };
    }

    const { startDate, endDate } = this.resolveBudgetPeriodRange(budget);
    const spent = await financeRepository.getBudgetActualSpending(userId, budget.category_id, startDate, endDate);
    const budgetAmount = Number(budget.budget_amount);
    const remaining = Number((budgetAmount - spent).toFixed(2));
    const percentageUsed = budgetAmount > 0 ? Number(((spent / budgetAmount) * 100).toFixed(1)) : 0;
    const isExceeded = spent > budgetAmount;
    const isAlert = percentageUsed >= Number(budget.alert_threshold);

    return {
      ...budget,
      utilization: {
        startDate,
        endDate,
        spent,
        remaining,
        percentage_used: percentageUsed,
        is_exceeded: isExceeded,
        is_alert: isAlert,
      },
    };
  }

  private resolveBudgetPeriodRange(budget: any): { startDate: string; endDate: string } {
    if (budget.start_date && budget.end_date) {
      return { startDate: budget.start_date, endDate: budget.end_date };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (budget.period === 'weekly') {
      return { startDate: startOfWeek(today), endDate: endOfWeek(today) };
    }
    return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
  }

  async listBudgets(userId: string) {
    const budgets = await financeRepository.listBudgets(userId);
    const enriched = await Promise.all(
      budgets.map(async (b: any) => {
        const { startDate, endDate } = this.resolveBudgetPeriodRange(b);
        const spent = await financeRepository.getBudgetActualSpending(userId, b.category_id, startDate, endDate);
        const budgetAmount = Number(b.budget_amount);
        const remaining = Number((budgetAmount - spent).toFixed(2));
        const percentageUsed = budgetAmount > 0 ? Number(((spent / budgetAmount) * 100).toFixed(1)) : 0;
        return {
          ...b,
          utilization: {
            startDate,
            endDate,
            spent,
            remaining,
            percentage_used: percentageUsed,
            is_exceeded: spent > budgetAmount,
            is_alert: percentageUsed >= Number(b.alert_threshold),
          },
        };
      })
    );
    return enriched;
  }

  async updateBudget(userId: string, id: string, data: any) {
    await this.getBudgetById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateBudget(client, userId, id, data);
    });
  }

  async deleteBudget(userId: string, id: string) {
    await this.getBudgetById(userId, id);
    await financeRepository.deleteBudget(userId, id);
    return { success: true, message: 'Budget deleted successfully.' };
  }

  // ---------------- GOALS & CONTRIBUTIONS ----------------
  async createGoal(userId: string, data: any) {
    if (data.linkedAccountId) {
      await this.getAccountById(userId, data.linkedAccountId);
    }
    return withTransaction(async (client) => {
      return financeRepository.createGoal(client, userId, data);
    });
  }

  async getGoalById(userId: string, id: string) {
    const goal = await financeRepository.getGoalById(userId, id);
    if (!goal) {
      throw { status: 404, message: 'Financial goal not found.' };
    }
    const contributions = await financeRepository.listGoalContributions(userId, id);
    const target = Number(goal.target_amount) || 0;
    const current = Number(goal.current_amount) || 0;
    const remaining = Math.max(0, Number((target - current).toFixed(2)));
    const percentage = target > 0 ? Number(((current / target) * 100).toFixed(1)) : 0;

    return {
      ...goal,
      remaining_amount: remaining,
      progress_percentage: percentage,
      contributions,
    };
  }

  async listGoals(userId: string, status?: string) {
    const goals = await financeRepository.listGoals(userId, status);
    return goals.map((g: any) => {
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      return {
        ...g,
        remaining_amount: Math.max(0, Number((target - current).toFixed(2))),
        progress_percentage: target > 0 ? Number(((current / target) * 100).toFixed(1)) : 0,
      };
    });
  }

  async updateGoal(userId: string, id: string, data: any) {
    await this.getGoalById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateGoal(client, userId, id, data);
    });
  }

  async deleteGoal(userId: string, id: string) {
    await this.getGoalById(userId, id);
    await financeRepository.deleteGoal(userId, id);
    return { success: true, message: 'Financial goal deleted successfully.' };
  }

  async addGoalContribution(userId: string, goalId: string, data: any) {
    const goal = await this.getGoalById(userId, goalId);

    return withTransaction(async (client) => {
      const contribution = await financeRepository.createGoalContribution(client, userId, goalId, data);
      const newCurrent = Number((Number(goal.current_amount) + Number(data.amount)).toFixed(2));
      const isCompleted = newCurrent >= Number(goal.target_amount);

      await financeRepository.updateGoal(client, userId, goalId, {
        currentAmount: newCurrent,
        status: isCompleted ? 'completed' : goal.status,
      });

      return contribution;
    });
  }

  async listGoalContributions(userId: string, goalId: string) {
    await this.getGoalById(userId, goalId);
    return financeRepository.listGoalContributions(userId, goalId);
  }

  async deleteGoalContribution(userId: string, goalId: string, contributionId: string) {
    const goal = await this.getGoalById(userId, goalId);

    return withTransaction(async (client) => {
      const deleted = await financeRepository.deleteGoalContribution(userId, contributionId, client);
      if (deleted) {
        const newCurrent = Math.max(0, Number((Number(goal.current_amount) - Number(deleted.amount)).toFixed(2)));
        await financeRepository.updateGoal(client, userId, goalId, {
          currentAmount: newCurrent,
        });
      }
      return { success: true, message: 'Contribution deleted successfully.' };
    });
  }

  // ---------------- EMERGENCY FUND ----------------
  async getEmergencyFund(userId: string) {
    let settings = await financeRepository.getEmergencyFundSettings(userId);
    if (!settings) {
      settings = await withTransaction(async (client) => {
        return financeRepository.upsertEmergencyFundSettings(client, userId, {
          targetMonths: 6.0,
        });
      });
      settings = await financeRepository.getEmergencyFundSettings(userId);
    }

    const avgMonthlyExpense = await financeRepository.getMonthlyExpensesPastMonths(userId, 90);
    const targetMonths = Number(settings.target_months) || 6.0;
    const calculatedTarget = Number((avgMonthlyExpense * targetMonths).toFixed(2));
    const effectiveTarget = settings.target_amount !== null ? Number(settings.target_amount) : calculatedTarget;

    let currentBalance = 0;
    if (settings.linked_account_id && settings.linked_account_balance !== null) {
      currentBalance = Number(settings.linked_account_balance);
    } else {
      // Find emergency fund goals or savings accounts
      const goals = await financeRepository.listGoals(userId, 'active');
      const efGoal = goals.find((g: any) => g.goal_type === 'emergency_fund');
      if (efGoal) {
        currentBalance = Number(efGoal.current_amount);
      }
    }

    const progressPercentage = effectiveTarget > 0 ? Number(((currentBalance / effectiveTarget) * 100).toFixed(1)) : 0;
    const monthsCovered = avgMonthlyExpense > 0 ? Number((currentBalance / avgMonthlyExpense).toFixed(1)) : 0;

    return {
      settings,
      baseline: {
        average_monthly_expense: avgMonthlyExpense,
        lookback_period_days: 90,
        recommended_target: calculatedTarget,
      },
      progress: {
        effective_target: effectiveTarget,
        current_balance: currentBalance,
        progress_percentage: progressPercentage,
        months_covered: monthsCovered,
      },
    };
  }

  async updateEmergencyFund(userId: string, data: any) {
    if (data.linkedAccountId) {
      await this.getAccountById(userId, data.linkedAccountId);
    }
    await withTransaction(async (client) => {
      await financeRepository.upsertEmergencyFundSettings(client, userId, data);
    });
    return this.getEmergencyFund(userId);
  }

  // ---------------- NET WORTH & SNAPSHOTS ----------------
  async getNetWorth(userId: string) {
    return financeRepository.getNetWorthAssetsAndLiabilities(userId);
  }

  async takeNetWorthSnapshot(userId: string, snapshotDate?: string) {
    const date = snapshotDate || new Date().toISOString().slice(0, 10);
    const nw = await financeRepository.getNetWorthAssetsAndLiabilities(userId);

    return withTransaction(async (client) => {
      return financeRepository.upsertNetWorthSnapshot(client, userId, {
        snapshotDate: date,
        totalAssets: nw.totalAssets,
        totalLiabilities: nw.totalLiabilities,
        netWorth: nw.netWorth,
        currency: 'INR',
      });
    });
  }

  async listNetWorthHistory(userId: string, limit: number = 30) {
    return financeRepository.listNetWorthSnapshots(userId, limit);
  }

  // ---------------- LIABILITIES ----------------
  async createLiability(userId: string, data: any) {
    if (data.linkedAccountId) {
      await this.getAccountById(userId, data.linkedAccountId);
    }
    return withTransaction(async (client) => {
      return financeRepository.createLiability(client, userId, data);
    });
  }

  async getLiabilityById(userId: string, id: string) {
    const liability = await financeRepository.getLiabilityById(userId, id);
    if (!liability) {
      throw { status: 404, message: 'Liability record not found.' };
    }
    return liability;
  }

  async listLiabilities(userId: string, status?: string) {
    return financeRepository.listLiabilities(userId, status);
  }

  async updateLiability(userId: string, id: string, data: any) {
    await this.getLiabilityById(userId, id);
    return withTransaction(async (client) => {
      return financeRepository.updateLiability(client, userId, id, data);
    });
  }

  async deleteLiability(userId: string, id: string) {
    await this.getLiabilityById(userId, id);
    await financeRepository.deleteLiability(userId, id);
    return { success: true, message: 'Liability record deleted successfully.' };
  }

  // ---------------- SUMMARY & ANALYTICS ----------------
  async getFinancialSummary(userId: string, startDate?: string, endDate?: string) {
    const [totalsRows, categorySpending, accountsResult, holdingsResult, liabilities, netWorth] =
      await Promise.all([
        financeRepository.getFinancialTotals(userId, startDate, endDate),
        financeRepository.getSpendingByCategory(userId, startDate, endDate),
        financeRepository.listAccounts(userId, { limit: 100, page: 1, isActive: true }),
        financeRepository.listHoldings(userId, { limit: 100, page: 1, status: 'active' }),
        financeRepository.listLiabilities(userId, 'active'),
        financeRepository.getNetWorthAssetsAndLiabilities(userId),
      ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalInvestment = 0;
    let totalSavings = 0;

    for (const r of totalsRows) {
      const amt = Number(r.total_amount) || 0;
      if (r.transaction_type === 'income' && r.direction === 'inflow') {
        totalIncome += amt;
      } else if (r.transaction_type === 'expense' && r.direction === 'outflow') {
        totalExpense += amt;
      } else if (r.transaction_type === 'investment' && r.direction === 'outflow') {
        totalInvestment += amt;
      } else if (r.transaction_type === 'savings' && r.direction === 'outflow') {
        totalSavings += amt;
      }
    }

    const netCashFlow = Number((totalIncome - totalExpense).toFixed(2));
    const savingsRate =
      totalIncome > 0
        ? Number((((totalSavings + totalInvestment + (netCashFlow > 0 ? netCashFlow : 0)) / totalIncome) * 100).toFixed(1))
        : 0;

    // Investment summary
    let totalInvested = 0;
    let totalCurrentValue = 0;
    for (const h of holdingsResult.holdings) {
      const inv = Number(h.invested_amount) || 0;
      const cv = h.current_value !== null ? Number(h.current_value) : inv;
      totalInvested += inv;
      totalCurrentValue += cv;
    }
    const unrealizedGain = Number((totalCurrentValue - totalInvested).toFixed(2));

    // Category percentage
    const categoryBreakdown = categorySpending.map((c) => ({
      ...c,
      percentage: totalExpense > 0 ? Number(((c.total_amount / totalExpense) * 100).toFixed(1)) : 0,
    }));

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      overview: {
        total_income: Number(totalIncome.toFixed(2)),
        total_expense: Number(totalExpense.toFixed(2)),
        net_cash_flow: netCashFlow,
        total_investments_contributed: Number(totalInvestment.toFixed(2)),
        total_savings_transferred: Number(totalSavings.toFixed(2)),
        savings_rate_percentage: savingsRate,
      },
      category_spending: categoryBreakdown,
      accounts: {
        total_balance: accountsResult.accounts.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0),
        items: accountsResult.accounts,
      },
      investments: {
        total_invested: Number(totalInvested.toFixed(2)),
        total_current_value: Number(totalCurrentValue.toFixed(2)),
        unrealized_gain: unrealizedGain,
        items: holdingsResult.holdings,
      },
      liabilities: {
        total_outstanding: liabilities.reduce((sum: number, l: any) => sum + (l.outstanding_amount || 0), 0),
        items: liabilities,
      },
      net_worth: netWorth,
    };
  }
}

export const financeService = new FinanceService();
