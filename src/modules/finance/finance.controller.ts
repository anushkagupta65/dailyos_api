import { Request, Response, NextFunction } from 'express';
import { financeService } from './finance.service';

// ---------------- ACCOUNTS ----------------
export const createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.createAccount(req.user!.id, req.body);
    res.status(201).json({ message: 'Financial account created successfully.', account });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.getAccountById(req.user!.id, req.params.id as string);
    res.status(200).json({ account });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.updateAccount(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Financial account updated successfully.', account });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteAccount(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const reconcileAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await financeService.reconcileAccount(req.user!.id, req.params.id as string);
    res.status(200).json({ message: 'Account balance reconciled successfully.', account });
  } catch (err) {
    next(err);
  }
};

// ---------------- CATEGORIES ----------------
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.createCategory(req.user!.id, req.body);
    res.status(201).json({ message: 'Category created successfully.', category });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const categories = await financeService.listCategories(req.user!.id, query.categoryType, query.includeSystem);
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.getCategoryById(req.user!.id, req.params.id as string);
    res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await financeService.updateCategory(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Category updated successfully.', category });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteCategory(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- TRANSACTIONS ----------------
export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.createTransaction(req.user!.id, req.body);
    res.status(201).json({ message: 'Transaction created successfully.', transaction });
  } catch (err) {
    next(err);
  }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.createTransfer(req.user!.id, req.body);
    res.status(201).json({ message: 'Transfer recorded successfully.', ...result });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.getTransactionById(req.user!.id, req.params.id as string);
    res.status(200).json({ transaction });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await financeService.updateTransaction(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Transaction updated successfully.', transaction });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteTransaction(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- SALARY ----------------
export const createSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.createSalary(req.user!.id, req.body);
    res.status(201).json({ message: 'Salary record created successfully.', salary });
  } catch (err) {
    next(err);
  }
};

export const getSalaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salaries = await financeService.listSalaries(req.user!.id);
    res.status(200).json({ salaries });
  } catch (err) {
    next(err);
  }
};

export const getCurrentSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.getCurrentSalary(req.user!.id);
    res.status(200).json({ salary });
  } catch (err) {
    next(err);
  }
};

export const getSalaryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.getSalaryById(req.user!.id, req.params.id as string);
    res.status(200).json({ salary });
  } catch (err) {
    next(err);
  }
};

export const updateSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const salary = await financeService.updateSalary(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Salary record updated successfully.', salary });
  } catch (err) {
    next(err);
  }
};

export const deleteSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteSalary(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- INVESTMENTS ----------------
export const createHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.createHolding(req.user!.id, req.body);
    res.status(201).json({ message: 'Investment holding created successfully.', holding });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getHoldingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.getHoldingById(req.user!.id, req.params.id as string);
    res.status(200).json({ holding });
  } catch (err) {
    next(err);
  }
};

export const updateHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holding = await financeService.updateHolding(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Investment holding updated successfully.', holding });
  } catch (err) {
    next(err);
  }
};

export const deleteHolding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteHolding(req.user!.id, req.params.id as string);
    res.status(200).json(result);
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
    res.status(201).json({ message: 'Investment transaction recorded successfully.', transaction });
  } catch (err) {
    next(err);
  }
};

export const getInvestmentTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const holdingId = req.query.holdingId as string | undefined;
    const transactions = await financeService.listInvestmentTransactions(req.user!.id, holdingId);
    res.status(200).json({ transactions });
  } catch (err) {
    next(err);
  }
};

export const deleteInvestmentTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteInvestmentTransaction(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- RECURRING PAYMENTS ----------------
export const createRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.createRecurringPayment(req.user!.id, req.body);
    res.status(201).json({ message: 'Recurring payment created successfully.', recurringPayment });
  } catch (err) {
    next(err);
  }
};

export const getRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayments = await financeService.listRecurringPayments(req.user!.id);
    res.status(200).json({ recurringPayments });
  } catch (err) {
    next(err);
  }
};

export const getDueRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const duePayments = await financeService.getDueRecurringPayments(req.user!.id, query.asOfDate);
    res.status(200).json({ duePayments });
  } catch (err) {
    next(err);
  }
};

export const getRecurringPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.getRecurringPaymentById(req.user!.id, req.params.id as string);
    res.status(200).json({ recurringPayment });
  } catch (err) {
    next(err);
  }
};

