import pool from '../src/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const runSeed = async () => {
  console.log('--- START SEEDING DEMO TENANT ---');
  
  try {
    // 1. Check if demo admin already exists
    const adminEmail = 'demo-schedule@gmail.com';
    const checkUser = await pool.query('SELECT id, tenant_id FROM users WHERE email = $1', [adminEmail]);
    if (checkUser.rowCount && checkUser.rowCount > 0) {
      console.log(`User ${adminEmail} already exists. Deleting the old tenant data...`);
      await pool.query('DELETE FROM tenants WHERE id = $1', [checkUser.rows[0].tenant_id]);
      console.log('Old tenant data deleted.');
    }

    // 2. Create Tenant (Using PRO plan for multi-branch)
    const planRes = await pool.query("SELECT id FROM plan_definitions WHERE code = 'PRO'");
    const planId = planRes.rows[0].id;

    const tenantRes = await pool.query(
      `INSERT INTO tenants (plan_id, name, contact_email, status, is_active) 
       VALUES ($1, $2, $3, 'active', true) RETURNING id`,
      [planId, 'Trung tâm Anh ngữ Demo', adminEmail]
    );
    const tenantId = tenantRes.rows[0].id;
    console.log(`Created Tenant: ${tenantId}`);

    // 3. Create Admin User
    const passwordHash = await bcrypt.hash('123456', 10);
    const adminRes = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active, is_email_verified)
       VALUES ($1, $2, $3, $4, 'admin', true, true) RETURNING id`,
      [tenantId, adminEmail, passwordHash, 'Demo Admin']
    );
    console.log(`Created Admin User: ${adminEmail}`);

    // 4. Create 3 Branches
    const branches = [];
    for (let i = 1; i <= 3; i++) {
      const bRes = await pool.query(
        `INSERT INTO branches (tenant_id, name, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenantId, `Chi nhánh ${i}`, `12${i} Đường Demo, Quận ${i}, TP.HCM`, `090000000${i}`, `branch${i}@demo.com`]
      );
      branches.push(bRes.rows[0].id);
    }
    console.log(`Created 3 Branches`);

    // 5. Create 10 Rooms (3, 3, 4)
    const rooms = [];
    let roomCount = 1;
    for (let i = 0; i < 3; i++) {
      const numRooms = i === 2 ? 4 : 3;
      for (let j = 1; j <= numRooms; j++) {
        const rRes = await pool.query(
          `INSERT INTO rooms (tenant_id, branch_id, name, capacity, room_type) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [tenantId, branches[i], `Phòng ${roomCount}`, 40, 'classroom']
        );
        rooms.push({ id: rRes.rows[0].id, branch_id: branches[i] });
        roomCount++;
      }
    }
    console.log(`Created 10 Rooms`);

    // 6. Create 5 Teachers
    const teachers = [];
    for (let i = 1; i <= 5; i++) {
      const branchId = branches[i % 3]; // Distribute across 3 branches
      const tRes = await pool.query(
        `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenantId, branchId, `Giáo viên Demo ${i}`, `gv${i}@demo.com`, `091000000${i}`, 'IELTS, Tiếng Anh giao tiếp']
      );
      teachers.push(tRes.rows[0].id);

      // Create login account for teacher
      await pool.query(
        `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role, is_active, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, 'teacher', true, true)`,
        [tenantId, branchId, `gv${i}@demo.com`, passwordHash, `Giáo viên Demo ${i}`]
      );
    }
    console.log(`Created 5 Teachers (distributed across branches)`);

    // 7. Create Subjects
    const subRes = await pool.query(
      `INSERT INTO subjects (tenant_id, name, code, description) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, 'Tiếng Anh Giao Tiếp', 'TAGT', 'Chương trình tiếng Anh giao tiếp chuẩn quốc tế giúp học viên tự tin phản xạ']
    );
    const subjectId = subRes.rows[0].id;

    // 8. Create 5 Classes
    const classes = [];
    for (let i = 1; i <= 5; i++) {
      const teacherId = teachers[i - 1]; // 1 teacher per class
      // Teacher branch must match Class branch!
      const teacherRes = await pool.query('SELECT branch_id FROM teachers WHERE id = $1', [teacherId]);
      const branchId = teacherRes.rows[0].branch_id;

      const cRes = await pool.query(
        `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING id`,
        [tenantId, branchId, subjectId, teacherId, `Lớp Giao Tiếp ${i}`, 35, '2026-08-01', '2026-12-31']
      );
      classes.push({ id: cRes.rows[0].id, branch_id: branchId, teacher_id: teacherId });
    }
    console.log(`Created 5 Classes matched with Teachers' branches`);

    // 9. Create 30 Students per class
    let studentCounter = 1;
    for (const cls of classes) {
      for (let i = 1; i <= 30; i++) {
        // Create student
        // Date of birth from 2010 to 2015
        const year = Math.floor(Math.random() * (2015 - 2010 + 1)) + 2010;
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        
        const sRes = await pool.query(
          `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, parent_phone, date_of_birth)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            tenantId, 
            cls.branch_id, 
            `Học sinh Demo ${studentCounter}`, 
            `hs${studentCounter}@demo.com`, 
            `092000${studentCounter.toString().padStart(4, '0')}`,
            `093000${studentCounter.toString().padStart(4, '0')}`,
            `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          ]
        );
        const studentId = sRes.rows[0].id;

        // Enroll to class
        await pool.query(
          `INSERT INTO class_students (tenant_id, class_id, student_id, status) VALUES ($1, $2, $3, 'enrolled')`,
          [tenantId, cls.id, studentId]
        );

        // Create login account for student
        await pool.query(
          `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role, is_active, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, 'student', true, true)`,
          [tenantId, cls.branch_id, `hs${studentCounter}@demo.com`, passwordHash, `Học sinh Demo ${studentCounter}`]
        );

        // Tuitions & Payments
        // Tạo hóa đơn học phí cho học sinh
        const tuitionRes = await pool.query(
          `INSERT INTO tuitions (tenant_id, student_id, class_id, billing_cycle, billing_period, amount, discount, due_date, status)
           VALUES ($1, $2, $3, 'monthly', '2026-08', 2000000, 0, '2026-08-05', 'paid') RETURNING id`,
          [tenantId, studentId, cls.id]
        );
        const tuitionId = tuitionRes.rows[0].id;

        // Đã thanh toán
        await pool.query(
          `INSERT INTO payments (tenant_id, tuition_id, amount_paid, payment_date, payment_method)
           VALUES ($1, $2, 2000000, '2026-08-01', 'bank_transfer')`,
          [tenantId, tuitionId]
        );

        studentCounter++;
      }
    }
    console.log(`Created 150 Students, enrolled them to 5 classes, and added tuition data`);

    // 10. Generate Random Schedules for August 2026 (current month)
    const augDays = Array.from({ length: 31 }, (_, i) => {
      const date = new Date(2026, 7, i + 1); // 2026-08-01 is month index 7
      return date;
    });

    let sessionCount = 0;
    for (const cls of classes) {
      // Find a room in the same branch
      const branchRooms = rooms.filter(r => r.branch_id === cls.branch_id);
      const roomId = branchRooms[0].id;

      // Randomly pick 2 days of the week for this class (e.g., Tue/Thu or Mon/Wed)
      const isMonWed = Math.random() > 0.5;
      const validDays = augDays.filter(d => {
        const day = d.getDay();
        if (isMonWed) return day === 1 || day === 3;
        return day === 2 || day === 4;
      });

      for (const date of validDays) {
        // Date formatting correctly in local time
        const yearStr = date.getFullYear();
        const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = date.getDate().toString().padStart(2, '0');
        const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

        const isEvening = Math.random() > 0.5;
        const startTime = isEvening ? '18:00:00' : '09:00:00';
        const endTime = isEvening ? '19:30:00' : '10:30:00';

        // Add chance session is completed if past
        const isPast = date < new Date();
        const status = isPast ? (Math.random() > 0.1 ? 'completed' : 'cancelled') : 'scheduled';

        const sessionRes = await pool.query(
          `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'lecture', $8, $9) RETURNING id`,
          [tenantId, cls.id, roomId, cls.teacher_id, dateStr, startTime, endTime, status, `Buổi học lý thuyết và thực hành nhóm`]
        );
        const sessionId = sessionRes.rows[0].id;

        // If completed, add attendance
        if (status === 'completed') {
           // Get all students in this class
           const stRes = await pool.query('SELECT student_id FROM class_students WHERE class_id = $1', [cls.id]);
           for (const st of stRes.rows) {
             const attStatus = Math.random() > 0.1 ? 'present' : 'absent'; // 90% present
             await pool.query(
               `INSERT INTO attendance (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, $4)`,
               [tenantId, sessionId, st.student_id, attStatus]
             );
           }
        }

        sessionCount++;
      }
    }
    console.log(`Created ${sessionCount} Sessions for August 2026 and generated attendance records`);

    console.log('--- DEMO SEEDING COMPLETED SUCCESSFULLY ---');
    console.log('Login Email:', adminEmail);
    console.log('Password:', '123456');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo tenant:', error);
    process.exit(1);
  }
};

runSeed();
