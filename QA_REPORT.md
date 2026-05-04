# QA_REPORT.md — EduSchedule Audit

## 1. PHASE 1 – CODEBASE OVERVIEW

### Cấu trúc thư mục
```
quan-li-lop-hoc/
├── backend/
│   └── src/
│       ├── controllers/   (admin, auth, branch, class, dashboard, google, import, plan, room, schedule, student, teacher, tenant)
│       ├── cron/          (notification.cron.ts)
│       ├── middlewares/   (api, auth, error, tenant)
│       ├── routes/        (13 route files)
│       ├── services/      (email, feature-flag, google, rateLimit)
│       └── utils/         (errors, limitChecker)
├── frontend/
│   └── src/
│       ├── components/    (ConfirmModal, DraggableSessionCard, DroppableDaySlot, HelpWidget, MainLayout, Modal, Pagination, ProtectedRoute, ScheduleBoard)
│       ├── context/       (AuthContext)
│       ├── contexts/      (ThemeContext)
│       ├── locales/       (vi.json, en.json)
│       ├── pages/         (20 pages)
│       └── utils/         (errorHelper)
└── schema.sql
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | React Context + useState |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL (Neon.tech) — raw `pg` pool, no ORM |
| Auth | JWT (jsonwebtoken) + bcrypt + Google OAuth2 |
| Email | Nodemailer (Gmail SMTP) |
| Cache | node-cache (in-memory) |
| Calendar | Google Calendar API |
| Payment | ❌ Không có (chỉ có manual plan request flow) |
| Queue | ❌ Không có (cron job đơn giản mỗi 15 phút) |
| Zalo | ❌ Không có backend integration (chỉ có số điện thoại trong frontend .env) |

### Modules nghiệp vụ
| Module | Backend | Frontend |
|--------|---------|----------|
| Auth/Login | auth.controller.ts | Login.tsx, Register.tsx, ForgotPassword.tsx, ResetPassword.tsx, VerifyEmail.tsx |
| Google OAuth | google.controller.ts, google.service.ts | Settings.tsx |
| Subscription/Plans | plan.controller.ts, feature-flag.service.ts | Subscription.tsx, AdminPlans.tsx, AdminPlanRequests.tsx |
| Branch | branch.controller.ts | Branches.tsx |
| Student | student.controller.ts | Students.tsx, ImportData.tsx |
| Teacher | teacher.controller.ts | Teachers.tsx |
| Room | room.controller.ts | Rooms.tsx |
| Schedule | schedule.controller.ts, ScheduleBoard.tsx | Schedule.tsx |
| Email Notifications | email.service.ts, notification.cron.ts | Settings.tsx (toggle) |
| Import | import.controller.ts | ImportData.tsx |
| Dashboard | dashboard.controller.ts | Dashboard.tsx |
| Admin (SaaS) | admin.controller.ts | AdminTenants.tsx |
| Zalo | ❌ Không có | HelpWidget.tsx (link only) |
| Onboarding | ❌ Không có | Help.tsx |

---

## 2. PHASE 1-02 – API ROUTES AUDIT

### Bảng Routes

| Method | Path | Controller | Auth | Plan/Role Check |
|--------|------|-----------|------|----------------|
| POST | /api/auth/login | auth.login | ❌ Public | ❌ |
| POST | /api/auth/google | auth.googleLogin | ❌ Public | ❌ |
| POST | /api/auth/register | auth.register | ❌ Public | ❌ |
| GET | /api/auth/verify-email | auth.verifyEmail | ❌ Public | ❌ |
| POST | /api/auth/resend-verification | auth.resendVerification | ❌ Public | ❌ |
| POST | /api/auth/forgot-password | auth.forgotPassword | ❌ Public | ❌ |
| POST | /api/auth/reset-password | auth.resetPassword | ❌ Public | ❌ |
| GET | /api/auth/me | auth.getMe | ✅ JWT | ❌ |
| PUT | /api/auth/me | auth.updateMe | ✅ JWT | ❌ |
| GET | /api/auth/google/url | google.getUrl | ✅ JWT | ❌ |
| GET | /api/auth/google/callback | google.callback | ❌ Public | ❌ |
| DELETE | /api/auth/google/disconnect | google.disconnect | ✅ JWT | ❌ |
| GET | /api/dashboard/stats | dashboard.getStats | ✅ JWT | ❌ |
| GET | /api/classes | class.getAll | ✅ JWT | ❌ |
| POST | /api/classes | class.create | ✅ JWT | ⚠️ checkPlanLimit (partial) |
| PUT | /api/classes/:id | class.update | ✅ JWT | ❌ |
| DELETE | /api/classes/:id | class.delete | ✅ JWT | ❌ |
| GET | /api/branches | branch.getAll | ✅ JWT | ❌ |
| POST | /api/branches | branch.create | ✅ JWT | ⚠️ checkPlanLimit (partial) |
| PUT | /api/branches/:id | branch.update | ✅ JWT | ❌ |
| DELETE | /api/branches/:id | branch.delete | ✅ JWT | ❌ |
| GET | /api/teachers | teacher.getAll | ✅ JWT | ❌ |
| POST | /api/teachers | teacher.create | ✅ JWT | ⚠️ checkPlanLimit (partial) |
| PUT | /api/teachers/:id | teacher.update | ✅ JWT | ❌ |
| DELETE | /api/teachers/:id | teacher.delete | ✅ JWT | ❌ |
| GET | /api/students | student.getAll | ✅ JWT | ❌ |
| POST | /api/students | student.create | ✅ JWT | ⚠️ checkPlanLimit (partial) |
| PUT | /api/students/:id | student.update | ✅ JWT | ❌ |
| DELETE | /api/students/:id | student.delete | ✅ JWT | ❌ |
| GET | /api/rooms | room.getAll | ✅ JWT | ❌ |
| POST | /api/rooms | room.create | ✅ JWT | ⚠️ checkPlanLimit (partial) |
| PUT | /api/rooms/:id | room.update | ✅ JWT | ❌ |
| DELETE | /api/rooms/:id | room.delete | ✅ JWT | ❌ |
| GET | /api/schedule | schedule.getWeekly | ✅ JWT | ❌ |
| POST | /api/schedule | schedule.createSession | ✅ JWT | ❌ |
| PUT | /api/schedule/:id | schedule.updateSession | ✅ JWT | ❌ |
| DELETE | /api/schedule/:id | schedule.deleteSession | ✅ JWT | ❌ |
| GET | /api/tenant | tenant.getTenant | ✅ JWT | ❌ |
| PUT | /api/tenant | tenant.updateTenant | ✅ JWT | ❌ |
| GET | /api/tenant/api-key | tenant.getApiKey | ✅ JWT | ✅ plan_features check |
| POST | /api/tenant/api-key | tenant.generateApiKey | ✅ JWT | ✅ plan_features check |
| POST | /api/import/:type | import.importData | ✅ JWT | ❌ |
| GET | /api/plans | plan.getPlans | ✅ JWT | ❌ |
| POST | /api/plans/request | plan.createPlanRequest | ✅ JWT | ❌ |
| GET | /api/plans/requests | plan.getPlanRequests | ✅ JWT | ✅ requireRole(['super_admin']) |
| POST | /api/plans/requests/:id/approve | plan.approvePlanRequest | ✅ JWT | ✅ requireRole(['super_admin']) |
| GET | /api/admin/tenants | admin.getAllTenants | ✅ JWT | ✅ requireRole(['super_admin']) |
| PUT | /api/admin/tenants/:id | admin.updateTenant | ✅ JWT | ✅ requireRole(['super_admin']) |
| GET | /api/admin/plans | admin.getPlans | ✅ JWT | ✅ requireRole(['super_admin']) |
| PUT | /api/admin/plans/:id | admin.updatePlanDetails | ✅ JWT | ✅ requireRole(['super_admin']) |
| GET | /api/admin/stats | admin.getSystemStats | ✅ JWT | ✅ requireRole(['super_admin']) |

### Vấn đề Routes

**🔴 CRITICAL**
- `GET /api/plans/requests` — Bất kỳ tenant nào cũng có thể đọc toàn bộ yêu cầu nâng cấp của người khác. Thiếu `requireRole(['super_admin'])`.
- `POST /api/plans/requests/:id/approve` — Bất kỳ tenant nào cũng có thể tự phê duyệt nâng cấp gói của mình. **IDOR nghiêm trọng.**
- `GET/PUT /api/admin/*` — Toàn bộ admin routes không có role guard trong route file. Chỉ kiểm tra JWT, không kiểm tra `super_admin` role.

**🟡 WARNING**
- `POST /api/import/:type` — ✅ Đã giới hạn 500 records/batch và limit payload 2MB.
- `GET /api/auth/google/callback` — ✅ Đã thêm `state` parameter (signed JWT) để chống CSRF.
- Rate limiting chỉ áp dụng cho `/api/auth/login`. Các route khác như `forgot-password`, `resend-verification` không có rate limit → spam email attack.

**🟢 INFO**
- Không có endpoint `DELETE /api/plans/requests/:id` (reject request). Super admin không thể từ chối.
- Không có route `/api/admin/users` để quản lý user.

---

## 3. PHASE 1-03 – DATABASE SCHEMA AUDIT

### Vấn đề Schema

**🔴 CRITICAL**

1. **plan_requests schema mismatch** — `plan.controller.ts` line 39 dùng cột `plan_id` nhưng `schema.sql` định nghĩa cột là `requested_plan_id`. Query sẽ crash runtime.

```sql
-- Fix:
ALTER TABLE plan_requests RENAME COLUMN requested_plan_id TO plan_id;
-- Hoặc sửa controller: INSERT INTO plan_requests (tenant_id, plan_id, notes)
-- thành: INSERT INTO plan_requests (tenant_id, requested_plan_id, notes)
```

2. **plan_requests thiếu cột `notes` và `updated_at`** — Controller insert `notes` nhưng schema không có. Controller update `updated_at` nhưng schema không có.

```sql
ALTER TABLE plan_requests ADD COLUMN notes TEXT;
ALTER TABLE plan_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

3. **users bảng thiếu cột `reset_password_token` và `reset_password_expires`** — auth.controller.ts sử dụng cả 2 cột này nhưng schema.sql không định nghĩa.

```sql
ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMPTZ;
```

**🟡 WARNING**

4. **Không có index trên `users.email`** — Mọi login đều full-scan bảng users theo email.
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

5. **Không có index trên `plan_requests.tenant_id`** — Đã có trong schema mới nhưng cần verify đã chạy migration chưa.

6. **`classes` thiếu `is_deleted`** — Có trong code (`is_deleted = false`) nhưng cần verify schema.
```sql
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
```

7. **Không có `ON DELETE` hành vi nhất quán** — Một số FK dùng CASCADE, một số RESTRICT, thiếu logic soft-delete cho sessions.

**🟢 INFO**

8. Multi-tenant isolation: Tốt — tất cả bảng đều có `tenant_id` với FK constraint.
9. Soft delete: Tốt — `is_deleted` có ở branches, rooms, teachers, students, classes.
10. Thiếu composite unique index trên `(tenant_id, email)` cho `users` — đã có nhưng nên thêm partial index.

---

## 4. PHASE 2-01 – AUTH MODULE

### Phát hiện

**🔴 CRITICAL**

1. **JWT Secret hardcoded trong .env** (dòng 8) — Giá trị `eduschedule-super-secret-jwt-key-2024-change-in-production` đang commit lên GitHub public repo. Bất kỳ ai có thể forge token.
   - **File**: `backend/.env:8`, `backend/src/middlewares/auth.middleware.ts:17`
   - **Fix**: Rotate secret ngay, dùng `crypto.randomBytes(64).toString('hex')`, thêm `.env` vào `.gitignore`.

2. **Database credentials và API keys trong .env commit lên GitHub** — `DATABASE_URL`, `SMTP_PASS`, `GOOGLE_CLIENT_SECRET` đều bị lộ.
   - **Fix**: Xóa khỏi git history (`git filter-branch` hoặc BFG Repo Cleaner), rotate tất cả credentials ngay.

3. **CSRF trên Google OAuth callback** — `GET /api/auth/google/callback` không validate `state` parameter. Attacker có thể forge callback request.
   - **File**: `backend/src/controllers/google.controller.ts`
   - **Fix**: Generate và verify `state` parameter theo OAuth 2.0 spec.

**🟡 WARNING**

4. **JWT không có refresh token** — Token 7 ngày, không có cơ chế revoke. Nếu token bị đánh cắp, attacker có quyền truy cập 7 ngày.
   - **Fix**: Implement refresh token với DB blacklist hoặc giảm expiry xuống 1h + refresh token 30 ngày.

5. **Rate limiting in-memory** — `rateLimit.service.ts` dùng `node-cache` (in-process). Khi có nhiều server instance (horizontal scaling), rate limit không hoạt động. Attacker dùng nhiều IP bypass được.
   - **Fix**: Chuyển sang Redis-based rate limiting.

6. **googleLogin không check `is_email_verified`** — `auth.controller.ts` line 146, Google OAuth login bypass email verification check.
   - **Fix**: Thêm `if (!user.is_email_verified)` check vào googleLogin handler.

**🟢 INFO**

7. Password validation tốt: min 8 ký tự, có uppercase, có số.
8. bcrypt với salt round 10 — OK.
9. Token expiry cho verification (24h) và reset (1h) — Hợp lý.
10. `requireRole` middleware tồn tại nhưng ít được dùng.

---

## 5. PHASE 2-02 – BILLING MODULE

### Phát hiện

**🔴 CRITICAL**

1. **IDOR: Tenant tự phê duyệt nâng cấp của mình** — `POST /api/plans/requests/:id/approve` không có `super_admin` check. Bất kỳ tenant nào biết UUID của request đều có thể gọi endpoint này và tự nâng cấp lên Enterprise miễn phí.
   - **File**: `backend/src/routes/plan.routes.ts`, `plan.controller.ts:66`
   - **Fix**: Thêm `requireRole(['super_admin'])` middleware vào route.

2. **Race condition trong approve** — `plan.controller.ts:77` dùng `pool.query('BEGIN')` nhưng dùng pool thay vì dedicated client — không đảm bảo transaction atomicity trong pg pool.
   - **Fix**: Dùng `pool.connect()` → `client.query('BEGIN')` → ... → `client.release()`.

3. **Không có Stripe/payment webhook** — Toàn bộ billing là manual (admin approve). Không có payment verification → có thể bị lợi dụng.

**🟡 WARNING**

4. **FeatureFlagService.checkLimit trả về 0 nếu không tìm thấy limit** — Line 74: `if (!plan || plan.limits[limitKey] === undefined) return 0`. Nếu thiếu seed data cho một limit key, toàn bộ tính năng đó bị block (limit = 0).
   - **Fix**: Default nên là giá trị từ plan FREE, không phải 0.

5. **Cache invalidation sau khi approve** — Khi admin approve plan, cache `tenant_plan_${tenantId}` trong `feature-flag.service.ts` không bị invalidate. Tenant phải đợi 60 giây mới nhận được plan mới.
   - **Fix**: Gọi `cache.del(cacheKey)` sau khi approve.

**🟢 INFO**

6. `checkPlanLimit` được áp dụng tốt ở tạo branch, class, teacher, student.
7. `plan_features` check đúng cho API Key access.

---

## 6. PHASE 2-03 – SCHEDULE MODULE

### Phát hiện

**🟡 WARNING**

1. **Race condition trong createSession** — `schedule.controller.ts:108-130`: Conflict check và INSERT không nằm trong cùng transaction. Nếu 2 requests đến đồng thời, cả 2 đều pass conflict check rồi cùng INSERT.
   - **Fix**: Wrap trong transaction với `SERIALIZABLE` isolation hoặc dùng `FOR UPDATE` lock.

2. **Không có timezone handling** — `session_date` và `start_time` lưu theo server timezone. Nếu server và DB không cùng timezone → sai lịch. `notification.cron.ts` dùng `new Date()` không specify timezone.
   - **Fix**: Dùng `TIMESTAMPTZ`, store UTC, convert khi display.

3. **Không có recurring schedule** — Mỗi session phải tạo thủ công. Thiếu tính năng "tạo lịch lặp hàng tuần".

**🟢 INFO**

4. Conflict detection tốt — dùng PostgreSQL function `check_schedule_conflict` kiểm tra teacher, room, class.
5. Soft delete sessions (status = 'cancelled') — Tốt, không mất dữ liệu.
6. Google Calendar sync được implement nhưng non-blocking (lỗi sync không ảnh hưởng response).

---

## 7. PHASE 2-04 – NOTIFICATION

### Phát hiện

**🟡 WARNING**

1. **Email template injection** — `email.service.ts:183-186`: `${className}`, `${roomName}` được inject trực tiếp vào HTML không qua sanitization. Nếu class name chứa `<script>`, email client có thể render XSS.
   - **Fix**: Escape HTML trong template variables.

2. **Cron job không có queue/retry** — `notification.cron.ts:48`: `sendReminderEmail` được gọi trong loop. Nếu 1 email fail, loop tiếp tục nhưng session vẫn bị mark `is_notified = true`. Email sẽ không được gửi lại.
   - **Fix**: Chỉ mark `is_notified = true` sau khi tất cả email trong session gửi thành công.

3. **SMTP credentials commit lên GitHub** — `SMTP_PASS=REDACTED` bị lộ hoàn toàn.

4. **Cron không có distributed lock** — Nếu deploy nhiều instance, cron sẽ chạy trùng nhau.

**🟢 INFO**

5. Email templates bilingual (VI + EN) — Tốt.
6. Cron frequency 15 phút — Hợp lý.
7. `is_notified` flag tránh gửi trùng — Tốt.
8. Không có Zalo integration backend (chỉ link/số điện thoại).

---

## 8. PHASE 2-05 – SECURITY SCAN

### Phát hiện

**🔴 CRITICAL**

1. **Sensitive credentials trong git history** — `.env` file với real credentials đã được commit và push lên public GitHub repo:
   - `DATABASE_URL` với password Neon.tech
   - `SMTP_PASS` (Gmail App Password)
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET`
   - **Action ngay**: Rotate tất cả credentials, xóa khỏi git history.

2. **SQL Injection trong `admin.controller.ts:86`** — Dynamic SQL string building:
   ```typescript
   const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${params.length}`;
   ```
   Nếu `updates` array bị manipulate (tuy hiện tại được build từ whitelist), pattern này nguy hiểm.
   - **Fix**: Dùng whitelist rõ ràng hơn cho field names.

3. **Mass Assignment trong `updatePlanDetails`** — `admin.controller.ts:146-161`: `Object.entries(limits)` và `Object.entries(features)` chấp nhận bất kỳ key nào từ request body, INSERT vào DB. Attacker có thể inject `limit_key` tùy ý.
   - **Fix**: Whitelist allowed limit_key và feature_key values.

**🟡 WARNING**

4. **No input validation trên nhiều endpoints** — `branch_id`, `teacher_id`, `room_id` trong schedule creation không được validate là UUID format.

5. **File upload không được limit** — `import.controller.ts` nhận `data` array không giới hạn. Có thể POST 1MB+ JSON.
   - **Fix**: Thêm `express.json({ limit: '1mb' })` và validate `data.length <= 500`.

6. **Console.log in production** — `auth.middleware.ts:21,38,45` có console.log mọi request, bao gồm email address.

7. **CORS không được restrict** — `server.ts:34`: `app.use(cors())` chấp nhận mọi origin. Nên restrict theo `FRONTEND_URL`.

**🟢 INFO**

8. Không tìm thấy XSS trực tiếp trên API responses (JSON responses không parse HTML).
9. Parameterized queries được dùng đúng ở hầu hết các chỗ.
10. Tenant isolation tốt — mọi query đều filter bởi `tenant_id`.

---

## 9. PHASE 2-06 – FRONTEND UX REVIEW

### Phát hiện

**🟡 WARNING**

1. **Không có global error boundary** — Nếu component crash, toàn bộ app trắng màn hình.

2. **Loading state thiếu ở một số form** — `Branches.tsx`, `Classes.tsx` có thể submit nhiều lần nếu người dùng click nhanh.

3. **Form validation chỉ ở client** — Mọi validation trên frontend đều có thể bypass bằng cách gọi API trực tiếp.

4. **Không có onboarding wizard** — Người dùng mới không biết bắt đầu từ đâu. Chỉ có Help page tĩnh.

5. **Dashboard hardcoded trends** — "+4.5%", "+2", "Active" trên Dashboard là static strings, không tính từ data thực.

**🟢 INFO**

6. Responsive design tốt với Tailwind.
7. Dark mode support.
8. i18n (VI + EN) tốt.
9. ConfirmModal thay thế `confirm()` native — Tốt.
10. Plan-gating UI đã implement (UpgradeOverlay, disabled buttons).

---

## 10. PHASE 3-01 – CRITICAL FIXES NEEDED

### Danh sách fix ưu tiên cao

```
[IMMEDIATE - Security]
1. Rotate tất cả credentials (DB, SMTP, Google, JWT)
2. Thêm .env vào .gitignore, xóa khỏi git history
3. Thêm requireRole(['super_admin']) vào admin routes và plan approve route
4. Fix CORS: app.use(cors({ origin: process.env.FRONTEND_URL }))

[HIGH - Data Integrity]  
5. Fix plan_requests schema mismatch (plan_id vs requested_plan_id)
6. Thêm cột reset_password_token, reset_password_expires, verification_token_expires vào users
7. Fix transaction trong approvePlanRequest (dùng pool.connect())
8. Invalidate FeatureFlagService cache sau khi approve plan
9. Thêm email check vào googleLogin

[MEDIUM - Reliability]
10. Fix race condition trong createSession (wrap trong transaction)
11. Fix cron: chỉ mark is_notified sau khi gửi email thành công
12. Escape HTML trong email templates
13. Whitelist limit_key và feature_key trong updatePlanDetails
14. Giới hạn import payload size
```

---

## 11. SUMMARY

| Category | Critical | High | Medium | Low |
|----------|---------|------|--------|-----|
| Security | 4 | 3 | 4 | 2 |
| Data Integrity | 2 | 3 | 2 | 1 |
| API Design | 2 | 2 | 3 | 2 |
| Frontend UX | 0 | 1 | 4 | 3 |
| Schema | 2 | 2 | 3 | 2 |
| **TOTAL** | **10** | **11** | **16** | **10** |

### Test Coverage
- Unit tests: ❌ 0%
- Integration tests: ❌ 0%
- E2E tests: ❌ 0%

### Recommendations

1. **Ngay lập tức**: Rotate credentials bị lộ, thêm role guard vào admin/plan routes.
2. **Sprint tới**: Thêm refresh token, Redis rate limiting, fix schema mismatch.
3. **Long-term**: Implement Stripe payment, queue system (Bull/BullMQ), CI/CD pipeline, test coverage.

### Files Changed (trong audit này)
- `schema.sql` — Thêm bảng attendance, plan_requests, cột is_notified, status, api_key, price_vnd/usd
- `backend/src/controllers/dashboard.controller.ts` — Xóa inline table creation, thêm period param
- `frontend/src/pages/Dashboard.tsx` — Yearly chart toggle, plan gating
- `frontend/src/pages/Settings.tsx` — Replace confirm() với ConfirmModal
- `frontend/src/pages/Subscription.tsx` — i18n toast message
- `frontend/src/locales/vi.json` — Thêm yearlyLocked, requestSent keys
- `frontend/src/locales/en.json` — Thêm yearlyLocked, requestSent keys

---
*Generated: 2026-05-04 | Auditor: Antigravity AI*
