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
- `POST /api/schedule/sessions/bulk` nhận `{ sessions: [...] }` cho Admin/Staff và trả HTTP 201 với `{ success: true, data }` sau khi commit toàn bộ. Giới hạn nhóm do `GET /api/schedule/weekly` công bố qua `data.maxBatchSessions`. Xung đột bổ sung `slot.index` đếm từ 0 cùng ngày và giờ của ca lỗi. Đồng bộ Google của nhóm chạy sau commit, ngoài phản hồi HTTP.
- `PUT /api/classes/:id` nhận `enrollment_changes: { add, remove }` để cập nhật ghi danh theo từng học viên trong giao dịch lưu lớp. Payload `enrollments` vẫn hỗ trợ thay cả danh sách. Mỗi lần lưu dùng một trong hai trường. Sức chứa được kiểm tra theo danh sách sau cập nhật.
- Request tạo/sửa lớp nhận tối đa 56 mục `recurring_schedules`. Mỗi mảng `enrollments`, `enrollment_changes.add`, `enrollment_changes.remove` hoặc `student_ids` khi ghi danh nhận tối đa 1.000 ID. Đây là giới hạn mỗi request, không phải giới hạn tổng học viên của lớp. Vượt giới hạn trả HTTP 400 với `CLASS_RECURRING_LIMIT_EXCEEDED` hoặc `CLASS_ENROLLMENT_LIMIT_EXCEEDED`, `params.limit` và bản dịch Việt/Anh; không gọi service ghi dữ liệu. Validator từ chối mảng quá dài trước khi duyệt từng phần tử.
- Kéo thả buổi học chỉ gửi `{ sessionDate }` tới `PUT /api/schedule/sessions/:id`. Service dùng giờ, phòng, giáo viên, lớp, loại buổi và ghi chú của dòng đã khóa. Chế độ Ngày hiện bảy ngày quanh ngày đang xem khi kéo; thả thành công sẽ mở ngày đích. Chọn ngày xa hơn qua form sửa hoặc lịch Tuần/Tháng. Thả cùng ngày, ngoài vùng lịch hoặc hủy kéo không gửi yêu cầu. Khi lưu thất bại, buổi học vẫn ở ngày cũ.
- Sửa và xóa học phí khóa cùng dòng với luồng ghi nhận khoản thu. Sửa học phí không được hạ số phải thu dưới số đã thu. Trạng thái thanh toán được tính theo số dư và hạn thu, còn trạng thái miễn học phí được khai báo riêng. Xóa học phí có lịch sử thanh toán trả `HAS_PAYMENTS`.
- `/health` xác nhận tiến trình đang chạy. `/ready` xác nhận DB truy cập được, schema xác thực (cột phiên bản, trigger thu hồi phiên và bảng giao dịch OAuth) cùng ba ràng buộc loại trừ lịch đã sẵn sàng, và job đã khởi tạo hoặc đã được tắt theo cấu hình. Thiếu schema hoặc mất kết nối trả 503 `unavailable`, không trả chi tiết DB. API cấp ID yêu cầu và loại token truy vấn khỏi log.
- Tổng hợp học phí dùng cùng bộ lọc trạng thái, lớp, kỳ và học viên với danh sách. Trạng thái quá hạn được tính theo ngày Việt Nam khi đọc, không cập nhật DB qua GET. Sinh học phí theo lớp khóa dòng lớp trước khi kiểm tra khoản đã có; hai yêu cầu cùng kỳ với `skip_existing` chỉ sinh một bộ khoản thu.
- Nhập học viên kèm ghi danh là một giao dịch; vượt sức chứa hoàn tác toàn bộ lần nhập. Hai endpoint import chia sẻ khóa theo tenant khi tìm hoặc tạo lớp. Import danh mục giữ hợp đồng số dòng thành công/bỏ qua và giao dịch riêng từng dòng; email mời giáo viên được gửi sau commit. Ngày nhập hỗ trợ ISO, DD/MM/YYYY và số ngày Excel; ngày không tồn tại bị từ chối. Tệp Excel giữ định dạng số điện thoại có số 0 đầu khi ô đã được định dạng tương ứng.
- Đồng bộ Google thủ công tái sử dụng đường cập nhật từng buổi, giữ giờ Việt Nam và chỉ đếm lần đồng bộ thành công; buổi đã có ID sự kiện được cập nhật. Khóa đồng bộ hiện chỉ trong bộ nhớ tiến trình; chưa có hàng đợi thử lại bền vững khi khởi động lại. OAuth và Calendar thật vẫn cần nghiệm thu riêng.

