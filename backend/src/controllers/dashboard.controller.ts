import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    if (role === 'teacher') {
      let email = (req as any).user?.email;
      if (!email && userId) {
        const u = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        email = u.rows[0]?.email;
      }
      
      const teacherRes = await pool.query('SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
      if (teacherRes.rows.length === 0) {
        return res.json({ activeClasses: 0, upcomingSessions: 0, students: 0 });
      }
      const teacherId = teacherRes.rows[0].id;

      const [classesRes, sessionsRes, studentsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM classes WHERE teacher_id = $1 AND status = 'active' AND is_deleted = false`, [teacherId]),
        pool.query(`SELECT COUNT(*) FROM schedule_sessions WHERE teacher_id = $1 AND session_date >= CURRENT_DATE AND status != 'cancelled'`, [teacherId]),
        pool.query(`SELECT COUNT(DISTINCT student_id) FROM class_students cs JOIN classes c ON cs.class_id = c.id WHERE c.teacher_id = $1 AND cs.status = 'enrolled' AND c.is_deleted = false`, [teacherId])
      ]);

      return res.json({
        activeClasses: parseInt(classesRes.rows[0].count, 10),
        upcomingSessions: parseInt(sessionsRes.rows[0].count, 10),
        students: parseInt(studentsRes.rows[0].count, 10)
      });
    }

    if (role === 'student') {
      let email = (req as any).user?.email;
      if (!email && userId) {
        const u = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        email = u.rows[0]?.email;
      }

      const studentRes = await pool.query('SELECT id FROM students WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
      if (studentRes.rows.length === 0) {
        return res.json({ enrolledClasses: 0, upcomingSessions: 0 });
      }
      const studentId = studentRes.rows[0].id;

      const [classesRes, sessionsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM class_students WHERE student_id = $1 AND status = 'enrolled'`, [studentId]),
        pool.query(`SELECT COUNT(*) FROM schedule_sessions s JOIN class_students cs ON s.class_id = cs.class_id WHERE cs.student_id = $1 AND s.session_date >= CURRENT_DATE AND s.status != 'cancelled' AND cs.status = 'enrolled'`, [studentId])
      ]);

      return res.json({
        enrolledClasses: parseInt(classesRes.rows[0].count, 10),
        upcomingSessions: parseInt(sessionsRes.rows[0].count, 10)
      });
    }

    // Default for admin/staff
    const [classesRes, teachersRes, studentsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND status = 'active' AND is_deleted = false`, [tenantId]),
      pool.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`, [tenantId]),
      pool.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND is_active = true AND is_deleted = false`, [tenantId])
    ]);

    res.json({
      activeClasses: parseInt(classesRes.rows[0].count, 10),
      teachers: parseInt(teachersRes.rows[0].count, 10),
      students: parseInt(studentsRes.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
