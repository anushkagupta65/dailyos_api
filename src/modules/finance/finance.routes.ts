import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  reconcileAccount,
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createTransaction,
  createTransfer,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  createSalary,
  getSalaries,
  getCurrentSalary,
  getSalaryById,
  updateSalary,
  deleteSalary,
  createHolding,
  getHoldings,
  getHoldingById,
  updateHolding,
  deleteHolding,
  createInvestmentTransaction,
  getInvestmentTransactions,
  deleteInvestmentTransaction,
  createRecurringPayment,
  getRecurringPayments,
  getDueRecurringPayments,
  getRecurringPaymentById,
  updateRecurringPayment,
  deleteRecurringPayment,
  recordRecurringPaymentOccurrence,
  processDueRecurringPayments,
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  createGoalContribution,
  getGoalContributions,
  deleteGoalContribution,
  getEmergencyFund,
  updateEmergencyFund,
  getNetWorth,
  takeNetWorthSnapshot,
  getNetWorthHistory,
  createLiability,
  getLiabilities,
  getLiabilityById,
  updateLiability,
  deleteLiability,
  getFinancialSummary,
} from './finance.controller';
import {
  idParamSchema,
  createAccountSchema,
  updateAccountSchema,
  accountsQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  categoriesQuerySchema,
  createTransactionSchema,
  createTransferSchema,
  updateTransactionSchema,
  transactionsQuerySchema,
  createSalarySchema,
  updateSalarySchema,
  createHoldingSchema,
  updateHoldingSchema,
  holdingsQuerySchema,
  createInvestmentTransactionSchema,
  createRecurringPaymentSchema,
  updateRecurringPaymentSchema,
  dueRecurringQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
  createGoalSchema,
  updateGoalSchema,
  createGoalContributionSchema,
  updateEmergencyFundSchema,
  createNetWorthSnapshotSchema,
  createLiabilitySchema,
  updateLiabilitySchema,
  summaryQuerySchema,
} from './finance.validation';
import { z } from 'zod';

const router = Router();

// All finance routes require authentication
router.use(authenticate);

// ---------------- SUMMARY & ANALYTICS ----------------
router.get('/summary', validate({ query: summaryQuerySchema }), getFinancialSummary);

// ---------------- ACCOUNTS ----------------
router.post('/accounts', validate({ body: createAccountSchema }), createAccount);
router.get('/accounts', validate({ query: accountsQuerySchema }), getAccounts);
router.get('/accounts/:id', validate({ params: idParamSchema }), getAccountById);
router.put('/accounts/:id', validate({ params: idParamSchema, body: updateAccountSchema }), updateAccount);
router.delete('/accounts/:id', validate({ params: idParamSchema }), deleteAccount);
router.post('/accounts/:id/reconcile', validate({ params: idParamSchema }), reconcileAccount);

// ---------------- CATEGORIES ----------------
router.post('/categories', validate({ body: createCategorySchema }), createCategory);
router.get('/categories', validate({ query: categoriesQuerySchema }), getCategories);
router.get('/categories/:id', validate({ params: idParamSchema }), getCategoryById);
router.put('/categories/:id', validate({ params: idParamSchema, body: updateCategorySchema }), updateCategory);
router.delete('/categories/:id', validate({ params: idParamSchema }), deleteCategory);

// ---------------- TRANSACTIONS ----------------
router.post('/transactions/transfer', validate({ body: createTransferSchema }), createTransfer);
router.post('/transactions', validate({ body: createTransactionSchema }), createTransaction);
router.get('/transactions', validate({ query: transactionsQuerySchema }), getTransactions);
router.get('/transactions/:id', validate({ params: idParamSchema }), getTransactionById);
router.put('/transactions/:id', validate({ params: idParamSchema, body: updateTransactionSchema }), updateTransaction);
router.delete('/transactions/:id', validate({ params: idParamSchema }), deleteTransaction);

// ---------------- SALARY ----------------
router.get('/salary/current', getCurrentSalary);
router.post('/salary', validate({ body: createSalarySchema }), createSalary);
router.get('/salary', getSalaries);
router.get('/salary/:id', validate({ params: idParamSchema }), getSalaryById);
router.put('/salary/:id', validate({ params: idParamSchema, body: updateSalarySchema }), updateSalary);
router.delete('/salary/:id', validate({ params: idParamSchema }), deleteSalary);

