-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROLE_PERMISSIONS (M:N junction table for configurable permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- USERS TABLE
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
select * from users;
UPDATE users
SET role_id = 1
WHERE id = 3; 

-- REFRESH TOKENS TABLE (For session management)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS TABLE
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

-- SEED THE 5 SRS ROLES
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Owner with full system access'),
('PRINCIPAL', 'Operational and reporting access'),
('ACCOUNTANT', 'Manages fees, receipts, expenses, and ledgers'),
('ADMIN', 'Manages students, parents, classes, and fee structure'),
('VIEWER', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- FAMILIES TABLE
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    family_id_code VARCHAR(50) UNIQUE NOT NULL,
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


-- ACADEMIC SESSIONS
CREATE TABLE IF NOT EXISTS academic_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g. '2026-27'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLASSES & SECTIONS
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'Class 1'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. 'Section A'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, name)
);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    family_id INT NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    mother_name VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    class_id INT REFERENCES classes(id) ON DELETE SET NULL,
    section_id INT REFERENCES sections(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    admission_date DATE DEFAULT CURRENT_DATE,
    contact VARCHAR(30),
    address TEXT,
    academic_session_id INT REFERENCES academic_sessions(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Inactive', 'Graduated', 'Withdrawn', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FEE COMPONENTS
CREATE TABLE IF NOT EXISTS fee_components (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'Tuition Fee', 'Computer Fee', 'Transport'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLASS FEE STRUCTURES
CREATE TABLE IF NOT EXISTS class_fee_structures (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_session_id INT NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, academic_session_id)
);

-- CLASS FEE STRUCTURE ITEMS
CREATE TABLE IF NOT EXISTS class_fee_structure_items (
    id SERIAL PRIMARY KEY,
    fee_structure_id INT NOT NULL REFERENCES class_fee_structures(id) ON DELETE CASCADE,
    fee_component_id INT NOT NULL REFERENCES fee_components(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    UNIQUE(fee_structure_id, fee_component_id)
);

-- STUDENT CUSTOM FEE OVERRIDES / TRANSPORT (Optional student-specific items)
CREATE TABLE IF NOT EXISTS student_fee_overrides (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_component_id INT NOT NULL REFERENCES fee_components(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, fee_component_id)
);

-- FAMILY INVOICES / CHALLANS
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    challan_no VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'FC-202609-0001'
    family_id INT NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    billing_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM', e.g., '2026-09'
    due_date DATE NOT NULL,
    subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    concession_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    previous_arrears NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'Unpaid' 
        CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled', 'Waived')),
    generated_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, billing_month) -- Ensures Idempotency per family per month
);

-- INVOICE LINE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    fee_component_id INT NOT NULL REFERENCES fee_components(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0)
);