### Xác thực và nhập tệp

- Access JWT mang `sessionVersion`; middleware so với `users.session_version` cùng trạng thái tài khoản/tenant. Mỗi lần đổi `password_hash`, trigger tăng phiên bản và xóa refresh token trong cùng giao dịch, kể cả reset bởi admin/giáo viên hoặc SQL vận hành. JWT cũ chưa có trường này chỉ hợp lệ ở phiên bản 0. Đăng xuất tiếp tục thu hồi refresh token của phiên hiện tại; access token của phiên đó hết hạn theo cấu hình.
- Đặt lại mật khẩu tiêu thụ reset token bằng cập nhật có điều kiện và kiểm tra hạn dùng tại DB. Hai yêu cầu đồng thời chỉ một yêu cầu thành công. Cấp/đổi token khóa người dùng trước khi ghi refresh token để không phục hồi phiên vừa bị thu hồi. Phản hồi đăng nhập dùng danh sách trường công khai, không trả mật khẩu, token reset/xác minh hoặc credential Google.
- Kết nối Google Calendar dùng state ngẫu nhiên riêng mục đích, nonce ràng buộc trình duyệt qua cookie HTTP-only và PKCE S256. DB giữ hash state/nonce cùng phiên bản phiên và hạn 10 phút; callback tiêu thụ giao dịch một lần trước khi đổi code. Chỉ lần bắt đầu gần nhất của người dùng có thể hoàn tất. Callback sai, hết hạn hoặc đã dùng phải bắt đầu kết nối lại. Cookie production dùng Secure/SameSite=None; cần nghiệm thu trên đúng cặp host triển khai, không bỏ ràng buộc trình duyệt khi cookie bị chặn. Google login bằng ID token là luồng độc lập.
- Nhập XLS/XLSX/CSV/TSV giới hạn 5 MiB, 500 dòng dữ liệu, 64 cột và tối đa 10 sheet; chỉ lấy sheet đầu. Parser chạy trong Worker riêng và bị dừng sau 10 giây, khi thay/hủy tệp hoặc rời màn hình. Tệp vượt giới hạn bị từ chối, không nhập thiếu dữ liệu do cắt ngầm. Giới hạn phía client bổ sung cho validation và giới hạn API; không thay thế kiểm tra tenant ở backend.

## 6. Cấu hình, vận hành và phục hồi

Backend và frontend yêu cầu Node.js từ 22.12.0; CI dùng Node 22. Cài dependency theo lockfile bằng `npm ci`. Các override bảo mật được giới hạn theo package sở hữu: giữ pg-boss 9 để tránh tự nâng schema hàng đợi, dùng UUID 11 còn hỗ trợ CommonJS; các nhánh Google SDK và Firebase dùng phiên bản phụ thuộc đã vá. Khi nâng package cha, kiểm tra lại override, audit và smoke test tương ứng trước khi bỏ hoặc thay pin.

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
6. Chạy `20261114_auth_sessions.sql` trước backend tương ứng: thêm cột phiên bản và trigger trên `users`, tạo bảng giao dịch OAuth. Thử DB rỗng và DB staging có dữ liệu, sao lưu mã hóa và đo khóa trước triển khai; migration giới hạn chờ khóa 5 giây. Triển khai đồng bộ các backend instance để mọi request đều kiểm tra phiên bản. Rollback ưu tiên giữ schema bổ sung, không phục hồi refresh token đã xóa; quay về backend cũ sẽ mất bảo vệ access token nên cần chặn luồng xác thực bị ảnh hưởng cho tới khi bản sửa tương thích sẵn sàng.

## 7. Kiểm thử và điều kiện nghiệm thu

### Cải tiến luồng công việc — giai đoạn 2

- `GET /api/dashboard/work-items` trả nhóm điểm danh hôm nay còn thiếu, học phí chưa miễn có số dư và đến hạn, lớp đang hoạt động thiếu giáo viên hoặc lịch trong bảy ngày. Ngày theo Việt Nam; số dư tính bằng NUMERIC từ sổ payments. Giáo viên chỉ nhận buổi của mình; buổi không có học viên không tạo việc. Mặc định xem trước năm mục, phân trang từng nhóm tối đa 50 mục bằng `group`, `limit`, `offset`.
- `GET /api/students/:id/profile` và `/history?type=classes|attendance|payments` chỉ dành cho quản lý/staff theo tenant. Hồ sơ nằm trong panel phải, nhớ tab/trang/vị trí cuộn; lịch sử tải khi mở tab. Học phí tái sử dụng API với `student_id`, `tuition_id`, `limit`, `offset`. Các số tổng tính từ sổ thanh toán, không suy ra từ một trang lịch sử.
- Đi từ việc cần làm sẽ mở đúng buổi điểm danh, lớp cần sửa hoặc khoản học phí trong hồ sơ. Mở phiếu thu cần xác nhận; vẫn dùng luồng lưu/biên lai hiện hữu, có nút trở lại hồ sơ. Mutation thành công làm mới nhóm việc và hồ sơ. Giai đoạn 2 không có migration mới; backend cần migration điểm danh của giai đoạn 1.

