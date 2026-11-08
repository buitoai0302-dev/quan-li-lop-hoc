# EduSchedule

EduSchedule là ứng dụng quản lý trung tâm giáo dục theo mô hình nhiều trung tâm (multi-tenant). Dự án gồm giao diện React, API Express và cơ sở dữ liệu PostgreSQL. Giao diện hỗ trợ tiếng Việt/English; các gói dịch vụ và tính năng được lấy từ dữ liệu hệ thống.

[Đặc tả dự án](docs/PROJECT_SPEC.md) · [Quy tắc mã nguồn](AGENTS.md) · [Kiểm thử staging](qa/README.md)

## Chức năng hiện có

- Quản lý trung tâm, chi nhánh, người dùng và phân quyền; lớp học, học viên, giáo viên, phòng và lịch học.
- Điểm danh, học phí, nhập/xuất dữ liệu, dashboard và nhật ký hoạt động.
- Đăng ký, xác minh email, đăng nhập, khôi phục mật khẩu và đăng nhập Google khi đã cấu hình.
- Trang giới thiệu, bảng giá, lựa chọn gói khi đăng ký và luồng gửi yêu cầu nâng cấp sau khi quản trị viên xác nhận.
- Cấu hình hệ thống dành cho super admin: thông tin đơn vị vận hành, liên hệ, tài khoản nhận thanh toán, bản nháp Điều khoản dịch vụ và Chính sách riêng tư Việt/Anh.
- Tích hợp tùy chọn: Google Calendar, sao lưu lên Google Drive, thông báo và cổng thanh toán. Chỉ bật các tích hợp sau khi hoàn tất cấu hình và kiểm thử tương ứng.

## Công nghệ và cấu trúc

| Thành phần                       | Công nghệ chính                                                 | Thư mục                                              |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| Giao diện                        | React 19, TypeScript, Vite, Tailwind CSS, React Router, i18next | [`frontend/`](frontend/)                             |
| API                              | Node.js, Express 5, TypeScript, JWT, PostgreSQL                 | [`backend/`](backend/)                               |
| Cấu trúc DB cho môi trường mới   | SQL                                                             | [`schema.sql`](schema.sql)                           |
| Migration cho DB đang có dữ liệu | SQL có version/checksum                                         | [`backend/src/migrations/`](backend/src/migrations/) |
| Công cụ vận hành DB và demo      | Script chạy thủ công                                            | [`backend/scripts/`](backend/scripts/)               |

Các trang giao diện nằm chủ yếu trong `frontend/src/features/`; component dùng chung ở `frontend/src/components/`; bản dịch ở `frontend/src/locales/`. API nằm trong `backend/src/routes/`, `controllers/` và `services/`.

## Chạy local

Yêu cầu Node.js 20 và PostgreSQL tương thích (có thể dùng Neon hoặc PostgreSQL local). Các lệnh dưới đây chạy từ thư mục gốc dự án; mở **hai terminal** cho backend và frontend.

### 1. Cấu hình backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Điền `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL=http://localhost:5173` và `BACKEND_URL=http://localhost:3000` trong `backend/.env`. Hiện backend khởi tạo Google OAuth khi nạp service, nên cần cung cấp ID/secret hợp lệ ngay cả khi chưa thử tính năng Google. Có thể tạo `JWT_SECRET` bằng lệnh được ghi trong [`.env.example`](backend/.env.example). Giữ `.env` và mọi khóa ngoài Git.

Nếu local dùng **Neon hoặc DB chung**, đặt `DISABLE_BACKGROUND_JOBS=true` để phiên local không chạy các job nhắc lịch và sao lưu của trung tâm khác. Để thử đăng ký/xác minh email, cần cấu hình SMTP hoạt động; các giá trị SMTP trong `.env.example` chỉ là ví dụ và không tự tạo hộp thư thử nghiệm.

### 2. Chuẩn bị database

**DB mới, dùng riêng và có thể xóa:** [`schema.sql`](schema.sql) bắt đầu bằng `DROP SCHEMA public CASCADE`. Chỉ khởi tạo khi bạn chắc chắn DB đó không chứa dữ liệu cần giữ.

```powershell
$env:ALLOW_DESTRUCTIVE_DB_INIT = 'yes'
npm run db:init
Remove-Item Env:ALLOW_DESTRUCTIVE_DB_INIT
npm run db:migrate
```

