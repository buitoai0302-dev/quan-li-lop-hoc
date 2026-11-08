# EduSchedule · Đặc tả dự án

Phiên bản 1.0 · 08/11/2026 · Phạm vi là mã nguồn hiện tại. Các điều kiện phát hành ở cuối tài liệu là công việc nghiệm thu.

## 1. Sản phẩm và phạm vi

EduSchedule quản lý hoạt động hằng ngày của trung tâm giáo dục theo mô hình SaaS đa tenant. Mỗi trung tâm có người dùng, chi nhánh, lớp, giáo viên, phòng, học viên, lịch, điểm danh và học phí riêng. Giao diện React hỗ trợ tiếng Việt và tiếng Anh. Gói dịch vụ quyết định tính năng và hạn mức từ dữ liệu PostgreSQL.

- Người vận hành nền tảng quản lý tenant, người dùng, gói, yêu cầu nâng cấp và cấu hình công khai.
- Trung tâm quản lý học vụ, thu học phí, nhập dữ liệu và xem báo cáo.
- Giáo viên và học viên có quyền xem theo mối liên hệ với lớp. Giáo viên có thể điểm danh theo phạm vi được cấp.
- Công khai các trang giới thiệu, giá, đăng ký, chính sách và hỗ trợ. Luồng cổng thanh toán trực tuyến nằm sau cờ phát hành và có nghiệm thu sandbox riêng.

## 2. Vai trò và quyền

| Năng lực                                                         | Super admin                | Admin                    | Staff                                    | Teacher                                  | Student                                  | API reader                            |
| ---------------------------------------------------------------- | -------------------------- | ------------------------ | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------- |
| Quản trị tenant, người dùng và gói toàn hệ thống                 | Có                         |                          |                                          |                                          |                                          |                                       |
| Cấu hình trung tâm, API key, chi nhánh và sửa danh mục giáo viên | Theo tenant                | Có                       | Đọc chi nhánh                            | Đọc theo endpoint                        | Danh sách giáo viên                      |                                       |
| Lớp, lịch, phòng và học viên                                     | Theo tenant                | Quản lý                  | Quản lý                                  | Đọc theo endpoint và phạm vi lớp         | Đọc lịch/lớp theo ghi danh               | GET danh sách lớp, phòng và lịch tuần |
| Điểm danh                                                        | Theo tenant                | Có                       | Có                                       | Buổi của giáo viên                       |                                          |                                       |
| Học phí và biên nhận                                             | Theo tenant                | Có                       | Có, giới hạn thao tác xóa                |                                          |                                          |                                       |
| Nhập dữ liệu trung tâm                                           | Theo tenant                | Có                       | Có                                       |                                          |                                          |                                       |
| Gói dịch vụ                                                      | Duyệt/yêu cầu theo phạm vi | Gửi yêu cầu, xem hóa đơn | Xem trạng thái yêu cầu khi được xác thực | Xem trạng thái yêu cầu khi được xác thực | Xem trạng thái yêu cầu khi được xác thực |                                       |

Ô trống không cấp quyền trong nhóm đó. Ma trận là tổng hợp theo nhóm nghiệp vụ. Quyền cụ thể lấy từ `backend/src/routes`, `ACCESS`, middleware và truy vấn của service. Route có thể áp dụng thêm hạn mức, tính năng gói hoặc lọc đối tượng. Ví dụ, staff đọc chi nhánh, nhưng chỉ admin thao tác ghi. Admin mới có quyền xóa khoản học phí qua route thông thường. Super admin có quyền vượt danh sách `requireRole` và dùng tenant override qua `x-tenant-id` đã được xác thực. Vai trò trên giao diện chỉ quyết định hiển thị.

`api_reader` là principal của API key, tách khỏi vai trò người dùng. Key chỉ cho phép `GET /api/classes`, `GET /api/rooms` và `GET /api/schedule/weekly` khi tenant và tính năng `api_access` đang hoạt động. Tenant lấy từ key hoặc JWT đã xác thực. Header không tự cấp quyền tenant.

## 3. Luồng nghiệp vụ chính

