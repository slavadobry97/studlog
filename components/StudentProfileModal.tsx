
import React, { useMemo } from 'react';
import { Student, AttendanceStatus, ATTENDANCE_STATUS_LABELS, ScheduleInfo } from '../types/index';
import Avatar from './Avatar';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';

const getISODateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Raw record type as used in the database
type RawAttendanceRecord = { id: number; student_id: number; status: AttendanceStatus; schedule_id: number | null; date: string };

interface StudentProfileModalProps {
    student: Student;
    rawAttendance: RawAttendanceRecord[];
    schedules: ScheduleInfo[];
    onClose: () => void;
    onOpenAbsenceDetails?: () => void;
}

const CalendarView: React.FC<{
    studentId: number,
    rawAttendance: RawAttendanceRecord[],
    schedules: ScheduleInfo[],
    year: number,
    month: number
}> = ({ studentId, rawAttendance, schedules, year, month }) => {
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const todayISO = getISODateString(new Date());

    // Pre-process data for faster lookup: Date -> Array of Details
    const dailyDetailsMap = useMemo(() => {
        const map = new Map<string, Array<{ subject: string; time: string; status: AttendanceStatus | null; scheduleId: number }>>();

        const studentAttendance = rawAttendance.filter(r => r.student_id === studentId);

        studentAttendance.forEach(record => {
            if (!record.schedule_id) return;
            const scheduleItem = schedules.find(s => s.id === record.schedule_id);
            if (scheduleItem) {
                if (!map.has(scheduleItem.date)) {
                    map.set(scheduleItem.date, []);
                }
                map.get(scheduleItem.date)!.push({
                    subject: scheduleItem.subject,
                    time: scheduleItem.time,
                    status: record.status,
                    scheduleId: scheduleItem.id
                });
            }
        });

        map.forEach(items => {
            items.sort((a, b) => a.time.localeCompare(b.time));
        });

        return map;
    }, [rawAttendance, schedules, studentId]);

    const getDayContent = (dateKey: string) => {
        const details = dailyDetailsMap.get(dateKey);
        if (!details || details.length === 0) return { style: {}, classes: 'bg-muted/30 text-muted-foreground border-transparent' };

        const counts = {
            [AttendanceStatus.Present]: 0,
            [AttendanceStatus.Absent]: 0,
            [AttendanceStatus.ExcusedAbsent]: 0,
        };

        details.forEach(d => {
            if (d.status) counts[d.status]++;
        });

        const total = details.length;

        if (counts.Present === total) return { style: {}, classes: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
        if (counts.Absent === total) return { style: {}, classes: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' };
        if (counts.ExcusedAbsent === total) return { style: {}, classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' };

        let gradientParts = [];
        let currentDeg = 0;

        const addPart = (count: number, color: string) => {
            if (count > 0) {
                const deg = (count / total) * 360;
                gradientParts.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`);
                currentDeg += deg;
            }
        };

        const isDark = document.documentElement.classList.contains('dark');

        addPart(counts[AttendanceStatus.Present], isDark ? '#15803d' : '#86efac');
        addPart(counts[AttendanceStatus.Absent], isDark ? '#b91c1c' : '#fca5a5');
        addPart(counts[AttendanceStatus.ExcusedAbsent], isDark ? '#1d4ed8' : '#93c5fd');

        return {
            style: { background: `conic-gradient(${gradientParts.join(', ')})` },
            classes: 'text-foreground font-bold border-transparent'
        };
    };

    return (
        <div>
            <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-2">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                {days.map(day => {
                    const currentDate = new Date(year, month, day);
                    const dateKey = getISODateString(currentDate);
                    const isToday = dateKey === todayISO;
                    const isFuture = dateKey > todayISO;
                    const details = dailyDetailsMap.get(dateKey);

                    const { style, classes } = isFuture ? { style: {}, classes: 'opacity-30 cursor-not-allowed' } : getDayContent(dateKey);

                    return (
                        <div
                            key={day}
                            className={`
                                relative group w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium border transition-all
                                ${classes} 
                                ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background font-bold' : ''}
                            `}
                            style={style}
                        >
                            <span className="relative z-10 drop-shadow-sm">{day}</span>

                            {details && details.length > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                    <div className="font-semibold mb-2 border-b pb-1 text-center">{currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                                    <div className="space-y-2">
                                        {details.map((d, idx) => (
                                            <div key={idx} className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-left">{d.subject}</span>
                                                    <span className="text-[10px] text-muted-foreground text-left">{d.time}</span>
                                                </div>
                                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === AttendanceStatus.Present ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                    d.status === AttendanceStatus.Absent ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                        d.status === AttendanceStatus.ExcusedAbsent ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {d.status ? ATTENDANCE_STATUS_LABELS[d.status].split(' ')[0] : '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, rawAttendance, schedules, onClose, onOpenAbsenceDetails }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    const LegendItem: React.FC<{ color: string, label: string }> = ({ color, label }) => (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${color}`}></div>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-profile-title"
        >
            <div
                className="relative bg-background w-full max-w-2xl m-4 rounded-lg border shadow-lg flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b">
                    <div className="flex items-start gap-4">
                        <Avatar name={student.name} avatarUrl={student.avatarUrl} className="w-20 h-20 border-2 border-primary/20" textClassName="text-3xl" />
                        <div>
                            <h2 id="student-profile-title" className="text-xl font-semibold tracking-tight">{student.name}</h2>
                            <p className="text-sm text-muted-foreground mt-1">{student.group}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold">Календарь посещаемости - {monthNames[currentMonth]}</h3>
                            {onOpenAbsenceDetails && (
                                <Button
                                    variant="link"
                                    onClick={onOpenAbsenceDetails}
                                    className="h-auto p-0 text-primary"
                                >
                                    Полная статистика →
                                </Button>
                            )}
                        </div>
                        <CalendarView
                            studentId={student.id}
                            rawAttendance={rawAttendance}
                            schedules={schedules}
                            year={currentYear}
                            month={currentMonth}
                        />
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                            <LegendItem color="bg-green-500/20 text-green-600 border border-green-500/20" label="Присутствовал" />
                            <LegendItem color="bg-red-500/20 text-red-600 border border-red-500/20" label="Отсутствовал (неув.)" />
                            <LegendItem color="bg-blue-500/20 text-blue-600 border border-blue-500/20" label="Отсутствовал (уваж.)" />
                            <LegendItem color="bg-gradient-to-br from-green-300 via-red-300 to-blue-300 border border-transparent" label="Смешанный статус" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end p-6 border-t">
                    <Button variant="secondary" onClick={onClose}>
                        Закрыть
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground opacity-70 hover:opacity-100 h-8 w-8"
                    aria-label="Закрыть"
                >
                    <IconX className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

export default StudentProfileModal;
