# Hướng dẫn kiểm thử staging trước pilot

Hướng dẫn này chỉ dùng dữ liệu giả lập. Không trỏ các lệnh dưới đây vào Neon pilot.

## Các bước có thể chạy tại máy

Trong thư mục backend: npm ci; npx tsc --noEmit; npx tsc --noEmit -p tests/tsconfig.json; npm run test:contracts; npm test -- --runInBand.

Trong thư mục frontend: npm ci; npm run test:security; npm run lint; npm run build. Nếu Windows hạn chế quyền đọc thư mục tạm hệ thống, đặt TEMP và TMP tới một thư mục có quyền ghi bên trong frontend trước khi build.

Dùng Node.js >=22.12.0, tương ứng CI Node 22. Chạy `npm audit --omit=dev` trong cả backend và frontend sau khi cập nhật lockfile; kết quả này chỉ áp dụng dependency production. Không dùng `npm audit fix --force` để tự nâng major. Khi thay dependency bắc cầu, giữ kiểm thử thực tế: `email-transport.test.ts` dựng email tiếng Việt và chặn đọc file bằng Nodemailer mà không gửi SMTP; ca pg-boss trong `data-integrity.staging.test.ts` khởi tạo schema riêng, gửi/lấy/hoàn tất job giả rồi dọn schema trên DB cô lập. Không dùng DB pilot cho smoke test hàng đợi.

Các ca trong `class.test.ts` kiểm tra giới hạn 56 mục lịch định kỳ và 1.000 ID mỗi mảng ghi danh ở tạo/sửa lớp và ghi danh hàng loạt. Kiểm tra giá trị đúng giới hạn được chấp nhận, vượt một mục bị HTTP 400 với mã và `params.limit` phù hợp, service không được gọi, và 10.000 phần tử sai bị từ chối theo chiều dài mà không tạo lỗi cho từng phần tử. Bổ sung cùng lúc catalog lỗi và locale Việt/Anh khi thay hợp đồng này.

Cấu hình Jest mặc định chạy test ở backend/tests/integration. Dù tên thư mục là integration, các test hiện tại chủ yếu dùng mock cho DB hoặc dịch vụ. Bài gọi HTTP vào staging nằm ở backend/tests/staging và chỉ chạy bằng npm run test:staging.

## Hồi quy kéo thả lịch trước khi thử trên staging

Kiểm tra trên trình duyệt với API giả được chặn hoàn toàn, sau đó nghiệm thu bằng dữ liệu giả trên staging:

- Kéo bằng chuột từ tay nắm hoặc tên buổi ở Ngày/Tuần/Tháng. Một lần thả sang ngày khác chỉ gửi một `PUT` với `sessionDate`, giữ nguyên giờ có giây, phòng, giáo viên, lớp, loại buổi và ghi chú.
- Chế độ Ngày giữ bảng hàng ngang trên PC và thẻ trên mobile; bảy ngày đích chỉ hiện khi kéo. Kiểm tra Space/Enter, các phím mũi tên, Escape, thả cùng ngày và thả ngoài vùng lịch. Các thao tác hủy không ghi dữ liệu.
- Trùng lịch (409) và lỗi hệ thống giữ buổi tại ngày cũ, hiện thông báo theo ngôn ngữ. Trong lúc lưu, không cho gửi lần kéo thứ hai. Xem/sửa bằng nhấp vẫn hoạt động; giáo viên/học viên không có điều khiển kéo hoặc sửa.
- Với cảm ứng, giữ tay nắm rồi kéo; vuốt nội dung thẻ vẫn cuộn. Kéo buổi không được kích hoạt vuốt chuyển ngày. Kiểm tra 320/390/768/1024/1440 px, Việt/Anh, sáng/tối và giảm chuyển động.

Các ca API/service cô lập nằm ở `backend/tests/integration/schedule.test.ts` và `schedule-move.test.ts`. Chúng kiểm tra hợp đồng và rollback qua mock, không thay thế nghiệm thu PostgreSQL thật.

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
`npm run test:staging -- --runTestsByPath tests/staging/data-integrity.staging.test.ts tests/staging/auth-security.staging.test.ts`.
Các bộ test tạo và dọn tenant giả riêng. CI chạy cùng hai bộ test trên PostgreSQL 16 mới.