| Luồng                  | Hành vi hiện tại                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng ký và phiên       | Đăng ký tạo tenant và người quản trị, lưu ý định gói nếu có, rồi xác minh email. Access token đi qua Bearer, refresh token qua cookie HTTP-only. Đăng xuất và đặt lại mật khẩu thu hồi phiên theo logic xác thực. Google OAuth yêu cầu cấu hình riêng.  |
| Danh mục và ghi danh   | Tạo chi nhánh, giáo viên, phòng và học viên trong tenant. Tạo lớp, gán giáo viên và ghi danh học viên. API ghi kiểm tra tham chiếu thuộc đúng tenant tại các luồng liên quan, kết hợp khóa ngoại tổng hợp.                                              |
| Lịch                   | Quản lý buổi trực tiếp hoặc sinh từ lịch định kỳ. Lịch tuần lọc theo khoảng ngày, chi nhánh, giáo viên hoặc lớp. Giao dịch cập nhật định kỳ hoàn tác nếu có xung đột và giữ buổi khớp đã điểm danh. Giờ liền kề hợp lệ.                                 |
| Điểm danh              | Ghi trạng thái theo buổi và học viên có ghi danh, mỗi cặp duy nhất. Truy vấn tenant và quyền giáo viên áp dụng trên dữ liệu buổi.                                                                                                                       |
| Học phí                | Tạo từng khoản hoặc sinh theo lớp và kỳ. Ghi thanh toán dưới khóa dòng học phí, số tiền được tính theo độ chính xác DB. Trigger cập nhật tổng đã thu và trạng thái. Số dư không đủ trả `PAYMENT_EXCEEDS_BALANCE`; khoản đã tất toán trả `ALREADY_PAID`. |
| Gói và thanh toán      | Trang giá đọc gói hoạt động. Luồng chuyển khoản gửi yêu cầu nâng cấp để super admin duyệt. Nếu bật VNPay/MoMo, giá tháng lấy từ `price_vnd`, hóa đơn theo tenant và webhook xác minh chữ ký, cổng và số tiền trước khi kích hoạt.                       |
| Nhập/xuất và thông báo | Nhập theo nhóm dữ liệu và kiểm tra tham chiếu tenant. Xuất bảng từ UI. Nhắc lịch, đồng bộ Google Calendar và sao lưu Drive phụ thuộc cấu hình.                                                                                                          |

## 4. Kiến trúc và dữ liệu

- **Frontend** dùng React, Vite/PWA, React Router, TanStack Query và i18next. Mỗi feature sở hữu API client, hooks và giao diện. `api.ts` cấu hình HTTP và refresh. Schema Zod cho response ở `frontend/src/types/schemas.ts`; formatter và UI chung ở `utils/` và `components/common/`.
- **Backend** dùng Express và TypeScript. Route khai báo quyền và validation, controller nhận HTTP và gọi service, service xử lý nghiệp vụ và SQL tham số hóa. `server.ts` phân tuyến công khai và các nhóm bảo vệ bằng API key, JWT và tenant. PostgreSQL lưu trạng thái, pg-boss điều phối job và Redis hỗ trợ rate limit khi có cấu hình. Mỗi ứng dụng build độc lập.
- **Dữ liệu tenant** gồm `tenants`, `users`, `branches`, `subjects`, `teachers`, `rooms`, `students` và `classes`. `class_students` nối ghi danh. UUID là định danh, khóa ngoại gồm tenant ở các đường tham chiếu trọng yếu.
- **Lịch** gồm mẫu `class_recurring_schedules`, buổi thực `schedule_sessions` và `attendance`. Ngày và giờ lịch là `DATE` và `TIME` theo nghiệp vụ. Ràng buộc GiST theo tenant, giáo viên, phòng hoặc lớp áp dụng trên khoảng `[start, end)` cho buổi chưa hủy. Các đường ghi lịch ứng dụng khóa theo tenant trước khi ghi.
- **Tài chính** tách `tuitions/payments` cho học phí khỏi `billing_invoices/plan_requests` cho gói SaaS. Khoản thu dùng `NUMERIC(15,2)`, giá VND của gói dùng số nguyên. Webhook khóa hóa đơn khi xác nhận để lần gửi lại không kích hoạt hai lần.
- **Nền tảng** dùng `plan_definitions`, `plan_limits`, `plan_features`, `system_settings` và `refresh_tokens`. Mã gói `FREE` được tra trong DB. Endpoint cấu hình công khai chỉ xuất các trường được cho phép.

## 5. Hợp đồng HTTP

| Nhóm               | Đường dẫn chính                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Công khai và phiên | `GET /health`, `GET /ready`, `GET /api/plans`, `GET /api/system/settings/public`, `/api/auth/*`, Google callback và webhook thanh toán               |
| Học vụ             | `/api/classes`, `/api/branches`, `/api/teachers`, `/api/students`, `/api/rooms`, `/api/schedule/weekly`, `/api/schedule/sessions`, `/api/attendance` |
| Thu phí            | `/api/tuitions`, `/api/tuitions/:id/payments`, `/api/billing/create-payment-url`, `/api/billing/invoices`                                            |
| Vận hành           | `/api/tenant`, `/api/dashboard`, `/api/import/:type`, `/api/notifications`, `/api/admin`, `/api/plans/request`, `/api/system/settings`               |

