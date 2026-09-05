-- =========================================================
-- SCHOOL MANAGEMENT SYSTEM DATABASE
-- PostgreSQL
-- =========================================================


-- =========================================================
-- 1. ROLES
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Seed default roles
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Owner with full system access'),
('PRINCIPAL', 'Operational and reporting access'),
('ACCOUNTANT', 'Manages fees, receipts, expenses, and ledgers'),
('ADMIN', 'Manages students, parents, classes, and fee structure'),
('VIEWER', 'Read-only access')
ON CONFLICT (name) DO NOTHING;


-- =========================================================
-- 2. PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 3. ROLE PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- =========================================================
-- 4. USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 5. DEFAULT SUPER ADMIN
-- =========================================================

INSERT INTO users (
    name,
    email,
    password_hash,
    role_id
)
VALUES (
    'Admin',
    'admin@skylarks.edu',
    '$2b$10$RjvMpjzwvqF6ZH6MqridNeCNaSuwZdMnx/nlCH15AhEXiSqcxdp16',
    (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
)
ON CONFLICT (email) DO NOTHING;


-- =========================================================
-- 6. AUDIT LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 7. FAMILIES
-- =========================================================

CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    father_parent_name VARCHAR(150) NOT NULL,
    mother_name VARCHAR(150),
    cnic VARCHAR(30),
    father_contact VARCHAR(30) NOT NULL,
    mother_contact VARCHAR(30),
    whatsapp_number VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    emergency_contact VARCHAR(50),
    notes TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    family_concession NUMERIC(10, 2) DEFAULT 0.00,
    scholarship_info TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 8. ACADEMIC SESSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS academic_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 9. CLASSES
-- =========================================================

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 10. SECTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(class_id, name)
);


-- =========================================================
-- 11. STUDENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    family_id INT NOT NULL
        REFERENCES families(id)
        ON DELETE RESTRICT,
    mother_name VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(20)
        CHECK (gender IN ('Male', 'Female', 'Other')),
    class_id INT
        REFERENCES classes(id)
        ON DELETE SET NULL,
    section_id INT
        REFERENCES sections(id)
        ON DELETE SET NULL,
    roll_number VARCHAR(50),
    admission_date DATE DEFAULT CURRENT_DATE,
    contact VARCHAR(30),
    address TEXT,
    academic_session_id INT
        REFERENCES academic_sessions(id)
        ON DELETE SET NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'Active'
        CHECK (
            status IN (
                'Active',
                'Inactive',
                'Graduated',
                'Withdrawn',
                'Suspended'
            )
        ),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 12. FEE COMPONENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS fee_components (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 13. CLASS FEE STRUCTURES
-- =========================================================

CREATE TABLE IF NOT EXISTS class_fee_structures (
    id SERIAL PRIMARY KEY,

    class_id INT NOT NULL
        REFERENCES classes(id)
        ON DELETE CASCADE,

    academic_session_id INT NOT NULL
        REFERENCES academic_sessions(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(class_id, academic_session_id)
);


-- =========================================================
-- 14. CLASS FEE STRUCTURE ITEMS
-- =========================================================

CREATE TABLE IF NOT EXISTS class_fee_structure_items (
    id SERIAL PRIMARY KEY,

    fee_structure_id INT NOT NULL
        REFERENCES class_fee_structures(id)
        ON DELETE CASCADE,

    fee_component_id INT NOT NULL
        REFERENCES fee_components(id)
        ON DELETE RESTRICT,

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 0),

    UNIQUE(fee_structure_id, fee_component_id)
);


-- =========================================================
-- 15. STUDENT FEE OVERRIDES
-- =========================================================

CREATE TABLE IF NOT EXISTS student_fee_overrides (
    id SERIAL PRIMARY KEY,

    student_id INT NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    fee_component_id INT NOT NULL
        REFERENCES fee_components(id)
        ON DELETE RESTRICT,

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 0),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, fee_component_id)
);


-- =========================================================
-- 16. INVOICES / CHALLANS
-- =========================================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,

    challan_no VARCHAR(50) UNIQUE NOT NULL,

    family_id INT NOT NULL
        REFERENCES families(id)
        ON DELETE RESTRICT,

    billing_month VARCHAR(7) NOT NULL,

    due_date DATE NOT NULL,

    subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    concession_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    previous_arrears NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    total_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    status VARCHAR(30) NOT NULL DEFAULT 'Unpaid'
        CHECK (
            status IN (
                'Unpaid',
                'Partially Paid',
                'Paid',
                'Overdue',
                'Cancelled',
                'Waived'
            )
        ),

    generated_by INT
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(family_id, billing_month)
);


-- =========================================================
-- 17. INVOICE ITEMS
-- =========================================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,

    invoice_id INT NOT NULL
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    student_id INT NOT NULL
        REFERENCES students(id)
        ON DELETE RESTRICT,

    fee_component_id INT NOT NULL
        REFERENCES fee_components(id)
        ON DELETE RESTRICT,

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 0)
);


-- =========================================================
-- 18. PAYMENT ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  receipt_no VARCHAR(50) UNIQUE NOT NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  family_id INTEGER REFERENCES families(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL ON UPDATE CASCADE,
  amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash', -- 'Cash', 'Bank Transfer', 'Cheque', 'Online'
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  notes TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_family_id ON payments(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- =========================================================
-- 19. ACCOUNTS ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Cash', -- 'Cash', 'Bank', 'JazzCash', 'Easypaisa'
  account_number VARCHAR(100),
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type VARCHAR(20) NOT NULL, -- 'INFLOW' or 'OUTFLOW'
  category VARCHAR(50) NOT NULL, -- 'FEE_PAYMENT', 'EXPENSE', 'TRANSFER', 'MANUAL_INCOME', etc.
  reference_id VARCHAR(100), -- receipt_no, expense_id, or challan_no
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_txns_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_txns_date ON account_transactions(transaction_date);

-- Insert default accounts if table is empty
INSERT INTO accounts (name, type, account_number, opening_balance)
VALUES 
  ('Main Cash Drawer', 'Cash', NULL, 0.00),
  ('Meezan Bank (Main Campus)', 'Bank', '01020304050607', 0.00),
  ('JazzCash Official', 'JazzCash', '03001234567', 0.00)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 20. EXPENSES ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_no VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'Utilities', 'Supplies', 'Maintenance', 'Salaries', 'Others'
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  paid_to VARCHAR(255),
  reference_no VARCHAR(100),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- =========================================================
-- DATABASE INITIALIZATION COMPLETE
-- =========================================================

