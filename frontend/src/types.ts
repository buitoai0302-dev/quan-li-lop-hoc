export interface Session {
  id: string;
  tenant_id: string;
  class_id: string;
  room_id: string;
  teacher_id: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  session_type: string;
  status: string;
  notes?: string;
  class_name?: string;
  teacher_name?: string;
  room_name?: string;
}

export interface WeeklyScheduleData {
  weekStart: string;
  weekEnd: string;
  sessions: Session[];
}