**DB đã có dữ liệu (kể cả Neon pilot):** sao lưu và thử trên staging trước, sau đó chạy migration. `db:migrate` ghi tên/checksum migration đã áp dụng và dừng nếu tệp đã chạy bị sửa. Không chạy `db:init` trên DB này.

```powershell
npm run db:migrate
```

### 3. Chạy backend

Trong terminal backend:

```powershell
npm run dev
```

API mặc định ở `http://localhost:3000`; kiểm tra `http://localhost:3000/health` (server) và `http://localhost:3000/ready` (DB/job sẵn sàng).

### 4. Chạy frontend

Trong terminal khác, từ thư mục gốc:

```powershell
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:5173`. Vite chuyển tiếp `/api` tới `http://localhost:3000`, nên không cần `VITE_API_URL` khi chạy local theo cấu hình mặc định. `VITE_GOOGLE_CLIENT_ID` và các biến `VITE_FIREBASE_*` chỉ cần khi kiểm thử tích hợp tương ứng.

## Kiểm tra mã nguồn

Từ thư mục gốc, chạy `npm run check:src` và `npm run check:git -- --worktree`.
Sau khi stage, `npm run check:git` kiểm tra snapshot sẽ commit. Hook pre-commit
và CI kiểm tra cả tệp bị force-add và migration SQL đã tồn tại.

```powershell
cd backend
npm run build
npm run test:contracts
```

```powershell
cd frontend
npm run lint
npm run build
```

Không dùng `npm test` ở thư mục gốc làm kiểm tra dự án: script này vẫn là placeholder. Trên Windows bị giới hạn quyền thư mục tạm, có thể đặt `TEMP` và `TMP` vào một thư mục có quyền ghi trong `frontend/` trước khi chạy build.

## Dữ liệu demo và công cụ DB

- `backend/scripts/seed_local_demo.cjs` tạo một tenant giả lập riêng khi `ALLOW_SAMPLE_SEED=yes`; chỉ chạy trên DB được phép thêm dữ liệu thử.
- `backend/scripts/seed_pilot_showcase.cjs` bổ sung dữ liệu biểu đồ/demo cho đúng tenant đó; mặc định chạy thử và rollback, thêm `--apply` mới ghi dữ liệu.
- `npm run db:dump` tạo bản sao lưu theo script; `npm run db:extract` tạo báo cáo schema. Kiểm tra đầu ra, nơi lưu và khả năng khôi phục trước khi dựa vào chúng để vận hành.

Không đưa mật khẩu, file `.env`, bản sao lưu, log chứa dữ liệu thật hoặc dữ liệu học viên lên Git.

## Pilot và triển khai

Kiến trúc dự kiến gồm frontend trên Vercel, backend trên Render và PostgreSQL trên Neon. Cấu hình `FRONTEND_URL`, `BACKEND_URL` và CORS theo từng môi trường. [`frontend/vercel.json`](frontend/vercel.json) cấu hình fallback cho SPA. Khi frontend và API triển khai trên hai origin, đặt `VITE_API_URL` đến URL API, bao gồm hậu tố `/api`, trước khi build. Dùng `/ready` để kiểm tra backend.

Trước khi nhận khách có thu phí, cần hoàn tất migration trên staging rồi trên pilot sau khi sao lưu, thử đăng ký/xác minh email, thanh toán sandbox nếu bật, webhook, backup/restore, cookie và CORS trên domain thực. `.gitignore` chỉ cho phép tài liệu công khai đã được liệt kê trong `docs/`.

Trang `/privacy` và `/terms` lấy nội dung từ cài đặt super admin. Bốn bản nháp Việt/Anh tự điền vào ô còn trống; nội dung chỉ công khai sau khi nhập thông tin đơn vị, liên hệ, ngày hiệu lực, lưu và bật công bố. Người vận hành cần đối chiếu bản nháp với cách xử lý dữ liệu thực tế trước khi dùng trên domain sản xuất hoặc màn hình đồng ý Google.

## Giấy phép mã nguồn

Hiện repository chưa có tệp `LICENSE`, nhưng `package.json` ở gốc và `backend/package.json` đang khai báo `ISC` (giấy phép mã nguồn mở cho phép sử dụng, sửa đổi và phân phối). Hai tín hiệu này cần được thống nhất với quyết định của chủ sở hữu trước khi chia sẻ hoặc cấp quyền sử dụng mã nguồn. Trường `private: true` của frontend chỉ ngăn phát hành gói lên npm; nó không quyết định giấy phép của repository.
