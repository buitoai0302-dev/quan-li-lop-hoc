-- Refuse to install these constraints if existing records already cross tenant boundaries.
-- Repair any reported rows in a reviewed migration before retrying.
ALTER TABLE branches ADD CONSTRAINT uq_branches_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE students ADD CONSTRAINT uq_students_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE teachers ADD CONSTRAINT uq_teachers_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE subjects ADD CONSTRAINT uq_subjects_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE rooms ADD CONSTRAINT uq_rooms_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE classes ADD CONSTRAINT uq_classes_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE schedule_sessions ADD CONSTRAINT uq_sessions_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE tuitions ADD CONSTRAINT uq_tuitions_tenant_id UNIQUE (tenant_id, id);

ALTER TABLE students ADD CONSTRAINT fk_students_tenant_branch
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches (tenant_id, id);
ALTER TABLE teachers ADD CONSTRAINT fk_teachers_tenant_branch
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches (tenant_id, id);
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_tenant_branch
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE classes ADD CONSTRAINT fk_classes_tenant_branch
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches (tenant_id, id);
ALTER TABLE classes ADD CONSTRAINT fk_classes_tenant_subject
  FOREIGN KEY (tenant_id, subject_id) REFERENCES subjects (tenant_id, id);
ALTER TABLE class_students ADD CONSTRAINT fk_enrollments_tenant_class
  FOREIGN KEY (tenant_id, class_id) REFERENCES classes (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE class_students ADD CONSTRAINT fk_enrollments_tenant_student
  FOREIGN KEY (tenant_id, student_id) REFERENCES students (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE schedule_sessions ADD CONSTRAINT fk_sessions_tenant_class
  FOREIGN KEY (tenant_id, class_id) REFERENCES classes (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE schedule_sessions ADD CONSTRAINT fk_sessions_tenant_teacher
  FOREIGN KEY (tenant_id, teacher_id) REFERENCES teachers (tenant_id, id);
ALTER TABLE schedule_sessions ADD CONSTRAINT fk_sessions_tenant_room
  FOREIGN KEY (tenant_id, room_id) REFERENCES rooms (tenant_id, id);
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_tenant_session
  FOREIGN KEY (tenant_id, session_id) REFERENCES schedule_sessions (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_tenant_student
  FOREIGN KEY (tenant_id, student_id) REFERENCES students (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE tuitions ADD CONSTRAINT fk_tuitions_tenant_student
  FOREIGN KEY (tenant_id, student_id) REFERENCES students (tenant_id, id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_payments_tenant_tuition
  FOREIGN KEY (tenant_id, tuition_id) REFERENCES tuitions (tenant_id, id) ON DELETE CASCADE;
