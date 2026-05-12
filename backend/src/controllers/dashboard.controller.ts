import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuthenticationError } from '../utils/errors';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const role = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    // 1. Priority: Super Admin always sees global stats
    if (role === 'super_admin') {
      // Return global system stats for global super admin
      const [tenantsRes, studentsRes, classesRes, teachersRes, activitiesRes, attendanceRateRes] =
        await Promise.all([
          pool.query('SELECT COUNT(*) FROM tenants'),
          pool.query('SELECT COUNT(*) FROM students WHERE is_deleted = false'),
          pool.query('SELECT COUNT(*) FROM classes WHERE is_deleted = false'),
          pool.query('SELECT COUNT(*) FROM teachers WHERE is_deleted = false'),
          pool.query(`
          (SELECT 'student' as type, full_name as user, 'vừa đăng ký học' as action, '' as target, created_at FROM students ORDER BY created_at DESC LIMIT 5)
          UNION ALL
          (SELECT 'tenant' as type, name as user, 'vừa gia nhập hệ thống' as action, '' as target, created_at FROM tenants ORDER BY created_at DESC LIMIT 5)
          ORDER BY created_at DESC LIMIT 10
        `),
          pool.query(
            `SELECT ROUND(AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END)) as rate FROM attendance WHERE created_at > CURRENT_DATE - INTERVAL '30 days'`
          ),
        ]);

      return res.json({
        activeClasses: parseInt(classesRes.rows[0].count, 10),
        teachers: parseInt(teachersRes.rows[0].count, 10),
        students: parseInt(studentsRes.rows[0].count, 10),
        tenants: parseInt(tenantsRes.rows[0].count, 10),
        overallAttendance: parseInt(attendanceRateRes.rows[0].rate || 0, 10),
        plan: 'SUPER ADMIN',
        isGlobal: true,
        recentActivities: activitiesRes.rows.map((r) => ({
          id: r.created_at,
          user: r.user,
          action: r.action,
          target: r.target,
          time: r.created_at,
          type: r.type,
        })),
        usage: {
          students: { used: parseInt(studentsRes.rows[0].count, 10), limit: -1 },
          classes: { used: parseInt(classesRes.rows[0].count, 10), limit: -1 },
          branches: { used: parseInt(tenantsRes.rows[0].count, 10), limit: -1 },
        },
      });
    }

    // 2. Otherwise, requires a tenantId
    if (!tenantId) {
      throw new AuthenticationError();
    }

    if (role === 'teacher') {
      let email = (req as any).user?.email;
      if (!email && userId) {
        const u = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        email = u.rows[0]?.email;
      }

      const teacherRes = await pool.query(
        'SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );
      if (teacherRes.rows.length === 0) {
        return res.json({ activeClasses: 0, upcomingSessions: 0, students: 0 });
      }
      const teacherId = teacherRes.rows[0].id;

      const [classesRes, sessionsRes, studentsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) FROM classes WHERE teacher_id = $1 AND status = 'active' AND is_deleted = false`,
          [teacherId]
        ),
        pool.query(
          `SELECT COUNT(*) FROM schedule_sessions WHERE teacher_id = $1 AND session_date >= CURRENT_DATE AND status != 'cancelled'`,
          [teacherId]
        ),
        pool.query(
          `SELECT COUNT(DISTINCT student_id) FROM class_students cs JOIN classes c ON cs.class_id = c.id WHERE c.teacher_id = $1 AND cs.status = 'enrolled' AND c.is_deleted = false`,
          [teacherId]
        ),
      ]);

      return res.json({
        activeClasses: parseInt(classesRes.rows[0].count, 10),
        upcomingSessions: parseInt(sessionsRes.rows[0].count, 10),
        students: parseInt(studentsRes.rows[0].count, 10),
      });
    }

    if (role === 'student') {
      let email = (req as any).user?.email;
      if (!email && userId) {
        const u = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        email = u.rows[0]?.email;
      }

      const studentRes = await pool.query(
        'SELECT id FROM students WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );
      if (studentRes.rows.length === 0) {
        return res.json({ enrolledClasses: 0, upcomingSessions: 0 });
      }
      const studentId = studentRes.rows[0].id;

      const [classesRes, sessionsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) FROM class_students WHERE student_id = $1 AND status = 'enrolled'`,
          [studentId]
        ),
        pool.query(
          `SELECT COUNT(*) FROM schedule_sessions s JOIN class_students cs ON s.class_id = cs.class_id WHERE cs.student_id = $1 AND s.session_date >= CURRENT_DATE AND s.status != 'cancelled' AND cs.status = 'enrolled'`,
          [studentId]
        ),
      ]);

      return res.json({
        enrolledClasses: parseInt(classesRes.rows[0].count, 10),
        upcomingSessions: parseInt(sessionsRes.rows[0].count, 10),
      });
    }

    // Default for admin/staff
    const period = (req.query.period as string) === 'yearly' ? 12 : 6;
    const [
      classesRes,
      teachersRes,
      studentsRes,
      trendsRes,
      distributionRes,
      activitiesRes,
      attendanceRes,
      attendanceRateRes,
      tenantRes,
      prevStudentsRes,
      prevClassesRes,
      upcomingRes,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND status = 'active' AND is_deleted = false`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`,
        [tenantId]
      ),
      // Student trends by period
      pool.query(
        `
        SELECT 
          TO_CHAR(created_at, 'Mon') as month,
          COUNT(*) as count,
          EXTRACT(MONTH FROM created_at) as month_num,
          EXTRACT(YEAR FROM created_at) as year
        FROM students 
        WHERE tenant_id = $1 AND created_at > CURRENT_DATE - INTERVAL '${period} months'
        GROUP BY month, month_num, year
        ORDER BY year, month_num
      `,
        [tenantId]
      ),
      // Class distribution by status
      pool.query(
        `
        SELECT status, COUNT(*) as count 
        FROM classes 
        WHERE tenant_id = $1 AND is_deleted = false
        GROUP BY status
      `,
        [tenantId]
      ),
      // Recent Activities (Combined)
      pool.query(
        `
        (SELECT 'student' as type, full_name as user, 'vừa đăng ký học' as action, '' as target, created_at FROM students WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 3)
        UNION ALL
        (SELECT 'class' as type, name as user, 'vừa được khởi tạo' as action, '' as target, created_at FROM classes WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 2)
        ORDER BY created_at DESC
      `,
        [tenantId]
      ),
      // Real attendance trends (By Day of Week)
      pool.query(
        `
        SELECT 
          TO_CHAR(created_at, 'Dy') as day,
          ROUND(AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END)) as rate
        FROM attendance
        WHERE tenant_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days'
        GROUP BY day
      `,
        [tenantId]
      ),
      // Overall attendance rate for header
      pool.query(
        `
        SELECT ROUND(AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END)) as rate
        FROM attendance
        WHERE tenant_id = $1 AND created_at > CURRENT_DATE - INTERVAL '30 days'
      `,
        [tenantId]
      ),
      // Tenant info
      pool.query(
        `
        SELECT p.code as plan_code, p.id as plan_id,
               (SELECT COUNT(*) FROM branches WHERE tenant_id = $1 AND is_deleted = false) as branch_count
        FROM tenants t
        LEFT JOIN plan_definitions p ON t.plan_id = p.id
        WHERE t.id = $1
      `,
        [tenantId]
      ),
      // Previous period students (for trend %)
      pool.query(
        `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND is_active = true AND is_deleted = false AND created_at < CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId]
      ),
      // Previous period classes
      pool.query(
        `SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND status = 'active' AND is_deleted = false AND created_at < CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId]
      ),
      // Upcoming sessions count
      pool.query(
        `SELECT COUNT(*) FROM schedule_sessions WHERE tenant_id = $1 AND session_date >= CURRENT_DATE AND status != 'cancelled'`,
        [tenantId]
      ),
    ]);

    const tenantInfo = tenantRes.rows[0];
    const planId = tenantInfo?.plan_id;

    // Fetch plan limits from plan_limits table
    const limitsRes = planId
      ? await pool.query('SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = $1', [
          planId,
        ])
      : { rows: [] as any[] };
    const limits: Record<string, number> = (limitsRes.rows as any[]).reduce(
      (acc: any, row: any) => {
        acc[row.limit_key] = row.limit_value;
        return acc;
      },
      {}
    );

    // Calculate real trend percentages (vs previous 30 days)
    const currentStudents = parseInt(studentsRes.rows[0].count, 10);
    const prevStudents = parseInt(prevStudentsRes.rows[0].count, 10);
    const currentClasses = parseInt(classesRes.rows[0].count, 10);
    const prevClasses = parseInt(prevClassesRes.rows[0].count, 10);

    const calcTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? `+${current}` : '—';
      const diff = current - previous;
      const pct = ((diff / previous) * 100).toFixed(1);
      return diff >= 0 ? `+${pct}%` : `${pct}%`;
    };

    res.json({
      activeClasses: currentClasses,
      teachers: parseInt(teachersRes.rows[0].count, 10),
      students: currentStudents,
      upcomingSessions: parseInt(upcomingRes.rows[0].count, 10),
      studentTrend: calcTrend(currentStudents, prevStudents),
      classTrend: calcTrend(currentClasses, prevClasses),
      studentTrends: trendsRes.rows.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
      classDistribution: distributionRes.rows.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      recentActivities: activitiesRes.rows.map((r) => ({
        id: r.created_at,
        user: r.user,
        action: r.action,
        target: r.target,
        time: r.created_at,
        type: r.type,
      })),
      attendanceTrends:
        attendanceRes.rows.length > 0
          ? attendanceRes.rows
          : [
              { day: 'Mon', rate: 0 },
              { day: 'Tue', rate: 0 },
              { day: 'Wed', rate: 0 },
              { day: 'Thu', rate: 0 },
              { day: 'Fri', rate: 0 },
              { day: 'Sat', rate: 0 },
              { day: 'Sun', rate: 0 },
            ],
      overallAttendance: parseInt(attendanceRateRes.rows[0]?.rate || 0, 10),
      plan: tenantInfo?.plan_code || 'FREE',
      usage: {
        students: { used: currentStudents, limit: limits.max_students ?? -1 },
        classes: { used: currentClasses, limit: limits.max_classes ?? -1 },
        branches: {
          used: parseInt(tenantInfo?.branch_count || 0, 10),
          limit: limits.max_branches ?? -1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let sql = '';
    let countSql = '';
    const params: any[] = [tenantId];

    if (userRole === 'teacher') {
      // Find teacher_id
      const teacherRes = await pool.query(
        'SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2',
        [userEmail, tenantId]
      );
      if (teacherRes.rows.length === 0)
        return res.json({ activities: [], pagination: { total: 0, page, limit, totalPages: 0 } });
      const teacherId = teacherRes.rows[0].id;

      // Teachers only see students enrolled in their classes and their own class creation (if any)
      sql = `
        SELECT * FROM (
          (SELECT 'student' as type, s.full_name as user, 'vừa gia nhập lớp của bạn' as action, c.name as target, cs.enrolled_at as created_at 
           FROM class_students cs 
           JOIN students s ON cs.student_id = s.id 
           JOIN classes c ON cs.class_id = c.id 
           WHERE c.teacher_id = $1 AND c.tenant_id = $2 AND s.is_deleted = false)
          UNION ALL
          (SELECT 'class' as type, name as user, 'vừa được gán cho bạn' as action, '' as target, created_at 
           FROM classes WHERE teacher_id = $1 AND tenant_id = $2 AND is_deleted = false)
        ) combined
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      countSql = `
        SELECT COUNT(*) FROM (
          (SELECT cs.id FROM class_students cs JOIN classes c ON cs.class_id = c.id WHERE c.teacher_id = $1 AND c.tenant_id = $2)
          UNION ALL
          (SELECT id FROM classes WHERE teacher_id = $1 AND tenant_id = $2)
        ) combined
      `;
      params.unshift(teacherId); // Add teacherId to front [teacherId, tenantId]
      params.push(limit, offset); // [teacherId, tenantId, limit, offset]
    } else {
      // Admin/Staff see everything
      sql = `
        SELECT * FROM (
          (SELECT 'student' as type, full_name as user, 'vừa đăng ký học' as action, '' as target, created_at FROM students WHERE tenant_id = $1 AND is_deleted = false)
          UNION ALL
          (SELECT 'class' as type, name as user, 'vừa được khởi tạo' as action, '' as target, created_at FROM classes WHERE tenant_id = $1 AND is_deleted = false)
          UNION ALL
          (SELECT 'teacher' as type, full_name as user, 'vừa tham gia đội ngũ' as action, '' as target, created_at FROM teachers WHERE tenant_id = $1 AND is_deleted = false)
        ) combined
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      countSql = `
        SELECT COUNT(*) FROM (
          (SELECT id FROM students WHERE tenant_id = $1 AND is_deleted = false)
          UNION ALL
          (SELECT id FROM classes WHERE tenant_id = $1 AND is_deleted = false)
          UNION ALL
          (SELECT id FROM teachers WHERE tenant_id = $1 AND is_deleted = false)
        ) combined
      `;
      params.push(limit, offset); // [tenantId, limit, offset]
    }

    const [activitiesRes, countRes] = await Promise.all([
      pool.query(sql, params),
      pool.query(
        countSql,
        [userRole === 'teacher' ? params[0] : params[0], tenantId].slice(
          0,
          userRole === 'teacher' ? 2 : 1
        )
      ),
    ]);

    // Wait, the countSql params are tricky. Let's simplify.
    const countParams = userRole === 'teacher' ? [params[0], params[1]] : [params[0]];
    const countResult = await pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      activities: activitiesRes.rows.map((r) => ({
        id: r.created_at + r.user + r.action,
        user: r.user,
        action: r.action,
        target: r.target,
        time: r.created_at,
        type: r.type,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
