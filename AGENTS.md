# Quy tắc phát triển EduSchedule

Đọc [đặc tả dự án](docs/PROJECT_SPEC.md) và [hướng dẫn QA](qa/README.md) khi sửa nghiệp vụ hoặc luồng triển khai.

## Constant, biến và hàm

- Dùng `UPPER_SNAKE_CASE` cho hằng số nghiệp vụ, mã lỗi, quyền và trạng thái. Tái sử dụng catalog hiện có trước khi thêm mục. Đặt hằng số dùng riêng cạnh nghiệp vụ sở hữu nó, đưa vào catalog chung khi nhiều module dùng cùng hợp đồng. Tên nhóm như `ROLES`, `ACCESS` và `ERROR_CODES` giữ nguyên giữa các nơi sử dụng.
- Dùng `camelCase` cho biến và hàm, `PascalCase` cho kiểu, lớp và React component. Giữ `snake_case` ở biên SQL hoặc payload đã công bố. Đặt tên thể hiện đối tượng và đơn vị như `tenantId`, `amountVnd` hay `timeoutMs`. Dùng `const` mặc định và `let` khi cần gán lại.
- Đặt tên hàm theo hành động và kết quả, ví dụ `recordPayment`, `findInvoice` hoặc `isPlanActive`. Tách xử lý HTTP khỏi nghiệp vụ và giữ giao dịch trong hàm sở hữu thao tác ghi. Dùng kiểu rõ ràng ở biên nhập/xuất, thu hẹp `unknown` trước khi sử dụng và ưu tiên helper sẵn có.

## SQL và sao lưu

- Truyền giá trị bằng tham số PostgreSQL `$1`, `$2`. Tên bảng, cột, thứ tự sắp xếp và mảnh SQL chỉ được lấy từ danh sách cố định hoặc được xây bằng placeholder. Mỗi truy vấn tenant cần phạm vi từ auth, kể cả JOIN, truy vấn con, cập nhật, xóa và export. Chọn cột tường minh ở biên xuất dữ liệu nhạy cảm.
- Khi ghi nhiều bước, dùng cùng một client từ `BEGIN` đến `COMMIT` hoặc `ROLLBACK`. Dùng khóa/ràng buộc DB cho tiền và lịch, kiểm thử các yêu cầu cạnh tranh và chạy tác vụ bên ngoài sau commit. Migration SQL đã tồn tại giữ nguyên. Thêm migration mới và kiểm tra trên DB rỗng lẫn DB có dữ liệu.
- Tách export nghiệp vụ theo tenant khỏi bản sao lưu toàn DB. Dùng luồng backup đã mã hóa, giữ khóa riêng, tránh token và thông tin xác thực trong archive, tên file và log. Chỉ cập nhật mốc sao lưu sau khi upload thành công, dọn file tạm khi lỗi và xác nhận khả năng giải mã/khôi phục trên DB cô lập trước khi coi bản sao lưu dùng được. Thời hạn lưu giữ theo chính sách môi trường vận hành.

## Mã lỗi, thông báo và log

- Backend dùng `ERROR_CODES` và lỗi nghiệp vụ có HTTP status phù hợp. `code` là hợp đồng cho máy, `message` là mô tả an toàn, còn `params` chứa dữ liệu dịch đã chọn lọc. Giữ envelope cũ cho endpoint đang được dùng. Bổ sung mã và bản dịch Việt/Anh trong cùng thay đổi.
- Frontend dùng khóa i18n và helper xử lý lỗi hiện có. Dịch theo mã, giữ tên trường và đơn vị rõ ràng. Không ghép câu dịch từ nhiều mảnh, đưa lỗi DB thô hoặc credential vào toast. Backend ghi log qua `logger`, dùng mã thao tác, request ID hoặc tenant ID để tra cứu và tránh log payload nhạy cảm.

## Ranh giới, kiểm tra và Git

- Giữ ranh giới route → controller → service. Route khai báo quyền, validation và handler. Service sở hữu nghiệp vụ, giao dịch và truy vấn. Frontend gọi hợp đồng HTTP qua client của feature và tái sử dụng formatter, component hoặc schema hiện có.
- Dùng `requireRole(ACCESS.*)`. API reader chỉ có quyền ở GET được liệt kê trong API key middleware. Lấy tenant từ auth, giữ điều kiện tenant trên mọi truy vấn nghiệp vụ và xác minh tham chiếu ghi thuộc tenant. Kiểm thử cả trường hợp từ chối chéo tenant khi thay đổi đường ghi hoặc quyền.
- Giữ schema request và response độc lập. Đặt cấu hình URL/môi trường ở module cấu hình. Ghi rõ yêu cầu rollback và tác động khóa của migration. Dùng PostgreSQL thật cho ca cạnh tranh tiền và lịch.
- Chỉ commit cấu hình mẫu, fixture giả và asset công khai đã kiểm tra. Giữ `.env`, credential, recovery code, dump/backup, báo cáo nội bộ, log, cache, dữ liệu QA và artifact trình duyệt ngoài Git. Nếu thấy dấu hiệu lộ credential, báo theo đường dẫn hoặc commit và xử lý thu hồi ở hệ thống cấp credential.

Chạy `npm run check:src` sau khi cài dependencies backend. Guard kiểm tra ranh giới module, policy route, catalog lỗi, logging và mẫu nội suy dữ liệu request trực tiếp trong SQL. Quy tắc đặt tên theo ngữ nghĩa, phạm vi tenant của truy vấn động và khả năng phục hồi backup cần được xác nhận khi review hoặc qua kiểm thử. Chạy `npm run check:git -- --worktree` để rà tệp dự kiến và `npm run check:git` sau khi stage. Pre-commit và CI kiểm tra lại index, kể cả file bị force-add. CI chạy bộ Jest cô lập và suite PostgreSQL theo [hướng dẫn QA](qa/README.md).
