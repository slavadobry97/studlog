
export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: 'Преподаватель' | 'Модератор' | 'Администратор';
  department?: string | null;
}

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  ExcusedAbsent = 'ExcusedAbsent',
  Unmarked = 'Unmarked'
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.Present]: 'Присутствовал',
  [AttendanceStatus.Absent]: 'Отсутствовал (неув.)',
  [AttendanceStatus.ExcusedAbsent]: 'Отсутствовал (уваж.)',
  [AttendanceStatus.Unmarked]: 'Не отмечен',
};

export const ATTENDANCE_STATUS_CHARS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.Present]: 'П',
  [AttendanceStatus.Absent]: 'Н',
  [AttendanceStatus.ExcusedAbsent]: 'У',
  [AttendanceStatus.Unmarked]: '-',
};

export interface Student {
  id: number;
  name: string;
  avatarUrl?: string;
  group: string;
}

export interface ScheduleInfo {
  id: number;
  group: string;
  teacher: string;
  subject: string;
  time: string;
  date: string;
  loadType?: string;
  classroom?: string;
}

export interface AbsenceRequest {
  id?: number;
  student_id: number;
  schedule_id: number | null;
  reason_type: string;
  description: string;
  study_form: string;
  direction: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type AttendanceData = {
  [studentId: number]: AttendanceStatus;
};

export type AttendanceRecords = {
  [date: string]: AttendanceData;
};
