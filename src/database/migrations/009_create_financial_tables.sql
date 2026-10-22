-- Migration: 009_create_financial_tables.sql
-- Financial Management & Investments module.

-- 1. financial_accounts
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    institution_name VARCHAR(150),
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN (
        'bank', 'cash', 'wallet', 'kitty', 'mutual_funds', 'fixed_deposits',
        'sips', 'digital_gold', 'bonds', 'stocks', 'other_assets', 'credit_card', 'loan'
    )),
    account_number_masked VARCHAR(30),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    balance_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_user_id ON financial_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(user_id, account_type);

-- 2. financial_categories
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('income', 'expense', 'investment', 'savings')),
    parent_category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    icon VARCHAR(100),
    color VARCHAR(20),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_financial_categories_owner CHECK (
        (is_system = TRUE AND user_id IS NULL) OR (is_system = FALSE AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_user ON financial_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_is_system ON financial_categories(is_system);
CREATE INDEX IF NOT EXISTS idx_financial_categories_type ON financial_categories(category_type);

-- Seed system categories
INSERT INTO financial_categories (name, category_type, is_system, sort_order, icon, color) VALUES
-- Default expense categories from instructions
('Rent', 'expense', TRUE, 1, 'home', '#EF4444'),
('Electricity', 'expense', TRUE, 2, 'zap', '#F59E0B'),
('Groceries', 'expense', TRUE, 3, 'shopping-cart', '#10B981'),
('Transport', 'expense', TRUE, 4, 'truck', '#3B82F6'),
('Fuel', 'expense', TRUE, 5, 'droplet', '#F97316'),
('Shopping', 'expense', TRUE, 6, 'shopping-bag', '#EC4899'),
('Gifting', 'expense', TRUE, 7, 'gift', '#8B5CF6'),
('Home contribution', 'expense', TRUE, 8, 'users', '#6366F1'),
('Personal wishes', 'expense', TRUE, 9, 'heart', '#14B8A6'),
('Recharges', 'expense', TRUE, 10, 'smartphone', '#06B6D4'),
('OTT subscriptions', 'expense', TRUE, 11, 'tv', '#84CC16'),
('Music subscriptions', 'expense', TRUE, 12, 'music', '#A855F7'),
('Eating out', 'expense', TRUE, 13, 'coffee', '#F43F5E'),
('Travel', 'expense', TRUE, 14, 'compass', '#0EA5E9'),
('Healthcare', 'expense', TRUE, 15, 'activity', '#10B981'),
('Education', 'expense', TRUE, 16, 'book-open', '#6366F1'),
('Other', 'expense', TRUE, 17, 'more-horizontal', '#64748B'),
-- Income system categories
('Salary', 'income', TRUE, 1, 'briefcase', '#10B981'),
('Freelance', 'income', TRUE, 2, 'laptop', '#3B82F6'),
('Investment Return', 'income', TRUE, 3, 'trending-up', '#8B5CF6'),
('Other Income', 'income', TRUE, 4, 'dollar-sign', '#64748B'),
-- Savings system categories
('Emergency Fund', 'savings', TRUE, 1, 'shield', '#0EA5E9'),
('General Savings', 'savings', TRUE, 2, 'archive', '#10B981'),
-- Investment system categories
('Mutual Funds', 'investment', TRUE, 1, 'pie-chart', '#6366F1'),
('Stocks', 'investment', TRUE, 2, 'bar-chart-2', '#8B5CF6'),
('Fixed Deposit', 'investment', TRUE, 3, 'lock', '#F59E0B'),
('Gold', 'investment', TRUE, 4, 'sun', '#EAB308'),
('Other Investment', 'investment', TRUE, 5, 'layers', '#64748B')
ON CONFLICT DO NOTHING;

-- 3. recurring_payments
CREATE TABLE IF NOT EXISTS recurring_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('income', 'expense', 'investment', 'savings')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE NOT NULL,
    auto_record BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_user ON recurring_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_due ON recurring_payments(user_id, next_due_date);

-- 4. financial_transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    recurring_payment_id UUID REFERENCES recurring_payments(id) ON DELETE SET NULL,
    transfer_group_id UUID,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment', 'savings', 'transfer')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_date DATE NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'outflow' CHECK (direction IN ('inflow', 'outflow')),
    description TEXT,
    notes TEXT,
    attachment_url TEXT,
    merchant VARCHAR(200),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    original_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_date ON financial_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_account ON financial_transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer_group ON financial_transactions(transfer_group_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(user_id, status);

-- 5. salary_records
CREATE TABLE IF NOT EXISTS salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employer VARCHAR(150) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    salary_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'annual', 'hourly', 'other')),
    gross_salary DECIMAL(15,2) NOT NULL CHECK (gross_salary >= 0),
    net_salary DECIMAL(15,2) NOT NULL CHECK (net_salary >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    effective_from DATE NOT NULL,
    effective_until DATE,
    payment_day INTEGER CHECK (payment_day IS NULL OR (payment_day >= 1 AND payment_day <= 31)),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_records_user ON salary_records(user_id, effective_from DESC);

-- 6. investment_holdings
CREATE TABLE IF NOT EXISTS investment_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    investment_type VARCHAR(30) NOT NULL CHECK (investment_type IN (
        'mutual_funds', 'sip', 'fixed_deposits', 'recurring_deposits', 'stocks',
        'digital_gold', 'bonds', 'ppf', 'epf', 'nps', 'real_estate', 'other'
    )),
    institution VARCHAR(150),
    units DECIMAL(20,8),
    purchase_price DECIMAL(15,4),
    invested_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_value DECIMAL(15,2),
    purchase_date DATE NOT NULL,
    maturity_date DATE,
    interest_rate DECIMAL(7,4),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'redeemed', 'sold')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_holdings_user ON investment_holdings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_type ON investment_holdings(user_id, investment_type);

-- 7. investment_transactions
CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    holding_id UUID NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'purchase', 'contribution', 'redemption', 'dividend', 'interest', 'fee', 'adjustment'
    )),
    amount DECIMAL(15,2) NOT NULL,
    units DECIMAL(20,8),
    nav_or_price DECIMAL(15,4),
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_holding ON investment_transactions(holding_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user ON investment_transactions(user_id);

-- 8. budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    budget_amount DECIMAL(15,2) NOT NULL CHECK (budget_amount > 0),
    period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    alert_threshold DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

-- 9. financial_goals
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    goal_type VARCHAR(30) NOT NULL CHECK (goal_type IN (
        'savings', 'emergency_fund', 'investment', 'purchase', 'debt_repayment', 'other'
    )),
    target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    start_date DATE NOT NULL,
    target_date DATE,
    linked_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id, status);

