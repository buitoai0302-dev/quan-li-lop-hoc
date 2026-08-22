import nodemailer from 'nodemailer';

// Escape user-controlled strings before injecting into HTML templates
const escapeHtml = (str: string): string =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const logPreviewUrl = (info: any) => {
  if (!process.env.SMTP_USER || process.env.SMTP_HOST === 'smtp.ethereal.email') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('\n📧 EMAIL PREVIEW URL (dev only):', previewUrl, '\n');
    }
  }
};

// ─── Shared HTML Helpers ────────────────────────────────────────────────────

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>EduSchedule</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">📚 EduSchedule</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Hệ thống Quản lý Trung tâm Giáo dục · Education Center Management</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              © ${new Date().getFullYear()} EduSchedule · Hệ thống Quản lý Trung tâm Giáo dục<br/>
              Đây là email tự động, vui lòng không trả lời · This is an automated email, please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const divider = `<hr style="border:none;border-top:2px dashed #e2e8f0;margin:32px 0;" />`;

const button = (url: string, viLabel: string, enLabel: string, color = '#3b82f6') => `
<div style="text-align:center;margin:28px 0;">
  <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.2px;">
    ${viLabel} · ${enLabel}
  </a>
</div>
<p style="text-align:center;font-size:12px;color:#94a3b8;margin:0;">
  Nếu nút không hoạt động, hãy copy link sau vào trình duyệt · If the button doesn't work, copy this link:<br/>
  <a href="${url}" style="color:#3b82f6;word-break:break-all;">${url}</a>
</p>`;

// ─── Send Verification Email (Generic) ─────────────────────────────────────────

export const sendVerificationEmail = async (to: string, token: string) => {
  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const body = `
    <!-- VI -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔐 Xác thực tài khoản của bạn</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Chào bạn, cảm ơn đã đăng ký <strong>EduSchedule</strong>! Vui lòng nhấn nút bên dưới để xác thực địa chỉ email của bạn.
    </p>
    <p style="color:#f59e0b;font-size:13px;margin:0 0 4px;">⚠️ Link này sẽ hết hạn sau <strong>24 giờ</strong>.</p>

    ${divider}

    <!-- EN -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔐 Verify your account</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Hello, thank you for registering with <strong>EduSchedule</strong>! Please click the button below to verify your email address.
    </p>
    <p style="color:#f59e0b;font-size:13px;margin:0 0 20px;">⚠️ This link will expire in <strong>24 hours</strong>.</p>

    ${button(verifyLink, 'Xác Thực Email', 'Verify Email')}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduSchedule" <${process.env.SMTP_USER || 'no-reply@eduschedule.com'}>`,
      to,
      subject: '[EduSchedule] Xác thực email · Verify your email',
      html: emailWrapper(body),
    });
    logPreviewUrl(info);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// ─── Send Teacher Welcome Email ───────────────────────────────────────────────

export const sendTeacherWelcomeEmail = async (to: string, token: string, fullName: string) => {
  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const defaultPassword = to.split('@')[0];

  const body = `
    <!-- VI -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🎉 Chào mừng Giáo viên ${escapeHtml(fullName)}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Bạn vừa được thêm vào hệ thống quản lý giáo dục <strong>EduSchedule</strong>. Dưới đây là thông tin đăng nhập tạm thời của bạn:
    </p>
    
    <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>📧 Email:</strong> ${to}</p>
      <p style="margin:0;font-size:14px;"><strong>🔑 Mật khẩu mặc định:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${defaultPassword}</code></p>
    </div>

    <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">
      <strong>Lưu ý:</strong> Vui lòng nhấn nút bên dưới để xác thực email trước khi đăng nhập. Bạn nên đổi mật khẩu ngay sau khi đăng nhập thành công.
    </p>

    ${divider}

    <!-- EN -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🎉 Welcome Teacher ${escapeHtml(fullName)}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      You have been added to <strong>EduSchedule</strong> management system. Here are your temporary login credentials:
    </p>
    <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>📧 Email:</strong> ${to}</p>
      <p style="margin:0;font-size:14px;"><strong>🔑 Default Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${defaultPassword}</code></p>
    </div>
    
    <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">
      <strong>Note:</strong> Please click the button below to verify your email before logging in. You should change your password immediately after successful login.
    </p>

    ${button(verifyLink, 'Kích Hoạt Tài Khoản', 'Activate Account')}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduSchedule" <${process.env.SMTP_USER || 'no-reply@eduschedule.com'}>`,
      to,
      subject: '[EduSchedule] Chào mừng giáo viên mới · Welcome to the team',
      html: emailWrapper(body),
    });
    logPreviewUrl(info);
  } catch (error) {
    console.error('Error sending teacher welcome email:', error);
    throw error;
  }
};