## Hồi quy bảo mật phiên, OAuth và nhập tệp

- Chạy migration mới `20261114_auth_sessions.sql` trên DB trống và DB thử có tài khoản/refresh token cũ. Xác nhận mật khẩu không bị thay, phiên bản khởi đầu là 0, sau đó thử đổi mật khẩu và rollback giao dịch. Đo thời gian khóa với dữ liệu đại diện; mức chờ khóa tối đa 5 giây không phải cam kết thời gian migration. Backend mới cần schema này trước khi khởi động.
- Kiểm tra `/ready` trả 503 `unavailable` khi thiếu cột phiên bản, trigger thu hồi phiên, bảng OAuth hoặc một trong ba ràng buộc loại trừ lịch. Sau các migration tương ứng và khởi tạo job (hoặc tắt job theo cấu hình), endpoint mới trả 200 `ready`; `/health` vẫn chỉ kiểm tra tiến trình.
- `auth-security.staging.test.ts` dùng các kết nối PostgreSQL độc lập cho hai reset cùng token, reset cạnh tranh refresh và hai callback cùng state. Kiểm tra đúng một lần tiêu thụ, access/refresh cũ bị từ chối sau reset, mật khẩu mới đăng nhập được, admin/giáo viên reset có hiệu lực, rollback không làm mất phiên, và cách ly tenant. Google/email được mock; không phát sinh yêu cầu ra nhà cung cấp.
- Với OAuth thật trên staging, bắt đầu từ Cài đặt → Tích hợp; xác nhận cookie HTTP-only ràng buộc trình duyệt được gửi về callback, state không phải access JWT và PKCE S256 được chấp nhận. Thử thiếu/sai cookie, callback lặp, state hết hạn, reset mật khẩu trong lúc kết nối, người dùng hủy ở Google và bắt đầu lại. Thông báo Việt/Anh không lộ code/token; response đăng nhập không chứa credential Google. Kiểm tra đúng cặp host frontend/backend production và trình duyệt chặn cookie bên thứ ba; không nới state/cookie để vượt kiểm tra.
- `npm run test:security` kiểm tra parser thật với XLS/XLSX/CSV/TSV có Unicode, ranh giới dòng/cột/sheet/dung lượng và tệp sai định dạng. Giới hạn là 5 MiB, 500 dòng dữ liệu, 64 cột, 10 sheet; chỉ đọc sheet đầu. Không tự cắt bớt dữ liệu vượt giới hạn.
- Kiểm tra trình duyệt cả màn nhập học viên và panel nhập người dùng: xem trước, thay/hủy tệp, đóng panel, rời route, timeout 10 giây và thông báo Việt/Anh. Parser phải chạy trong Worker và Worker bị dừng khi hoàn tất/lỗi/hủy. Chặn mọi API thật bằng fixture nếu dùng frontend local đang trỏ DB pilot. Thử tải mẫu và export để xác nhận nâng SheetJS không làm hỏng luồng xuất.
- Sau triển khai backend đồng bộ, thử đăng nhập/refresh/reset và kết nối Google bằng tài khoản staging. Không coi test mock hoặc thời gian migration local là nghiệm thu provider/production. Báo cáo bảo mật, log và artifact trình duyệt lưu ngoài Git.

## Nghiệm thu dữ liệu và luồng nghiệp vụ

`data-integrity.staging.test.ts` còn kiểm tra hai yêu cầu cùng sinh học phí theo lớp/kỳ, tổng hợp theo học viên và trạng thái, đọc quá hạn lặp lại không sửa DB, rollback import khi đầy lớp, hai import tranh chỗ cuối, ngày sinh/số điện thoại sau import và hai import lớp cùng tên. Các ca này dùng DB PostgreSQL cô lập đã nêu ở trên; không trỏ vào DB pilot. Kiểm thử Calendar bằng mock xác nhận cập nhật sự kiện đã liên kết và chỉ đếm lần thành công, không thay thế nghiệm thu OAuth/provider thật hoặc phục hồi đồng bộ sau restart.

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