-- 10. financial_goal_contributions
CREATE TABLE IF NOT EXISTS financial_goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_goal_contributions_goal ON financial_goal_contributions(goal_id, contribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_goal_contributions_user ON financial_goal_contributions(user_id);

-- 11. emergency_fund_settings
CREATE TABLE IF NOT EXISTS emergency_fund_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    target_months DECIMAL(4,1) NOT NULL DEFAULT 6.0,
    target_amount DECIMAL(15,2),
    linked_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_fund_settings_user ON emergency_fund_settings(user_id);

-- 12. financial_net_worth_snapshots
CREATE TABLE IF NOT EXISTS financial_net_worth_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_assets DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_liabilities DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    net_worth DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_net_worth_user_date UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user ON financial_net_worth_snapshots(user_id, snapshot_date DESC);

-- 13. financial_liabilities
CREATE TABLE IF NOT EXISTS financial_liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    liability_type VARCHAR(30) NOT NULL CHECK (liability_type IN (
        'loan', 'credit_card', 'mortgage', 'personal_loan', 'vehicle_loan',
        'education_loan', 'overdraft', 'other'
    )),
    institution VARCHAR(150),
    original_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    interest_rate DECIMAL(7,4),
    start_date DATE NOT NULL,
    due_date DATE,
    linked_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_liabilities_user ON financial_liabilities(user_id, status);
