# Hướng dẫn kiểm thử staging trước pilot

Hướng dẫn này chỉ dùng dữ liệu giả lập. Không trỏ các lệnh dưới đây vào Neon pilot.

## Các bước có thể chạy tại máy

Trong thư mục backend: npm ci; npx tsc --noEmit; npx tsc --noEmit -p tests/tsconfig.json; npm run test:contracts; npm test -- --runInBand.

Trong thư mục frontend: npm ci; npm run lint; npm run build. Nếu Windows hạn chế quyền đọc thư mục tạm hệ thống, đặt TEMP và TMP tới một thư mục có quyền ghi bên trong frontend trước khi build.

Cấu hình Jest mặc định chạy test ở backend/tests/integration. Dù tên thư mục là integration, các test hiện tại chủ yếu dùng mock cho DB hoặc dịch vụ. Bài gọi HTTP vào staging nằm ở backend/tests/staging và chỉ chạy bằng npm run test:staging.

## Tạo môi trường staging mới

1. Tạo **dự án Neon mới** với database tên eduschedule_staging. Không tạo nhánh từ DB pilot và không sao chép dữ liệu khách hàng. Lưu chuỗi kết nối có sslmode=verify-full vào secret STAGING_DATABASE_URL.
2. Chỉ trên DB staging mới và rỗng, đặt DATABASE_URL bằng chuỗi staging, đặt ALLOW_DESTRUCTIVE_DB_INIT=yes rồi chạy db:init; sau đó chạy db:migrate. Lệnh db:init xóa toàn bộ schema public, vì vậy phải kiểm tra lại tên DB trước khi chạy. Không đặt cờ này trên Render.
3. Đặt STAGING_CONFIRMATION=isolated-synthetic-staging và chạy npm run seed:staging trong backend. Script chỉ chạy khi bảng tenants rỗng; nó tạo ba trung tâm Free, Pro và Business, 275 học viên giả, lớp, lịch, học phí, các vai trò và 50 tài khoản thử tải. Mật khẩu được ghi vào qa/load/users.local.json và qa/staging/roles.local.json; hai file này đã được Git bỏ qua và phải giữ trên máy kiểm thử.
4. Tạo dịch vụ Render riêng cho staging, dùng nhánh mã và DB staging. Dùng JWT secret, khóa backup và API secret riêng. Đặt ONLINE_PAYMENTS_ENABLED=false, DISABLE_BACKGROUND_JOBS=true, NODE_ENV=production; FRONTEND_URL là origin Vercel staging chính xác, BACKEND_URL là origin Render staging chính xác. Dùng hộp thư thử nghiệm hoặc SMTP giả. Sau khi khởi động, xác nhận GET /ready trả 200. Chưa bật job trong lượt kiểm thử chức năng.
5. Tạo dự án Vercel staging riêng. Khi build, đặt VITE_API_URL=https://<render-staging-host>/api. Sau deploy, kiểm tra tab Network: mọi yêu cầu API phải tới Render staging. frontend/vercel.json chỉ giữ rewrite cho SPA, không có đích API pilot.

## Thứ tự nghiệm thu trên staging

Sau khi chạy migration trên PostgreSQL staging, đặt `PG_INTEGRITY_TEST_URL` tới
`eduschedule_staging` với `sslmode=verify-full` và đặt
`PG_INTEGRITY_CONFIRMATION=isolated-synthetic-staging`. Trong backend, chạy
`npm run test:staging -- --runTestsByPath tests/staging/data-integrity.staging.test.ts`.
Bộ test tạo và dọn hai tenant riêng. CI chạy cùng bộ test trên PostgreSQL 16 mới.

Trên bản sao staging có lịch, xác nhận quyền cài `btree_gist` và đo thời gian
migration chống trùng lịch khi tạm dừng ghi lịch. Migration đợi khóa bảng tối đa
5 giây và báo hai ID buổi đầu tiên nếu phát hiện trùng. Đối soát thủ công trước
khi chạy lại. Chỉ lên lịch triển khai sau khi kiểm thử đồng thời đạt trên staging.

1. Dùng hộp thư thử để đi hết luồng đăng ký, xác minh email, đăng nhập, refresh, logout và đặt lại mật khẩu. Tải lại trang, thử phiên hết hạn, chọn và xác nhận gói, gói ngừng hoạt động và yêu cầu nâng cấp đang chờ. Giữ thanh toán online ở trạng thái tắt.
2. Đăng nhập bằng từng vai trò trong roles.local.json; kiểm tra cả thao tác được phép và bị từ chối. Với bài thử hai tenant, lấy token admin Free và Pro từ **API staging**, rồi đặt STAGING_TENANT_A_TOKEN, STAGING_TENANT_B_TOKEN, STAGING_TENANT_B_CLASS_ID, STAGING_TENANT_B_STUDENT_ID, STAGING_TENANT_B_BRANCH_ID, STAGING_API_URL và STAGING_CONFIRMATION. Chạy npm run test:staging trong backend.
3. Kiểm tra lớp, lịch, học viên, điểm danh, học phí, nhập/xuất, API key, cài đặt pháp lý, webhook bằng dữ liệu giả, /ready, khởi động lại và khôi phục bản backup staging. Xem log và file xuất để tìm bí mật bị lộ. Google và cổng thanh toán chỉ kiểm bằng fixture ở lượt này; OAuth và sandbox thật là cổng nghiệm thu riêng.
4. Dùng Playwright ở chiều rộng 320, 360, 768 và 1440 px, tiếng Việt/Anh, sáng/tối. Bao gồm đăng nhập, đăng ký, xác nhận gói, dashboard, lịch, học phí và thao tác modal bằng bàn phím. Lưu ảnh chụp và lỗi console/network.
5. Cài k6 trên máy chạy kiểm thử. Đặt STAGING_API_URL tới host có chữ staging, STAGING_CONFIRMATION=isolated-synthetic-staging và STAGING_USERS_FILE tới file JSON chứa 50 người dùng giả. Chạy k6 run --summary-export qa/load/summary.local.json qa/load/pilot.js. Kịch bản tăng tải 2 phút, giữ 50 người dùng 15 phút, giảm tải 2 phút. Giữ thanh toán và job gửi ra ngoài ở trạng thái tắt. Thu thập CPU/RAM Render, số kết nối Neon và log cùng kết quả k6.

Ngưỡng đạt gồm p95 của từng API chính dưới 2 giây, tỷ lệ lỗi bất ngờ dưới 1%, cách ly giữa các tenant, số liệu thu phí nhất quán và RAM ổn định. Ghi bằng chứng vào báo cáo QA nội bộ ngoài Git. Chỉ đánh dấu Go khi kiểm thử staging và diễn tập khôi phục đều đạt.
