import { Request, Response, NextFunction } from 'express';
import { financeService } from './finance.service';
import { sendSuccess } from '../../utils/response';

// ---------------- ACCOUNTS ----------------
export const createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.createAccount(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Financial account created successfully.',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

export const getAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await financeService.listAccounts(req.user!.id, {
      accountType: query.accountType,
      isActive: query.isActive,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Financial accounts retrieved successfully.',
      data: { accounts: result.accounts },
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.getAccountById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Financial account retrieved successfully.',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.updateAccount(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Financial account updated successfully.',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteAccount(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Financial account deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const reconcileAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.reconcileAccount(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Account balance reconciled successfully.',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- CATEGORIES ----------------
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.createCategory(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Category created successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const categories = await financeService.listCategories(req.user!.id, query.categoryType, query.includeSystem);
    sendSuccess(res, {
      status: 200,
      message: 'Categories retrieved successfully.',
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.getCategoryById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Category retrieved successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.updateCategory(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Category updated successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteCategory(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Category deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- TRANSACTIONS ----------------
export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.createTransaction(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Transaction created successfully.',
      data: { transaction },
    });
  } catch (err) {
    next(err);
  }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.createTransfer(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Transfer recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await financeService.listTransactions(req.user!.id, {
      accountId: query.accountId,
      categoryId: query.categoryId,
      transactionType: query.transactionType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Transactions retrieved successfully.',
      data: { transactions: result.transactions },
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.getTransactionById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Transaction retrieved successfully.',
      data: { transaction },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.updateTransaction(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Transaction updated successfully.',
      data: { transaction },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteTransaction(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Transaction deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- SALARY ----------------
export const createSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.createSalary(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Salary record created successfully.',
      data: { salary },
    });
  } catch (err) {
    next(err);
  }
};

export const getSalaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salaries = await financeService.listSalaries(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Salary records retrieved successfully.',
      data: { salaries },
    });
  } catch (err) {
    next(err);
  }
};

export const getCurrentSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.getCurrentSalary(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Current salary record retrieved successfully.',
      data: { salary },
    });
  } catch (err) {
    next(err);
  }
};

export const getSalaryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.getSalaryById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Salary record retrieved successfully.',
      data: { salary },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.updateSalary(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Salary record updated successfully.',
      data: { salary },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteSalary(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Salary record deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- INVESTMENTS ----------------
export const createHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.createHolding(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Investment holding created successfully.',
      data: { holding },
    });
  } catch (err) {
    next(err);
  }
};

export const getHoldings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await financeService.listHoldings(req.user!.id, {
      investmentType: query.investmentType,
      status: query.status,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Investment holdings retrieved successfully.',
      data: { holdings: result.holdings },
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getHoldingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.getHoldingById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Investment holding retrieved successfully.',
      data: { holding },
    });
  } catch (err) {
    next(err);
  }
};

export const updateHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.updateHolding(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Investment holding updated successfully.',
      data: { holding },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteHolding(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Investment holding deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const createInvestmentTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.addInvestmentTransaction(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 201,
      message: 'Investment transaction recorded successfully.',
      data: { transaction },
    });
  } catch (err) {
    next(err);
  }
};

export const getInvestmentTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holdingId = req.query.holdingId as string | undefined;
    const transactions = await financeService.listInvestmentTransactions(req.user!.id, holdingId);
    sendSuccess(res, {
      status: 200,
      message: 'Investment transactions retrieved successfully.',
      data: { transactions },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteInvestmentTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteInvestmentTransaction(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Investment transaction deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- RECURRING PAYMENTS ----------------
export const createRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.createRecurringPayment(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Recurring payment created successfully.',
      data: { recurringPayment },
    });
  } catch (err) {
    next(err);
  }
};

export const getRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayments = await financeService.listRecurringPayments(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Recurring payments retrieved successfully.',
      data: { recurringPayments },
    });
  } catch (err) {
    next(err);
  }
};

export const getDueRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const duePayments = await financeService.getDueRecurringPayments(req.user!.id, query.asOfDate);
    sendSuccess(res, {
      status: 200,
      message: 'Due recurring payments retrieved successfully.',
      data: { duePayments },
    });
  } catch (err) {
    next(err);
  }
};