// ---------------- INVESTMENTS ----------------
router.post('/investments/holdings', validate({ body: createHoldingSchema }), createHolding);
router.get('/investments/holdings', validate({ query: holdingsQuerySchema }), getHoldings);
router.get('/investments/holdings/:id', validate({ params: idParamSchema }), getHoldingById);
router.put('/investments/holdings/:id', validate({ params: idParamSchema, body: updateHoldingSchema }), updateHolding);
router.delete('/investments/holdings/:id', validate({ params: idParamSchema }), deleteHolding);
router.post(
  '/investments/holdings/:id/transactions',
  validate({ params: idParamSchema, body: createInvestmentTransactionSchema }),
  createInvestmentTransaction
);
router.get('/investments/transactions', getInvestmentTransactions);
router.delete('/investments/transactions/:id', validate({ params: idParamSchema }), deleteInvestmentTransaction);

// ---------------- RECURRING PAYMENTS ----------------
router.get('/recurring-payments/due', validate({ query: dueRecurringQuerySchema }), getDueRecurringPayments);
router.post('/recurring-payments/process-due', validate({ query: dueRecurringQuerySchema }), processDueRecurringPayments);
router.post('/recurring-payments', validate({ body: createRecurringPaymentSchema }), createRecurringPayment);
router.get('/recurring-payments', getRecurringPayments);
router.get('/recurring-payments/:id', validate({ params: idParamSchema }), getRecurringPaymentById);
router.put('/recurring-payments/:id', validate({ params: idParamSchema, body: updateRecurringPaymentSchema }), updateRecurringPayment);
router.delete('/recurring-payments/:id', validate({ params: idParamSchema }), deleteRecurringPayment);
router.post('/recurring-payments/:id/record', validate({ params: idParamSchema }), recordRecurringPaymentOccurrence);

// ---------------- BUDGETS ----------------
router.post('/budgets', validate({ body: createBudgetSchema }), createBudget);
router.get('/budgets', getBudgets);
router.get('/budgets/:id', validate({ params: idParamSchema }), getBudgetById);
router.put('/budgets/:id', validate({ params: idParamSchema, body: updateBudgetSchema }), updateBudget);
router.delete('/budgets/:id', validate({ params: idParamSchema }), deleteBudget);

// ---------------- GOALS & CONTRIBUTIONS ----------------
const goalContributionParams = z.object({
  id: z.string().uuid('Invalid goal ID'),
  contributionId: z.string().uuid('Invalid contribution ID'),
});

router.post('/goals', validate({ body: createGoalSchema }), createGoal);
router.get('/goals', getGoals);
router.get('/goals/:id', validate({ params: idParamSchema }), getGoalById);
router.put('/goals/:id', validate({ params: idParamSchema, body: updateGoalSchema }), updateGoal);
router.delete('/goals/:id', validate({ params: idParamSchema }), deleteGoal);
router.post('/goals/:id/contributions', validate({ params: idParamSchema, body: createGoalContributionSchema }), createGoalContribution);
router.get('/goals/:id/contributions', validate({ params: idParamSchema }), getGoalContributions);
router.delete('/goals/:id/contributions/:contributionId', validate({ params: goalContributionParams }), deleteGoalContribution);

// ---------------- EMERGENCY FUND ----------------
router.get('/emergency-fund', getEmergencyFund);
router.put('/emergency-fund', validate({ body: updateEmergencyFundSchema }), updateEmergencyFund);

// ---------------- NET WORTH ----------------
router.get('/net-worth', getNetWorth);
router.post('/net-worth/snapshot', validate({ body: createNetWorthSnapshotSchema }), takeNetWorthSnapshot);
router.get('/net-worth/history', getNetWorthHistory);

// ---------------- LIABILITIES ----------------
router.post('/liabilities', validate({ body: createLiabilitySchema }), createLiability);
router.get('/liabilities', getLiabilities);
router.get('/liabilities/:id', validate({ params: idParamSchema }), getLiabilityById);
router.put('/liabilities/:id', validate({ params: idParamSchema, body: updateLiabilitySchema }), updateLiability);
router.delete('/liabilities/:id', validate({ params: idParamSchema }), deleteLiability);

export default router;
