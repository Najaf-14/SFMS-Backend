# School Management System API

A backend REST API for managing a school administration system. The project is built with Node.js, Express, PostgreSQL, and JWT-based authentication. It supports academic operations, family and student records, fee management, accounting, expenses, reports, and role-based access control.

## Features

- User authentication and authorization
- Role-based access control with seeded roles
- Student and family management
- Academic session, class, and section management
- Fee structure and fee generation
- Class fee tracking and payment processing
- Account and ledger management
- Expense and concession handling
- Reporting and settings management
- PostgreSQL database initialization through a SQL bootstrap file

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT
- bcryptjs
- dotenv
- CORS

## Project Structure

```text
SchoolManagement/
├── index.js
├── package.json
├── README.md
├── .env.example
├── src/
│   ├── config/
│   │   ├── database.sql
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
└── node_modules/
```

## Prerequisites

Before running the project, ensure you have:

- Node.js (v18 or later recommended)
- PostgreSQL installed and running
- A database created for the application

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

> The app will initialize the PostgreSQL schema automatically when it starts by executing the SQL file in `src/config/database.sql`.

## Installation

Install dependencies:

```bash
npm install
```

## Running the Application

Start the server:

```bash
npm start
```

Run in development mode with auto-reload:

```bash
npm run dev
```

The server will start on the port defined in `PORT` or default to `5000`.

## Database Initialization

The application connects to PostgreSQL and runs the schema bootstrap from `src/config/database.sql` during startup. This script creates tables for:

- roles and permissions
- users
- families
- academic sessions, classes, and sections
- students
- fee components and structures
- payments, accounts, expenses, ledgers, and concessions
- reports and settings

It also seeds default roles and a default super admin user.

## API Overview

Base URL:

```text
http://localhost:5000/api
```

### Authentication

- `POST /api/auth/login`

### Users

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Families

- `GET /api/families`
- `POST /api/families`
- `GET /api/families/:id`
- `PUT /api/families/:id`
- `DELETE /api/families/:id`

### Students

- `GET /api/students`
- `POST /api/students`
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

### Academic

- `GET /api/academic/sessions`
- `POST /api/academic/sessions`
- `GET /api/academic/classes`
- `POST /api/academic/classes`
- `GET /api/academic/sections`
- `POST /api/academic/sections`

### Fees

- `GET /api/fees`
- `POST /api/fees`
- `GET /api/fees/:id`
- `PUT /api/fees/:id`
- `DELETE /api/fees/:id`

### Billing / Fee Generation

- `GET /api/billing`
- `POST /api/billing`
- `GET /api/billing/:id`

### Payments

- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/:id`

### Accounts and Ledger

- `GET /api/accounts`
- `GET /api/ledger`
- `POST /api/ledger`

### Expenses and Concessions

- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/concessions`
- `POST /api/concessions`

### Reports and Settings

- `GET /api/reports`
- `GET /api/settings`
- `PUT /api/settings`

## Example Login Request

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@skylarks.edu",
  "password": "your_password"
}
```

Example response:

```json
{
  "message": "Login successful",
  "accessToken": "...",
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@skylarks.edu",
    "role": "SUPER_ADMIN"
  }
}
```

## Notes

- The backend is designed as a REST API, not a frontend UI.
- Authorization is handled using JWT tokens.
- Use the seeded admin account or create new users through the application flow to manage the system.
- If PostgreSQL credentials or connection settings are incorrect, the app will not initialize properly.

## License

This project is licensed under the ISC license.

## Contributing

Contributions are welcome. You can open a pull request or improve the existing API endpoints and database schema in a clean, documented way.