export const getRecurringPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.getRecurringPaymentById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Recurring payment retrieved successfully.',
      data: { recurringPayment },
    });
  } catch (err) {
    next(err);
  }
};

export const updateRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.updateRecurringPayment(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Recurring payment updated successfully.',
      data: { recurringPayment },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteRecurringPayment(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Recurring payment deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const recordRecurringPaymentOccurrence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.recordRecurringPaymentOccurrence(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 201,
      message: 'Recurring payment occurrence recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const processDueRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await financeService.processDueRecurringPayments(req.user!.id, query?.asOfDate);
    sendSuccess(res, {
      status: 200,
      message: 'Processed due recurring payments successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- BUDGETS ----------------
export const createBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.createBudget(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Budget created successfully.',
      data: { budget },
    });
  } catch (err) {
    next(err);
  }
};

export const getBudgets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budgets = await financeService.listBudgets(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Budgets retrieved successfully.',
      data: { budgets },
    });
  } catch (err) {
    next(err);
  }
};

export const getBudgetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.getBudgetById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Budget retrieved successfully.',
      data: { budget },
    });
  } catch (err) {
    next(err);
  }
};

export const updateBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.updateBudget(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Budget updated successfully.',
      data: { budget },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteBudget(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Budget deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- GOALS & CONTRIBUTIONS ----------------
export const createGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.createGoal(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Financial goal created successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const getGoals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const goals = await financeService.listGoals(req.user!.id, status);
    sendSuccess(res, {
      status: 200,
      message: 'Financial goals retrieved successfully.',
      data: { goals },
    });
  } catch (err) {
    next(err);
  }
};

export const getGoalById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.getGoalById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Financial goal retrieved successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const updateGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.updateGoal(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Financial goal updated successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteGoal(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Financial goal deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const createGoalContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contribution = await financeService.addGoalContribution(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Contribution added successfully.',
      data: { contribution },
    });
  } catch (err) {
    next(err);
  }
};

export const getGoalContributions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contributions = await financeService.listGoalContributions(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Goal contributions retrieved successfully.',
      data: { contributions },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteGoalContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteGoalContribution(
      req.user!.id,
      req.params.id as string,
      req.params.contributionId as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Goal contribution deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- EMERGENCY FUND ----------------
export const getEmergencyFund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await financeService.getEmergencyFund(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Emergency fund settings retrieved successfully.',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateEmergencyFund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await financeService.updateEmergencyFund(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Emergency fund settings updated successfully.',
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- NET WORTH ----------------
export const getNetWorth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const netWorth = await financeService.getNetWorth(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Net worth retrieved successfully.',
      data: netWorth,
    });
  } catch (err) {
    next(err);
  }
};

export const takeNetWorthSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const snapshot = await financeService.takeNetWorthSnapshot(req.user!.id, req.body?.snapshotDate);
    sendSuccess(res, {
      status: 201,
      message: 'Net worth snapshot recorded successfully.',
      data: { snapshot },
    });
  } catch (err) {
    next(err);
  }
};

export const getNetWorthHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 30;
    const history = await financeService.listNetWorthHistory(req.user!.id, limit);
    sendSuccess(res, {
      status: 200,
      message: 'Net worth history retrieved successfully.',
      data: { history },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LIABILITIES ----------------
export const createLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.createLiability(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Liability record created successfully.',
      data: { liability },
    });
  } catch (err) {
    next(err);
  }
};

export const getLiabilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const liabilities = await financeService.listLiabilities(req.user!.id, status);
    sendSuccess(res, {
      status: 200,
      message: 'Liabilities retrieved successfully.',
      data: { liabilities },
    });
  } catch (err) {
    next(err);
  }
};

export const getLiabilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.getLiabilityById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Liability record retrieved successfully.',
      data: { liability },
    });
  } catch (err) {
    next(err);
  }
};

export const updateLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.updateLiability(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Liability record updated successfully.',
      data: { liability },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteLiability(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Liability record deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- SUMMARY & ANALYTICS ----------------
export const getFinancialSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const summary = await financeService.getFinancialSummary(req.user!.id, query.startDate, query.endDate);
    sendSuccess(res, {
      status: 200,
      message: 'Financial summary retrieved successfully.',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};
