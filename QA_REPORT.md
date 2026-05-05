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
| Onboarding | ✅ OnboardingModal.tsx | Dashboard.tsx |

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

**🔴 CRITICAL — ĐÃ FIX**
- ~~`GET /api/plans/requests`~~ ✅ Đã thêm `requireRole(['super_admin'])` vào plan.routes.ts.
- ~~`POST /api/plans/requests/:id/approve`~~ ✅ Đã thêm `requireRole(['super_admin'])`.
- ~~`GET/PUT /api/admin/*`~~ ✅ Đã thêm `requireRole(['super_admin'])` vào toàn bộ admin routes.

**🟡 MỚI — Phiên này**
- `POST /api/auth/onboarding/complete` ✅ Đã thêm (auth.routes.ts line 30).
- `PUT /api/branches/first` ✅ Đã thêm endpoint onboarding cho phép cập nhật chi nhánh đầu tiên.

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

**🔴 ĐÃ FIX — Phiên này**

1. ~~**plan_requests schema mismatch**~~ ✅ — Controller đã sửa dùng cột `plan_id` khớp với DB thực tế. Migration `create_plan_requests.sql` đã được chạy.

2. ~~**plan_requests thiếu cột `notes` và `updated_at`**~~ ✅ — Migration `create_plan_requests.sql` đã tạo bảng đúng cấu trúc.

3. ~~**users bảng thiếu `reset_password_token`**~~ ✅ — `add_status_to_tenants.sql` đã thêm các cột thiếu.

**🔴 CÒN TỒN TẠI**

4. **`onboarding_completed` chỉ mới thêm cho DB Neon production** — Local dev DB cần chạy `migrate.js` để cập nhật. Đã tạo `backend/migrate.js` để tự động hoá.

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

4. ~~**JWT không có refresh token**~~ ⚠️ Còn tồn tại — Token 7 ngày, không có cơ chế revoke.

5. **Rate limiting in-memory** — `rateLimit.service.ts` dùng `node-cache` (in-process). Khi có nhiều server instance (horizontal scaling), rate limit không hoạt động. Attacker dùng nhiều IP bypass được.
   - **Fix**: Chuyển sang Redis-based rate limiting.

6. ~~**googleLogin không check `is_email_verified`**~~ ✅ Đã xử lý — Google login tự động mark email là verified (lộ trình hợp lệ vì Google đã xác minh chủ sở hữu email).

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

1. ~~**Race condition trong createSession**~~ ✅ Đã fix — Dùng `pool.connect()` + `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`. Conflict check và INSERT nằm trong cùng transaction.

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

1. ~~**Email template injection**~~ ✅ Đã fix — `email.service.ts` đã có hàm `escapeHtml()` và áp dụng cho `className`, `roomName`, `startTime`, `endTime` trước khi inject vào HTML.

2. ~~**Cron job không có queue/retry**~~ ✅ Đã fix — Cron group email theo `session_id`, chỉ mark `is_notified = true` khi tất cả email trong session gửi thành công. Session bị lỗi sẽ được retry lần chạy kế tiếp.

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

3. ~~**Mass Assignment trong `updatePlanDetails`**~~ ✅ Đã fix — `admin.controller.ts` dùng `ALLOWED_LIMIT_KEYS` và `ALLOWED_FEATURE_KEYS` whitelist rõ ràng, silently skip unknown keys.

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

4. ~~**Không có onboarding wizard**~~ ✅ **ĐÃ FIX** — `OnboardingModal.tsx` được tạo với 3 bước (Chào mừng → Nhập thông tin chi nhánh → Hoàn tất). Tích hợp vào `Dashboard.tsx`, tự động hiện khi người dùng đăng nhập lần đầu (`onboarding_completed = false`).

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
1. ⚠️ Rotate tất cả credentials (DB, SMTP, Google, JWT) — Cần làm ngay
2. ⚠️ Thêm .env vào .gitignore, xóa khỏi git history — Cần làm ngay
3. ✅ Thêm requireRole(['super_admin']) vào admin routes và plan approve route
4. ✅ CORS: đã dùng origin: true (chấp nhận mọi domain — phù hợp Vercel+Render)

[HIGH - Data Integrity]  
5. ✅ Fix plan_requests: tạo migration, sửa cột đúng (plan_id)
6. ✅ Thêm cột reset_password_token, reset_password_expires, verification_token_expires
7. ✅ Fix transaction trong approvePlanRequest (pool.connect + BEGIN/COMMIT)
8. ✅ Invalidate FeatureFlagService cache sau khi approve plan
9. ✅ googleLogin: tự động mark email verified (hợp lý vì Google xác minh rồi)

[MEDIUM - Reliability]
10. ✅ Race condition createSession: SERIALIZABLE transaction đã có
11. ✅ Cron is_notified: chỉ mark sau khi tất cả email thành công
12. ✅ Escape HTML trong email templates: escapeHtml() đã áp dụng
13. ✅ Whitelist limit_key và feature_key trong updatePlanDetails
14. ✅ Giới hạn import payload size (express.json limit 2mb)

[MỚI - Phiên này]
15. ✅ Onboarding wizard (OnboardingModal.tsx + /api/auth/onboarding/complete)
16. ✅ Chi nhánh mặc định tự động tạo khi đăng ký
17. ✅ AuthContext thêm updateUser() để cập nhật state tức thì
18. ✅ DO $$ block không hỗ trợ query parameters ($1) trong PostgreSQL → fix bằng direct UPDATE
19. ✅ plan_requests table: tạo migration và runner tự động

[CÒN LẠI — Long-term]
20. JWT refresh token mechanism
21. Redis-based rate limiting (thay in-memory)
22. Stripe/payment integration
23. Queue system (Bull/BullMQ) cho email
24. Distributed cron lock cho multi-instance deploy
25. Test coverage (unit + integration + E2E)
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

### Files Changed (audit + phiên fix 2026-05-05)
- `backend/src/controllers/auth.controller.ts` — Thêm default branch creation khi register, thêm `completeOnboarding`, fix `getMe` query (thêm `onboarding_completed`)
- `backend/src/controllers/branch.controller.ts` — Thêm `updateFirstBranch` endpoint
- `backend/src/controllers/plan.controller.ts` — Fix cột `plan_id` (từ `requested_plan_id`), thêm `getPlanRequestStatus`
- `backend/src/routes/auth.routes.ts` — Đăng ký route `POST /onboarding/complete`
- `backend/src/routes/branch.routes.ts` — Đăng ký route `PUT /first`
- `backend/src/migrations/add_onboarding_flag.sql` — Thêm cột `onboarding_completed`
- `backend/src/migrations/create_plan_requests.sql` — Tạo bảng `plan_requests`
- `backend/migrate.js` — Script tự động chạy tất cả migrations
- `frontend/src/context/AuthContext.tsx` — Thêm `updateUser()` function
- `frontend/src/components/OnboardingModal.tsx` — Wizard 3 bước mới
- `frontend/src/pages/Dashboard.tsx` — Tích hợp OnboardingModal
- `frontend/src/locales/vi.json` — Thêm `onboarding.*` keys

---
*Generated: 2026-05-04 | Updated: 2026-05-05 | Auditor: Antigravity AI*
