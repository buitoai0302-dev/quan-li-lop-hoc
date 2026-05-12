# 🎓 Hệ Thống Quản Lý Lớp Học (EduSchedule SaaS)

Một nền tảng SaaS toàn diện giúp quản lý lịch học, điểm danh, giáo viên và học sinh. Hệ thống được thiết kế theo kiến trúc đa người dùng (Multi-tenant) với khả năng phân quyền mạnh mẽ (Admin, Staff, Teacher, Student) và hỗ trợ đa chi nhánh.

---

## 🛠 Công Nghệ Sử Dụng

### Frontend

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (Premium Aesthetics) & TailwindCSS (Utility)
- **Routing**: React Router DOM v7 (Data Router)
- **UI/UX**: `@dnd-kit` (Kéo thả lịch học), `lucide-react` (Icons), `framer-motion` (Animations)
- **Quốc tế hóa**: i18next (Tiếng Việt & Tiếng Anh)

### Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Bảo mật**: JWT, Bcrypt, Role-based Access Control (RBAC)
- **Tính năng**: Google Calendar API Integration, Zalo Notification Service, Automated Email Reminders

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Yêu Cầu Hệ Thống

- **Node.js**: v18.0.0 trở lên
- **PostgreSQL**: v14.0 trở lên

### 2. Cài Đặt Backend

```bash
cd backend
npm install
```

- Tạo file `.env` dựa trên cấu hình mẫu (tham khảo `DATABASE_URL`, `JWT_SECRET`, `SMTP_...`).

### 3. Khởi Tạo Database (Quan Trọng)

Chúng tôi cung cấp bộ công cụ mạnh mẽ để quản lý Database trong thư mục `backend/scripts`:

- **Khởi tạo mới**: Xóa sạch và tạo lại toàn bộ cấu trúc DB từ `schema.sql`.
  ```bash
  npm run db:init
  ```
- **Trích xuất báo cáo**: Tạo file `db_report.md` mô tả chi tiết các bảng hiện có.
  ```bash
  npm run db:extract
  ```
- **Sao lưu (Backup)**: Tạo file `.sql` sao lưu toàn bộ dữ liệu.
  ```bash
  npm run db:dump
  ```

### 4. Cài Đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Cấu Trúc Thư Mục

- `/backend`: Mã nguồn server, API, và logic xử lý nghiệp vụ.
  - `/src/controllers`: Xử lý logic API.
  - `/src/routes`: Định nghĩa các endpoints.
  - `/scripts`: Các công cụ quản lý Database.
- `/frontend`: Mã nguồn giao diện người dùng.
  - `/src/components`: Các thành phần UI dùng chung.
  - `/src/pages`: Các trang chức năng chính (Dashboard, Schedule, Classes...).
  - `/src/locales`: File ngôn ngữ i18n.
- `schema.sql`: File định nghĩa cấu trúc Database chuẩn.

---

## ✨ Chức Năng Chính

- **Giao diện Lịch học**: Quản lý buổi học bằng thao tác kéo thả mượt mà.
- **Điểm danh thông minh**: Tự động nhận diện xung đột và bảo vệ dữ liệu điểm danh khi thay đổi lịch.
- **Quản lý đa chi nhánh**: Tách biệt dữ liệu giữa các cơ sở của cùng một trung tâm.
- **Giới hạn gói cước (Plan Limits)**: Kiểm soát số lượng lớp học, học sinh dựa trên gói đăng ký của Tenant.
- **Import/Export**: Hỗ trợ nhập liệu hàng loạt từ Excel/CSV cho học sinh và lớp học.

---

## 🛡 Bảo Trì & Phát Triển

Mọi thay đổi về cấu trúc Database phải được cập nhật đồng thời vào file `schema.sql` ở thư mục gốc và chạy lệnh `npm run db:extract` để cập nhật tài liệu hướng dẫn.

---

## 📄 Bản Quyền & Giấy Phép

Dự án này thuộc bản quyền của **EduSchedule**. Mọi hành vi sao chép hoặc phân phối trái phép mã nguồn này đều bị nghiêm cấm.

© 2026 EduSchedule. All Rights Reserved.

---

_Phát triển bởi Đội ngũ EduSchedule._
