import type { SystemSettings } from './api/system.api';

// Editorial drafts only. Publication requires operator details and manual review.
export const LEGAL_DRAFTS = {
  PRIVACY_POLICY_VI: `Chính sách này giải thích cách đơn vị vận hành EduSchedule (được nêu ở đầu trang) xử lý dữ liệu khi bạn truy cập website và sử dụng dịch vụ quản lý trung tâm. Thông tin liên hệ chính thức được hiển thị ở cuối trang. Trung tâm sử dụng EduSchedule chịu trách nhiệm cung cấp thông tin và hướng dẫn phù hợp cho học viên, phụ huynh và nhân sự của mình khi nhập dữ liệu của họ.

## 1. Dữ liệu được xử lý

Tùy chức năng sử dụng, dữ liệu có thể gồm tên, email, số điện thoại, thông tin đăng nhập; thông tin trung tâm, chi nhánh và nhân sự; dữ liệu học viên, phụ huynh, giáo viên, lớp, lịch học, điểm danh, học phí, khoản thanh toán, ghi chú; yêu cầu hỗ trợ và lịch sử thao tác. Hệ thống cũng xử lý địa chỉ IP, thông tin trình duyệt/thiết bị, nhật ký truy cập và dữ liệu cần thiết để duy trì phiên đăng nhập, bảo mật và chẩn đoán sự cố. Chỉ nhập thông tin cần thiết cho hoạt động của trung tâm, đặc biệt với dữ liệu của trẻ em.

## 2. Mục đích xử lý

Dữ liệu được dùng để tạo và quản lý tài khoản, cung cấp các tính năng EduSchedule, phân quyền, gửi thông báo liên quan đến dịch vụ, xử lý yêu cầu gói và thanh toán, sao lưu khi được bật, hỗ trợ người dùng, ngăn chặn lạm dụng và đáp ứng nghĩa vụ pháp luật. Trung tâm quyết định nội dung dữ liệu học viên và người liên hệ được nhập vào hệ thống; đơn vị vận hành xử lý dữ liệu này để cung cấp dịch vụ theo cấu hình và yêu cầu hợp lệ của trung tâm.

## 3. Tích hợp Google và bên cung cấp dịch vụ

Nếu bạn chọn đăng nhập bằng Google, ứng dụng nhận thông tin định danh tài khoản do Google cung cấp để xác thực và liên kết tài khoản EduSchedule. Nếu người dùng có quyền kết nối Google Calendar, ứng dụng yêu cầu quyền đối với sự kiện lịch để tạo, cập nhật hoặc xóa các buổi học được đồng bộ; dữ liệu sự kiện có thể gồm tên lớp, giáo viên, phòng, thời gian và ghi chú. Nếu đơn vị vận hành bật sao lưu Google Drive, ứng dụng sử dụng tài khoản Google do quản trị viên hệ thống kết nối và quyền tạo/quản lý tệp do ứng dụng tạo để tải bản sao lưu của trung tâm lên Drive của tài khoản đó. Mã truy cập và mã làm mới Google được lưu để duy trì kết nối; thao tác ngắt kết nối trong ứng dụng xóa các mã này khỏi tài khoản EduSchedule tương ứng. Bạn cũng có thể thu hồi quyền truy cập của EduSchedule trong tài khoản Google; việc ngắt kết nối hoặc thu hồi không tự xóa các sự kiện hoặc tệp đã tạo trên Google. Dữ liệu Google chỉ được dùng cho chức năng được cho phép, không dùng để bán hoặc phục vụ quảng cáo cá nhân hóa.

Dữ liệu có thể được chuyển cho nhà cung cấp hạ tầng lưu trữ, cơ sở dữ liệu, gửi email/thông báo và cổng thanh toán khi tính năng tương ứng được dùng; cũng có thể được cung cấp khi pháp luật yêu cầu. Một số nhà cung cấp hoặc máy chủ có thể ở ngoài Việt Nam. Việc xử lý dữ liệu qua Google còn chịu sự điều chỉnh của chính sách riêng của Google.

## 4. Lưu trữ và bảo vệ dữ liệu

Dữ liệu được lưu trong thời gian tài khoản hoặc trung tâm sử dụng dịch vụ và trong thời gian cần thiết để thực hiện nghĩa vụ pháp luật, giải quyết giao dịch, khiếu nại hoặc tranh chấp. Bản sao lưu và nhật ký có thể tồn tại thêm theo chu kỳ lưu trữ vận hành. Hệ thống dùng các biện pháp như phân quyền, giới hạn truy cập và bảo vệ thông tin đăng nhập; không hệ thống nào bảo đảm an toàn tuyệt đối. Trung tâm cần quản lý quyền truy cập của nhân sự và chỉ chia sẻ dữ liệu cho người có thẩm quyền.

## 5. Quyền và lựa chọn của bạn

Bạn có thể xem hoặc cập nhật một số thông tin trong ứng dụng, ngắt kết nối Google Calendar và yêu cầu truy cập, sửa, hạn chế xử lý, rút lại sự đồng ý hoặc xóa dữ liệu theo quy định áp dụng. Với dữ liệu học viên do trung tâm nhập, vui lòng liên hệ trung tâm trước; bạn cũng có thể liên hệ đơn vị vận hành qua thông tin ở cuối trang. Yêu cầu được xem xét cùng nghĩa vụ lưu trữ và quyền của người khác. Rút lại quyền Google có thể làm dừng đồng bộ hoặc sao lưu tương ứng.

## 6. Thay đổi chính sách

Khi thay đổi cách xử lý dữ liệu hoặc chính sách, đơn vị vận hành sẽ cập nhật nội dung và ngày hiệu lực trên trang này; nếu thay đổi đáng kể, sẽ thông báo theo cách phù hợp trước khi áp dụng khi pháp luật yêu cầu.`,

  PRIVACY_POLICY_EN: `This policy explains how the EduSchedule operator identified at the top of this page handles data when you visit the website and use the center management service. Official contact details appear at the bottom of this page. Centers using EduSchedule are responsible for giving appropriate information and instructions to their students, parents and staff when entering their data.

## 1. Data we process

Depending on the features used, data may include names, email addresses, phone numbers and login details; center, branch and staff information; student, parent, teacher, class, schedule, attendance, tuition, payment and note records; support requests and activity history. The service also processes IP addresses, browser and device information, access logs and data needed to maintain sessions, protect accounts and diagnose incidents. Centers should enter only data needed for their work, especially when it concerns children.

## 2. Why we process it

Data is used to create and manage accounts, provide EduSchedule features, control access, send service notices, handle plan requests and payments, make backups when enabled, support users, prevent abuse and meet legal obligations. Centers decide what student and contact data they enter. The operator processes that data to provide the service according to the center's settings and valid instructions.

## 3. Google integrations and service providers

If you choose Google sign-in, the app receives Google account identity information to authenticate you and link your EduSchedule account. If an authorized user connects Google Calendar, the app requests access to calendar events to create, update or delete synchronized class sessions. Event data may include class, teacher, room, time and notes. If the operator enables Google Drive backup, the app uses a Google account connected by a system administrator and permission to create and manage app-created files to upload center backups to that account's Drive. Google access and refresh tokens are stored to maintain the connection; disconnecting in the app removes those tokens from the corresponding EduSchedule account. You can also revoke EduSchedule's access in your Google account. Disconnecting or revoking access does not automatically remove events or files already created on Google. Google user data is used only for authorized features, not sold or used for personalized advertising.

Data may be provided to hosting, database, email or notification providers and payment processors when the relevant feature is used, or disclosed when required by law. Some providers or servers may be outside Vietnam. Google's own policies also apply to data processed by Google.

## 4. Retention and security

Data is kept while an account or center uses the service and as needed to meet legal obligations, settle transactions, handle complaints or resolve disputes. Backups and logs may remain for an additional period under operational retention cycles. The service uses measures such as access controls, restricted permissions and protection of login information; no system can guarantee absolute security. Centers must manage staff access and share data only with authorized people.

## 5. Your choices and rights

You can view or update some information in the app, disconnect Google Calendar, and request access, correction, restriction, withdrawal of consent or deletion where applicable law provides. For student data entered by a center, contact the center first; you may also contact the operator using the details below. Requests are assessed alongside retention duties and other people's rights. Revoking Google access may stop the related synchronization or backup feature.

## 6. Changes to this policy

If data practices or this policy change, the operator will update the text and effective date on this page and give further notice before material changes where required by law.`,

  TERMS_OF_SERVICE_VI: `Các điều khoản này áp dụng cho việc truy cập website và sử dụng EduSchedule do đơn vị vận hành nêu ở đầu trang cung cấp. Khi tạo tài khoản hoặc sử dụng dịch vụ, bạn xác nhận đã đọc các điều khoản này và có quyền đại diện cho trung tâm nếu đăng ký thay trung tâm. Nếu không đồng ý, vui lòng ngừng sử dụng và liên hệ đơn vị vận hành qua thông tin ở cuối trang.

## 1. Dịch vụ và tài khoản

EduSchedule cung cấp công cụ quản lý trung tâm, bao gồm lớp học, học viên, giáo viên, lịch, điểm danh, học phí và những tính năng được hiển thị trong gói đang sử dụng. Tính năng và giới hạn của từng gói được công bố trong ứng dụng. Người dùng cần cung cấp thông tin chính xác, bảo vệ tài khoản và chỉ cấp quyền cho người cần sử dụng. Trung tâm chịu trách nhiệm về hoạt động của tài khoản do mình quản lý và thông báo kịp thời khi nghi ngờ bị truy cập trái phép.

## 2. Dữ liệu do trung tâm cung cấp

Trung tâm chịu trách nhiệm về tính hợp pháp, chính xác và quyền nhập, sử dụng dữ liệu của học viên, phụ huynh, giáo viên và nhân sự. Không nhập dữ liệu vượt quá nhu cầu quản lý hoặc nội dung vi phạm pháp luật, quyền của người khác. Đơn vị vận hành xử lý dữ liệu để cung cấp dịch vụ theo Chính sách bảo mật; trung tâm cần quản lý phân quyền, xuất và lưu giữ dữ liệu phục vụ nghĩa vụ riêng của mình.

## 3. Gói, thanh toán và thay đổi

Gói miễn phí và gói trả phí có chức năng, giới hạn, giá và kỳ thanh toán theo thông tin hiển thị tại thời điểm chọn gói. Việc chọn gói khi đăng ký chỉ ghi nhận lựa chọn để xem lại; yêu cầu nâng cấp được gửi sau khi quản trị viên xác nhận. Việc kích hoạt gói trả phí phụ thuộc vào quy trình xác nhận thanh toán hoặc xử lý yêu cầu tương ứng được nêu tại bước thanh toán. Giá, thuế (nếu áp dụng), phương thức thanh toán và điều kiện gia hạn cần được kiểm tra trên màn hình xác nhận trước khi thực hiện. Trường hợp hủy, hoàn tiền hoặc điều chỉnh hóa đơn được xử lý theo thỏa thuận giao dịch, quy định hiển thị tại thời điểm mua và pháp luật áp dụng; vui lòng liên hệ đơn vị vận hành để được hướng dẫn.

## 4. Sử dụng phù hợp

Không dùng dịch vụ để truy cập trái phép, phát tán mã độc, gây quá tải, dò quét, xâm phạm dữ liệu của trung tâm khác hoặc vi phạm pháp luật. Đơn vị vận hành có thể hạn chế truy cập cần thiết để bảo vệ hệ thống, điều tra sự cố hoặc thực hiện yêu cầu hợp pháp và sẽ thông báo khi phù hợp.

## 5. Tích hợp và tính sẵn có

Các tích hợp Google Calendar, Google Drive, email, thông báo và cổng thanh toán phụ thuộc vào việc cấu hình, quyền truy cập và hệ thống của bên thứ ba. Người dùng có thể phải chấp thuận điều kiện của bên thứ ba. Đơn vị vận hành cố gắng duy trì dịch vụ ổn định nhưng có thể cần bảo trì hoặc xử lý sự cố; thay đổi quan trọng ảnh hưởng tới người dùng sẽ được thông báo theo cách phù hợp.

## 6. Chấm dứt và dữ liệu

Trung tâm có thể liên hệ đơn vị vận hành để yêu cầu ngừng sử dụng, nhận hướng dẫn xuất dữ liệu hoặc xử lý dữ liệu còn lưu. Việc ngừng dịch vụ không tự động xóa dữ liệu hoặc miễn các khoản phải trả đã phát sinh. Yêu cầu xóa được xử lý theo Chính sách bảo mật, thỏa thuận với trung tâm và nghĩa vụ lưu trữ theo pháp luật.

## 7. Khiếu nại và thay đổi điều khoản

Vui lòng gửi thắc mắc hoặc khiếu nại tới thông tin liên hệ ở cuối trang. Các bên ưu tiên trao đổi để giải quyết; nếu không giải quyết được, áp dụng cơ quan có thẩm quyền và pháp luật Việt Nam. Khi điều khoản thay đổi, phiên bản và ngày hiệu lực mới sẽ được đăng trên trang này; việc tiếp tục sử dụng sau ngày hiệu lực chịu sự điều chỉnh của phiên bản mới trong phạm vi pháp luật cho phép.`,

  TERMS_OF_SERVICE_EN: `These terms govern access to the website and use of EduSchedule provided by the operator identified at the top of this page. By creating an account or using the service, you confirm that you have read these terms and are authorized to act for a center if registering on its behalf. If you disagree, stop using the service and contact the operator using the details below.

## 1. Service and accounts

EduSchedule provides center management tools, including classes, students, teachers, schedules, attendance and tuition, plus the features shown for your current plan. Features and plan limits are displayed in the app. Users must provide accurate information, protect their accounts and grant access only to people who need it. Centers are responsible for activity under accounts they manage and should report suspected unauthorized access promptly.

## 2. Center data

Centers are responsible for the lawfulness and accuracy of student, parent, teacher and staff data they enter, and for having the right to use it. Do not enter data beyond management needs or content that violates the law or others' rights. The operator processes data to provide the service under the Privacy Policy. Centers should manage permissions and export and retain records needed for their own obligations.

## 3. Plans, payments and changes

Free and paid plans have the features, limits, prices and billing periods displayed when a plan is selected. Selecting a plan during registration only records it for later review; an upgrade request is sent after an administrator confirms. Paid-plan activation depends on the payment confirmation or request handling process shown at checkout. Review prices, any applicable taxes, payment method and renewal conditions on the confirmation screen before proceeding. Cancellations, refunds and invoice adjustments are handled under the transaction agreement, terms shown at purchase and applicable law; contact the operator for instructions.

## 4. Acceptable use

Do not use the service for unauthorized access, malware, overload, scanning, access to another center's data or unlawful conduct. The operator may limit access when necessary to protect the service, investigate incidents or comply with lawful requests, with notice when appropriate.

## 5. Integrations and availability

Google Calendar, Google Drive, email, notifications and payment integrations depend on configuration, permissions and third-party systems. Users may also need to accept third-party terms. The operator aims to maintain service availability but may need to perform maintenance or respond to incidents; material changes affecting users will be communicated as appropriate.

## 6. Ending use and handling data

Centers may contact the operator to request closure, guidance on exporting data or handling stored data. Ending service does not automatically erase data or waive charges already incurred. Deletion requests are handled under the Privacy Policy, agreements with the center and legal retention duties.

## 7. Complaints and changes

Send questions or complaints to the contact details below. The parties should first seek to resolve disputes through discussion; unresolved matters are subject to the competent authorities and laws of Vietnam. If these terms change, the new version and effective date will be posted here; continued use after that date is governed by the updated version to the extent allowed by law.`,
} as const satisfies Pick<
  SystemSettings,
  'PRIVACY_POLICY_VI' | 'PRIVACY_POLICY_EN' | 'TERMS_OF_SERVICE_VI' | 'TERMS_OF_SERVICE_EN'
>;

export function fillMissingLegalDrafts(settings: SystemSettings): SystemSettings {
  const filled = { ...settings };
  for (const key of Object.keys(LEGAL_DRAFTS) as Array<keyof typeof LEGAL_DRAFTS>) {
    if (!filled[key]?.trim()) filled[key] = LEGAL_DRAFTS[key];
  }
  return filled;
}
