# Quản Lý Lớp Học (Class Management System)

A comprehensive SaaS platform for scheduling and managing classes, students, and teaching sessions. The system features a multi-role dashboard (Admin, Teacher, Student) and is designed to handle multiple branches and scalable tenant resource limits.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4
- **Routing**: React Router DOM v7
- **State Management / Utilities**: Axios, Date-fns
- **Internationalization**: i18next
- **Advanced UI**: `@dnd-kit` (drag & drop), `lucide-react` (icons)
- **Data Export/Import**: `papaparse` (CSV), `xlsx` (Excel)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (using `pg`)
- **Authentication**: JWT (`jsonwebtoken`) & `bcrypt` for password hashing
- **Other**: `node-cache` for caching, `cors`, `dotenv`

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database

### 1. Database Setup
Create a PostgreSQL database and run the schema file located in the root directory:
```bash
psql -U your_postgres_user -d your_db_name -f schema.sql
```

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and configure your environment:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with your database connection strings and JWT secrets.

Start the backend server in development mode:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

## 📋 Features
- Multi-role access control (Admin, Teacher, Student)
- Dynamic dashboards tailored to user roles
- Mobile-responsive scheduling UI
- Drag and drop class scheduling
- CSV/Excel data import and export
- Multi-language support
