import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { dateStringSchema } from '../commitments/commitments.validation';

export { idParamSchema };

export const accountTypeEnum = z.enum([
  'bank',
  'cash',
  'wallet',
  'kitty',
  'mutual_funds',
  'fixed_deposits',
  'sips',
  'digital_gold',
  'bonds',
  'stocks',
  'other_assets',
  'credit_card',
  'loan',
]);

export const categoryTypeEnum = z.enum(['income', 'expense', 'investment', 'savings']);
export const transactionTypeEnum = z.enum(['income', 'expense', 'investment', 'savings', 'transfer']);
export const transactionStatusEnum = z.enum(['completed', 'pending', 'cancelled']);
export const directionEnum = z.enum(['inflow', 'outflow']);
export const salaryTypeEnum = z.enum(['monthly', 'annual', 'hourly', 'other']);
export const investmentTypeEnum = z.enum([
  'mutual_funds',
  'sip',
  'fixed_deposits',
  'recurring_deposits',
  'stocks',
  'digital_gold',
  'bonds',
  'ppf',
  'epf',
  'nps',
  'real_estate',
  'other',
]);
export const holdingStatusEnum = z.enum(['active', 'matured', 'redeemed', 'sold']);
export const investmentTransactionTypeEnum = z.enum([
  'purchase',
  'contribution',
  'redemption',
  'dividend',
  'interest',
  'fee',
  'adjustment',
]);
export const frequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']);
export const recurringStatusEnum = z.enum(['active', 'paused', 'completed', 'cancelled']);
export const budgetPeriodEnum = z.enum(['weekly', 'monthly', 'quarterly', 'yearly']);
export const goalTypeEnum = z.enum([
  'savings',
  'emergency_fund',
  'investment',
  'purchase',
  'debt_repayment',
  'other',
]);
export const goalStatusEnum = z.enum(['active', 'completed', 'paused', 'cancelled']);
export const liabilityTypeEnum = z.enum([
  'loan',
  'credit_card',
  'mortgage',
  'personal_loan',
  'vehicle_loan',
  'education_loan',
  'overdraft',
  'other',
]);
export const liabilityStatusEnum = z.enum(['active', 'paid_off', 'defaulted', 'closed']);

// ---------------- ACCOUNTS ----------------
export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  institutionName: z.string().trim().max(150).nullable().optional(),
  accountType: accountTypeEnum,
  accountNumberMasked: z.string().trim().max(30).nullable().optional(),
  currency: z.string().trim().length(3).default('INR'),
  openingBalance: z.coerce.number().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const accountsQuerySchema = paginationQuerySchema.extend({
  accountType: accountTypeEnum.optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().trim().max(100).optional(),
});

// ---------------- CATEGORIES ----------------
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  categoryType: categoryTypeEnum,
  parentCategoryId: z.string().uuid('Invalid parent category ID').nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoriesQuerySchema = z.object({
  categoryType: categoryTypeEnum.optional(),
  includeSystem: z.enum(['true', 'false']).transform((v) => v === 'true').default(true),
});

// ---------------- TRANSACTIONS ----------------
export const createTransactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  recurringPaymentId: z.string().uuid('Invalid recurring payment ID').nullable().optional(),
  transactionType: transactionTypeEnum,
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().trim().length(3).default('INR'),
  transactionDate: dateStringSchema,
  direction: directionEnum.optional(),
  description: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  attachmentUrl: z.string().url('Invalid URL format').nullable().optional(),
  merchant: z.string().trim().max(200).nullable().optional(),
  paymentMethod: z.string().trim().max(50).nullable().optional(),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  status: transactionStatusEnum.default('completed'),
  originalTransactionId: z.string().uuid('Invalid original transaction ID').nullable().optional(),
});