export const updateRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recurringPayment = await financeService.updateRecurringPayment(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Recurring payment updated successfully.', recurringPayment });
  } catch (err) {
    next(err);
  }
};

export const deleteRecurringPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteRecurringPayment(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const recordRecurringPaymentOccurrence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.recordRecurringPaymentOccurrence(req.user!.id, req.params.id as string);
    res.status(201).json({ message: 'Recurring payment occurrence recorded successfully.', ...result });
  } catch (err) {
    next(err);
  }
};

export const processDueRecurringPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await financeService.processDueRecurringPayments(req.user!.id, query?.asOfDate);
    res.status(200).json({ message: 'Processed due recurring payments successfully.', ...result });
  } catch (err) {
    next(err);
  }
};

// ---------------- BUDGETS ----------------
export const createBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.createBudget(req.user!.id, req.body);
    res.status(201).json({ message: 'Budget created successfully.', budget });
  } catch (err) {
    next(err);
  }
};

export const getBudgets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budgets = await financeService.listBudgets(req.user!.id);
    res.status(200).json({ budgets });
  } catch (err) {
    next(err);
  }
};

export const getBudgetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.getBudgetById(req.user!.id, req.params.id as string);
    res.status(200).json({ budget });
  } catch (err) {
    next(err);
  }
};

export const updateBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const budget = await financeService.updateBudget(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Budget updated successfully.', budget });
  } catch (err) {
    next(err);
  }
};

export const deleteBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteBudget(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- GOALS & CONTRIBUTIONS ----------------
export const createGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.createGoal(req.user!.id, req.body);
    res.status(201).json({ message: 'Financial goal created successfully.', goal });
  } catch (err) {
    next(err);
  }
};

export const getGoals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const goals = await financeService.listGoals(req.user!.id, status);
    res.status(200).json({ goals });
  } catch (err) {
    next(err);
  }
};

export const getGoalById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.getGoalById(req.user!.id, req.params.id as string);
    res.status(200).json({ goal });
  } catch (err) {
    next(err);
  }
};

export const updateGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const goal = await financeService.updateGoal(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Financial goal updated successfully.', goal });
  } catch (err) {
    next(err);
  }
};

export const deleteGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteGoal(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createGoalContribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contribution = await financeService.addGoalContribution(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({ message: 'Contribution added successfully.', contribution });
  } catch (err) {
    next(err);
  }
};

export const getGoalContributions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contributions = await financeService.listGoalContributions(req.user!.id, req.params.id as string);
    res.status(200).json({ contributions });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- EMERGENCY FUND ----------------
export const getEmergencyFund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await financeService.getEmergencyFund(req.user!.id);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const updateEmergencyFund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await financeService.updateEmergencyFund(req.user!.id, req.body);
    res.status(200).json({ message: 'Emergency fund settings updated successfully.', ...data });
  } catch (err) {
    next(err);
  }
};

// ---------------- NET WORTH ----------------
export const getNetWorth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const netWorth = await financeService.getNetWorth(req.user!.id);
    res.status(200).json(netWorth);
  } catch (err) {
    next(err);
  }
};

export const takeNetWorthSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const snapshot = await financeService.takeNetWorthSnapshot(req.user!.id, req.body?.snapshotDate);
    res.status(201).json({ message: 'Net worth snapshot recorded successfully.', snapshot });
  } catch (err) {
    next(err);
  }
};

export const getNetWorthHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 30;
    const history = await financeService.listNetWorthHistory(req.user!.id, limit);
    res.status(200).json({ history });
  } catch (err) {
    next(err);
  }
};

// ---------------- LIABILITIES ----------------
export const createLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.createLiability(req.user!.id, req.body);
    res.status(201).json({ message: 'Liability record created successfully.', liability });
  } catch (err) {
    next(err);
  }
};

export const getLiabilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const liabilities = await financeService.listLiabilities(req.user!.id, status);
    res.status(200).json({ liabilities });
  } catch (err) {
    next(err);
  }
};

export const getLiabilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.getLiabilityById(req.user!.id, req.params.id as string);
    res.status(200).json({ liability });
  } catch (err) {
    next(err);
  }
};

export const updateLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const liability = await financeService.updateLiability(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Liability record updated successfully.', liability });
  } catch (err) {
    next(err);
  }
};

export const deleteLiability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await financeService.deleteLiability(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- SUMMARY & ANALYTICS ----------------
export const getFinancialSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const summary = await financeService.getFinancialSummary(req.user!.id, query.startDate, query.endDate);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};
