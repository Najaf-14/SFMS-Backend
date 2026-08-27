-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROLE_PERMISSIONS (M:N junction table for configurable permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USERS TABLE
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

-- 5. REFRESH TOKENS TABLE (For session management)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. AUDIT LOGS TABLE (SRS-compliant financial and administrative logging)
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

-- 7. FAMILIES TABLE
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


-- ACADEMIC SESSIONS (SRS Section 5)
CREATE TABLE IF NOT EXISTS academic_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g. '2026-27'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLASSES & SECTIONS (SRS Section 6)
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

-- STUDENTS (SRS Section 4)
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