export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid('Invalid source account ID'),
  toAccountId: z.string().uuid('Invalid destination account ID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().trim().length(3).default('INR'),
  transactionDate: dateStringSchema,
  description: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  paymentMethod: z.string().trim().max(50).nullable().optional(),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionsQuerySchema = paginationQuerySchema.extend({
  accountId: z.string().uuid('Invalid account ID').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  transactionType: transactionTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

// ---------------- SALARY ----------------
export const createSalarySchema = z.object({
  employer: z.string().trim().min(1, 'Employer is required').max(150),
  designation: z.string().trim().min(1, 'Designation is required').max(150),
  salaryType: salaryTypeEnum.default('monthly'),
  grossSalary: z.coerce.number().nonnegative('Gross salary must be non-negative'),
  netSalary: z.coerce.number().nonnegative('Net salary must be non-negative'),
  currency: z.string().trim().length(3).default('INR'),
  effectiveFrom: dateStringSchema,
  effectiveUntil: dateStringSchema.nullable().optional(),
  paymentDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateSalarySchema = createSalarySchema.partial();

// ---------------- INVESTMENTS ----------------
export const createHoldingSchema = z.object({
  accountId: z.string().uuid('Invalid account ID').nullable().optional(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  investmentType: investmentTypeEnum,
  institution: z.string().trim().max(150).nullable().optional(),
  units: z.coerce.number().nullable().optional(),
  purchasePrice: z.coerce.number().nullable().optional(),
  investedAmount: z.coerce.number().nonnegative('Invested amount cannot be negative').default(0),
  currentValue: z.coerce.number().nullable().optional(),
  purchaseDate: dateStringSchema,
  maturityDate: dateStringSchema.nullable().optional(),
  interestRate: z.coerce.number().nullable().optional(),
  status: holdingStatusEnum.default('active'),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateHoldingSchema = createHoldingSchema.partial();

export const holdingsQuerySchema = paginationQuerySchema.extend({
  investmentType: investmentTypeEnum.optional(),
  status: holdingStatusEnum.optional(),
  search: z.string().trim().max(100).optional(),
});

export const createInvestmentTransactionSchema = z.object({
  transactionType: investmentTransactionTypeEnum,
  amount: z.coerce.number().positive('Amount must be positive'),
  units: z.coerce.number().nullable().optional(),
  navOrPrice: z.coerce.number().nullable().optional(),
  transactionDate: dateStringSchema,
  notes: z.string().max(2000).nullable().optional(),
});

// ---------------- RECURRING PAYMENTS ----------------
export const createRecurringPaymentSchema = z.object({
  accountId: z.string().uuid('Invalid account ID').nullable().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  paymentType: categoryTypeEnum,
  amount: z.coerce.number().positive('Amount must be positive'),
  frequency: frequencyEnum,
  intervalValue: z.coerce.number().int().min(1).default(1),
  startDate: dateStringSchema,
  endDate: dateStringSchema.nullable().optional(),
  nextDueDate: dateStringSchema,
  autoRecord: z.boolean().default(false),
  status: recurringStatusEnum.default('active'),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateRecurringPaymentSchema = createRecurringPaymentSchema.partial();

export const dueRecurringQuerySchema = z.object({
  asOfDate: dateStringSchema.optional(),
});

// ---------------- BUDGETS ----------------
export const createBudgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  name: z.string().trim().min(1, 'Budget name is required').max(150),
  budgetAmount: z.coerce.number().positive('Budget amount must be positive'),
  period: budgetPeriodEnum.default('monthly'),
  startDate: dateStringSchema,
  endDate: dateStringSchema.nullable().optional(),
  alertThreshold: z.coerce.number().min(1).max(100).default(80),
  isActive: z.boolean().default(true),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// ---------------- GOALS & CONTRIBUTIONS ----------------
export const createGoalSchema = z.object({
  title: z.string().trim().min(1, 'Goal title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  goalType: goalTypeEnum,
  targetAmount: z.coerce.number().positive('Target amount must be positive'),
  currentAmount: z.coerce.number().nonnegative().default(0),
  currency: z.string().trim().length(3).default('INR'),
  startDate: dateStringSchema,
  targetDate: dateStringSchema.nullable().optional(),
  linkedAccountId: z.string().uuid('Invalid linked account ID').nullable().optional(),
  status: goalStatusEnum.default('active'),
});

export const updateGoalSchema = createGoalSchema.partial();

export const createGoalContributionSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  contributionDate: dateStringSchema,
  notes: z.string().max(2000).nullable().optional(),
  transactionId: z.string().uuid('Invalid transaction ID').nullable().optional(),
});

// ---------------- EMERGENCY FUND ----------------
export const updateEmergencyFundSchema = z.object({
  targetMonths: z.coerce.number().min(1).max(36).default(6),
  targetAmount: z.coerce.number().positive().nullable().optional(),
  linkedAccountId: z.string().uuid('Invalid linked account ID').nullable().optional(),
});

// ---------------- NET WORTH ----------------
export const createNetWorthSnapshotSchema = z.object({
  snapshotDate: dateStringSchema.optional(),
});

// ---------------- LIABILITIES ----------------
export const createLiabilitySchema = z.object({
  name: z.string().trim().min(1, 'Liability name is required').max(150),
  liabilityType: liabilityTypeEnum,
  institution: z.string().trim().max(150).nullable().optional(),
  originalAmount: z.coerce.number().nonnegative().default(0),
  outstandingAmount: z.coerce.number().nonnegative().default(0),
  interestRate: z.coerce.number().nullable().optional(),
  startDate: dateStringSchema,
  dueDate: dateStringSchema.nullable().optional(),
  linkedAccountId: z.string().uuid('Invalid linked account ID').nullable().optional(),
  status: liabilityStatusEnum.default('active'),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateLiabilitySchema = createLiabilitySchema.partial();

// ---------------- SUMMARY & ANALYTICS ----------------
export const summaryQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});