- JSON dùng cấu trúc hiện có theo endpoint. Một số trả mảng/đối tượng trực tiếp và một số dùng `{ success, data }`. Frontend kiểm tra response theo hợp đồng riêng với request.
- Lỗi nghiệp vụ qua middleware có `code`, `message`, `error` tương thích và `params` tùy trường hợp. Dùng mã trong `ERROR_CODES` và bản dịch Việt/Anh. Một số middleware cũ trả `error` hoặc `message` trực tiếp.
- Xung đột lịch trả HTTP 409 với `{ success: false, error: 'SCHEDULE_CONFLICT', conflicts }`. Lịch định kỳ bổ sung `slot` chứa ngày và giờ. Payload tạo/sửa lớp gửi danh sách dưới `recurring_schedules`.
- `/health` xác nhận tiến trình đang chạy. `/ready` xác nhận DB truy cập được và job đã khởi tạo hoặc đã được tắt theo cấu hình. API cấp ID yêu cầu và loại token truy vấn khỏi log.

## 6. Cấu hình, vận hành và phục hồi

| Phần              | Cấu hình                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB, JWT và mạng   | `DATABASE_URL` với TLS xác minh khi dùng DB từ xa, hoặc `DB_*` cho PostgreSQL local. `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS`, `PORT`.                      |
| Frontend          | `VITE_API_URL` bao gồm đường dẫn API khi triển khai tách origin. Các giá trị `VITE_*` xuất hiện trong bundle nên chỉ dùng cấu hình phía client.                                   |
| Tích hợp tùy chọn | `GOOGLE_*`, `SMTP_*`, `FIREBASE_*`, `VITE_FIREBASE_*`, `REDIS_URL`, `BACKUP_ENCRYPTION_KEY`. Dùng giá trị mẫu trong `.env.example`, lấy credential thật từ môi trường triển khai. |
| Phát hành và job  | `DISABLE_BACKGROUND_JOBS` cho môi trường cần tắt job. `ONLINE_PAYMENTS_ENABLED` mặc định tắt. VNPay và MoMo dùng `VNPAY_*` và `MOMO_*` khi qua nghiệm thu.                        |

1. Chạy frontend và backend theo [README](../README.md). Frontend staging/production tách cấu hình, trỏ đến đúng API tương ứng. Xác nhận CORS, cookie, callback và `/ready`.
2. Với DB mới dùng riêng, chạy `db:init` rồi `db:migrate`. `db:init` xóa schema public. Với DB có dữ liệu, sao lưu rồi chạy `db:migrate`. Runner khóa migration, ghi checksum và áp dụng mỗi file trong một giao dịch.
3. Migration đã áp dụng giữ nguyên. Thay đổi hoặc đảo ngược schema qua migration mới. Nếu bản phát hành cần rollback, ưu tiên trả app về phiên bản tương thích với schema và dùng migration bù. Khi cần khôi phục dữ liệu, phục hồi bản backup vào DB riêng, kiểm tra số bản ghi và luồng nghiệp vụ trước khi chuyển kết nối.
4. Với migration chống trùng lịch, thử trên staging có dữ liệu đại diện. Xác nhận quyền cài `btree_gist`, thời gian khóa và tác động trong cửa sổ tạm dừng ghi lịch. Nếu có lịch trùng, đối soát theo ID báo về và chạy lại sau khi xử lý.
5. Sao lưu và export chứa dữ liệu tenant. Dùng mã hóa AES-256-GCM cho luồng backup của ứng dụng và giữ khóa riêng. Kiểm tra khả năng giải mã và khôi phục theo [hướng dẫn QA](../qa/README.md). Log, dump, bản ghi vận hành và bằng chứng QA ở ngoài Git.

## 7. Kiểm thử và điều kiện nghiệm thu

- **CI** kiểm tra đường dẫn và mẫu secret trong index, tính bất biến migration SQL, ranh giới source và quyền API reader, parity role/mã lỗi/locale, TypeScript, Jest, PostgreSQL 16 và build frontend/PWA.
- **Đã xác nhận cục bộ cho bản sửa này** gồm migration trên DB PostgreSQL 16 giả lập, cạnh tranh khi thu học phí và xếp lịch, rollback định kỳ, giữ buổi điểm danh, giữ buổi thủ công và trường hợp DB có lịch trùng. Bộ kiểm thử staging PostgreSQL có thể chạy độc lập theo hướng dẫn QA.
- **Cần xác nhận trên staging trước khi phát hành** gồm quyền và dữ liệu giữa nhiều tenant qua HTTP, email/OAuth, trình duyệt và thiết bị, thời gian migration trên dữ liệu đại diện, tải 50 người dùng, backup/restore, và sandbox VNPay/MoMo trước khi bật thanh toán online.
- **Tiêu chí pilot** gồm p95 dưới 2 giây cho API chính, lỗi ngoài dự kiến dưới 1%, không đọc/ghi chéo tenant, không ghi tiền/lịch trùng, khôi phục được dữ liệu và các luồng nghiệp vụ chính chạy được. Xem [quy tắc mã nguồn](../AGENTS.md).