### Cải tiến luồng công việc — giai đoạn 1

- Lịch, Điểm danh, Học viên và Học phí nhớ ngữ cảnh trên trình duyệt theo phiên bản, tài khoản và tenant hiệu lực. Tham số điều hướng được ưu tiên; bộ lọc sai bị bỏ và trang được giới hạn theo dữ liệu. Chỉ lưu tùy chọn vào localStorage; tìm kiếm/vị trí cuộn dùng sessionStorage. Không lưu bản nháp hoặc dữ liệu nghiệp vụ. Đổi tài khoản/tenant hủy request cũ, xóa cache và dựng lại màn hình.
- GET điểm danh trả thêm `version` và `editingPolicy`; ngày nghiệp vụ lấy từ PostgreSQL theo `Asia/Ho_Chi_Minh`. Giáo viên chỉ sửa buổi của mình hôm nay. Admin/staff và superadmin trong tenant được sửa ngày cũ khi có lý do, phiên bản và xác nhận học viên bổ sung. Không điểm danh buổi tương lai/đã hủy.
- POST giữ payload cũ cho hôm nay; giao diện mới gửi `expectedVersion`, `reason`, `confirmedStudentIds`. Ghi dữ liệu, ảnh chụp danh sách và audit trong một giao dịch; xung đột phiên bản trả 409 `ATTENDANCE_VERSION_CONFLICT`, thiếu lý do trả 400 `ATTENDANCE_REASON_REQUIRED`. Giá trị không thay đổi không tạo audit. GET `/api/attendance/session/:sessionId/history` phân trang 50 dòng cho quản lý/staff.
- Danh sách buổi cũ lấy từ điểm danh/ảnh chụp đã ghi nhận, không suy ra từ ghi danh hiện tại. Xác nhận bổ sung không đổi ghi danh. Hàng loạt chỉ đánh dấu `none`, có hoàn tác trước lưu. “Lưu & buổi tiếp theo” chỉ chuyển sau thành công sang buổi khác còn thiếu điểm danh; buổi không có học viên không tính là thiếu. Refetch/lỗi giữ bản nháp cho đến khi người dùng chọn tải lại.
- Migration `20261115_attendance_workflow.sql` cần chạy trước backend tương ứng, giới hạn chờ khóa 5 giây. Backfill chỉ từ attendance hiện hữu. Sao lưu/khôi phục thử trên DB riêng trước rollout có dữ liệu; đo thời gian khóa tại staging. Rollback giữ schema/audit bổ sung và dùng backend tương thích.

- **CI** kiểm tra đường dẫn và mẫu secret trong index, tính bất biến migration SQL, ranh giới source và quyền API reader, parity role/mã lỗi/locale, TypeScript, Jest, PostgreSQL 16 (toàn vẹn dữ liệu và bảo mật phiên), parser nhập tệp và build frontend/PWA.
- **Đã xác nhận cục bộ cho bản sửa này** gồm migration trên DB PostgreSQL 16 giả lập, cạnh tranh khi thu học phí và xếp lịch, rollback định kỳ, giữ buổi điểm danh, giữ buổi thủ công và trường hợp DB có lịch trùng. Bộ kiểm thử staging PostgreSQL có thể chạy độc lập theo hướng dẫn QA.
- **Cần xác nhận trên staging trước khi phát hành** gồm quyền và dữ liệu giữa nhiều tenant qua HTTP, email/OAuth, trình duyệt và thiết bị, thời gian migration trên dữ liệu đại diện, tải 50 người dùng, backup/restore, và sandbox VNPay/MoMo trước khi bật thanh toán online.
- **Tiêu chí pilot** gồm p95 dưới 2 giây cho API chính, lỗi ngoài dự kiến dưới 1%, không đọc/ghi chéo tenant, không ghi tiền/lịch trùng, khôi phục được dữ liệu và các luồng nghiệp vụ chính chạy được. Xem [quy tắc mã nguồn](../AGENTS.md).