// ─── Send Password Reset Email ────────────────────────────────────────────────

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const body = `
    <!-- VI -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔑 Đặt lại mật khẩu</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản gắn với email này. Nhấn nút bên dưới để tạo mật khẩu mới.
    </p>
    <p style="color:#ef4444;font-size:13px;margin:0 0 4px;">⚠️ Link này sẽ hết hạn sau <strong>1 giờ</strong>.</p>

    ${divider}

    <!-- EN -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔑 Reset your password</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      We received a request to reset the password for the account associated with this email. Click the button below to create a new password.
    </p>
    <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">⚠️ This link will expire in <strong>1 hour</strong>.</p>

    ${button(resetLink, 'Đặt Lại Mật Khẩu', 'Reset Password', '#f59e0b')}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduSchedule" <${process.env.SMTP_USER || 'no-reply@eduschedule.com'}>`,
      to,
      subject: '[EduSchedule] Đặt lại mật khẩu · Reset your password',
      html: emailWrapper(body),
    });
    logPreviewUrl(info);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// ─── Send New User Password Email (Admin tạo tài khoản) ───────────────────────────────────────

export const sendNewUserPasswordEmail = async (to: string, fullName: string, password: string) => {
  const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const body = `
    <!-- VI -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔐 Tài khoản của bạn đã được tạo</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Xin chào <strong>${escapeHtml(fullName)}</strong>, tài khoản của bạn trên <strong>EduSchedule</strong> đã được tạo bởi quản trị viên. Dưới đây là thông tin đăng nhập tạm thời:
    </p>
    <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>📧 Email:</strong> ${escapeHtml(to)}</p>
      <p style="margin:0;font-size:14px;"><strong>🔑 Mật khẩu tạm thời:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(password)}</code></p>
    </div>
    <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">⚠️ <strong>Lưu ý:</strong> Đây là mật khẩu tạm thời. Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>

    ${divider}

    <!-- EN -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">🔐 Your account has been created</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Hello <strong>${escapeHtml(fullName)}</strong>, your account on <strong>EduSchedule</strong> has been created by an administrator. Here are your temporary login credentials:
    </p>
    <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>📧 Email:</strong> ${escapeHtml(to)}</p>
      <p style="margin:0;font-size:14px;"><strong>🔑 Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(password)}</code></p>
    </div>
    <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">⚠️ <strong>Note:</strong> This is a temporary password. Please change it immediately after your first login.</p>

    ${button(loginLink, 'Đăng Nhập Ngay', 'Login Now')}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduSchedule" <${process.env.SMTP_USER || 'no-reply@eduschedule.com'}>`,
      to,
      subject: '[EduSchedule] Thông tin tài khoản mới · Your new account credentials',
      html: emailWrapper(body),
    });
    logPreviewUrl(info);
  } catch (error) {
    console.error('Error sending new user password email:', error);
    // Không throw — việc tạo user đã thành công, email lỗi chỉ là warning
  }
};

// ─── Send Reminder Email ──────────────────────────────────────────────────────

export const sendReminderEmail = async (to: string, sessionDetails: any) => {
  const { className, date, startTime, endTime, roomName } = sessionDetails;
  const safeClassName = escapeHtml(className || '');
  const safeRoomName = escapeHtml(roomName || '');
  const safeStartTime = escapeHtml(startTime || '');
  const safeEndTime = endTime ? escapeHtml(endTime) : '';

  const dateObj = new Date(date);
  const viDate = dateObj.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const enDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
    <!-- VI -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">⏰ Nhắc nhở: Buổi học sắp bắt đầu</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Bạn có một buổi học sắp diễn ra. Hãy chuẩn bị và tham gia đúng giờ!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;padding:0;margin-bottom:8px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>📚 Lớp học:</strong> ${safeClassName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>🏫 Phòng học:</strong> ${safeRoomName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>📅 Ngày:</strong> ${viDate}</p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>🕐 Giờ:</strong> ${safeStartTime}${safeEndTime ? ' – ' + safeEndTime : ''}</p>
      </td></tr>
    </table>

    ${divider}

    <!-- EN -->
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">⏰ Reminder: Upcoming class session</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
      You have an upcoming class session. Please be prepared and join on time!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;padding:0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>📚 Class:</strong> ${safeClassName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>🏫 Room:</strong> ${safeRoomName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b;"><strong>📅 Date:</strong> ${enDate}</p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>🕐 Time:</strong> ${safeStartTime}${safeEndTime ? ' – ' + safeEndTime : ''}</p>
      </td></tr>
    </table>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduSchedule Notifier" <${process.env.SMTP_USER || 'no-reply@eduschedule.com'}>`,
      to,
      subject: `[EduSchedule] ⏰ Nhắc nhở lịch học: ${safeClassName} · Class reminder`,
      html: emailWrapper(body),
    });
    logPreviewUrl(info);
    return true;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return false;
  }
};
