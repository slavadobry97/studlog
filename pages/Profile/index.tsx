
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, ScheduleInfo, Student, AttendanceStatus } from '../../types/index';
import Avatar from '../../components/Avatar';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import ThemeToggle from '../../components/ThemeToggle';
import UserNav from '../../components/UserNav';
import DatePicker from '../../components/DatePicker';
import GroupFilter from '../../components/GroupFilter';
import MonthFilter from '../../components/MonthFilter';
import SubjectFilter from '../../components/SubjectFilter';
import AbsenceDetailModal from '../../components/AbsenceDetailModal';
import DisciplineDetailModal from '../../components/DisciplineDetailModal';
import { Badge } from '../../components/ui/badge';
import { THRESHOLDS } from '../../constants';

import ProfileSkeleton from '../../components/ProfileSkeleton';
import MonthlyAbsenceCell from '../../components/MonthlyAbsenceCell';
import RiskGroupsCard from '../../components/RiskGroupsCard';
import WeekdayHeatmap from '../../components/WeekdayHeatmap';
import UnmarkedClassesCard from '../../components/UnmarkedClassesCard';
import {
    IconAlertTriangle,
    IconAlertCircle,
    IconCircleCheck,
    IconGrid3x3,
    IconClock,
    IconBook,
    IconUsers,
    IconActivity,
    IconFileText,
    IconChevronDown
} from '@tabler/icons-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Types ---
type RawAttendanceRecord = { id: number; student_id: number; status: AttendanceStatus; schedule_id: number | null; date: string };
type MonthlyAbsenceDetail = { date: string; type: 'absent' | 'excused'; subject: string; reason?: string };
type StudentAbsenceStat = { student: Student; absent: number; excused: number; monthlyData?: Map<string, MonthlyAbsenceDetail[]> };


// Helper to format date consistently
const getISODateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Reusable Components ---
const StatCard: React.FC<{
    label: string;
    value: string | number;
    subtext?: string;
    valueColor?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
}> = ({ label, value, subtext, valueColor = 'text-foreground', icon, onClick }) => (
    <div
        className={`flex h-full flex-col justify-between rounded-lg border bg-card p-4 text-center ${onClick ? 'cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md' : ''}`}
        onClick={onClick}
    >
        <div>
            {icon && <div className="flex justify-center mb-2">{icon}</div>}
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <div className="h-4"> {/* Placeholder for subtext to maintain height */}
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
    </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col space-y-1 leading-none">
                        <span className="text-[11px] uppercase text-muted-foreground">Группа</span>
                        <span className="font-bold text-muted-foreground">{label}</span>
                    </div>
                    <div className="flex flex-col space-y-1 leading-none">
                        <span className="text-[11px] uppercase text-muted-foreground">Посещаемость</span>
                        <span className="font-bold text-foreground">{`${payload[0].value.toFixed(1)}%`}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// --- Main Page Component ---
interface ProfilePageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    onToggleTheme: () => void;
    onNavigateToJournal: (scheduleId: number, date: Date, fromUnmarked?: boolean) => void;
    onNavigateToJournalHome: () => void;
    onNavigateToUserManagement: () => void;
    onNavigateToRequests: () => void;
    onNavigateToSystemHealth?: () => void;
    showStatsOnProfileLoad: boolean;
    showUnmarkedOnProfileLoad: boolean;
    onProfileLoadStateConsumed: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout, theme, onToggleTheme, onNavigateToJournal, onNavigateToJournalHome, onNavigateToUserManagement, onNavigateToRequests, onNavigateToSystemHealth, showStatsOnProfileLoad, showUnmarkedOnProfileLoad, onProfileLoadStateConsumed }) => {
    const [schedule, setSchedule] = useState<ScheduleInfo[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [rawAttendanceRecords, setRawAttendanceRecords] = useState<RawAttendanceRecord[]>([]);

    // Loading states
    const [initialLoading, setInitialLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [showStats, setShowStats] = useState(showStatsOnProfileLoad);
    const [viewingAbsencesFor, setViewingAbsencesFor] = useState<Student | null>(null);
    const [viewingDiscipline, setViewingDiscipline] = useState<string | null>(null);

    const [viewDate, setViewDate] = useState(new Date());
    const today = new Date();
    // Fixed date range: from September 1st of current academic year to today
    const currentYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1; // Academic year starts in September
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    const startDate = academicYearStart;
    const endDate = today;
    const [reportSelectedGroup, setReportSelectedGroup] = useState('all');
    const [reportSelectedSubject, setReportSelectedSubject] = useState('all');
    const [reportSelectedMonth, setReportSelectedMonth] = useState('all'); // 'all' or 'YYYY-MM'
    const [showUnmarked, setShowUnmarked] = useState(false); // Collapsed by default
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);


    const groupsChartRef = useRef<HTMLDivElement>(null);
    const subjectsTableRef = useRef<HTMLDivElement>(null);

    const handleScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Auto-open unmarked section when returning from attendance
    useEffect(() => {
        if (showUnmarkedOnProfileLoad) {
            setShowUnmarked(true);
            onProfileLoadStateConsumed();
        }
    }, [showUnmarkedOnProfileLoad, onProfileLoadStateConsumed]);

    const isPrivileged = user.role === 'Администратор' || user.role === 'Модератор';
    const isAdmin = user.role === 'Администратор';

    useEffect(() => {
        if (showStatsOnProfileLoad) {
            onProfileLoadStateConsumed();
        }
    }, [showStatsOnProfileLoad, onProfileLoadStateConsumed]);

    // Fetch pending requests count for admins
    useEffect(() => {
        if (isPrivileged) {
            supabase
                .from('absence_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .then(({ count }) => setPendingRequestsCount(count || 0));
        }
    }, [isPrivileged]);


    // Helper to fetch all pages of data
    const fetchAllPages = async (query: any) => {
        const BATCH_SIZE = 1000;
        let records: any[] = [];
        let page = 0;
        while (true) {
            const { data, error } = await query.range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);
            if (error) throw error;
            if (data) records.push(...data);
            if (!data || data.length < BATCH_SIZE) break;
            page++;
        }
        return records;
    };

    // 1. FAST INITIAL LOAD: Load today's schedule and students list
    const fetchDailyData = useCallback(async () => {
        try {
            const todayStr = getISODateString(viewDate);

            let dailyScheduleQuery = supabase.from('schedule').select('*').eq('date', todayStr);
            if (!isPrivileged) {
                dailyScheduleQuery = dailyScheduleQuery.eq('teacher_name', user.name);
            }

            const [scheduleRes, studentsRes] = await Promise.all([
                fetchAllPages(dailyScheduleQuery),
                fetchAllPages(supabase.from('students').select('*')) // Students list is usually light enough
            ]);

            const mappedSchedule = scheduleRes.map(s => ({
                id: s.id, group: s.group, teacher: s.teacher_name, subject: s.subject, time: s.time, date: s.date,
                loadType: s.load_type || undefined, classroom: s.classroom || undefined
            }));

            // Set initial data to show the dashboard immediately
            setSchedule(prev => {
                // Merge with previous if exists to avoid wipe, or just set if empty
                if (prev.length > scheduleRes.length) return prev;
                return mappedSchedule;
            });
            setStudents(studentsRes);

            setInitialLoading(false); // Enable the UI!

            // Trigger background fetch for full stats
            fetchFullStatistics();

        } catch (err: any) {
            console.error("Fast fetch error:", err);
            setError(`Ошибка загрузки: ${err.message}`);
            setInitialLoading(false);
        }
    }, [user.name, isPrivileged, viewDate]);

    // 2. OPTIMIZED: Load statistics for selected date range only
    const fetchFullStatistics = async () => {
        try {
            const startStr = getISODateString(startDate);
            const endStr = getISODateString(endDate);

            // Build queries with date range filter
            let scheduleQuery = supabase.from('schedule').select('*')
                .gte('date', startStr)
                .lte('date', endStr);

            if (!isPrivileged) {
                scheduleQuery = scheduleQuery.eq('teacher_name', user.name);
            }

            // Fetch only attendance records within the date range
            const attendanceQuery = supabase.from('attendance').select('*')
                .gte('date', startStr)
                .lte('date', endStr);

            // Fetch data in parallel
            const [scheduleRes, attendanceRes] = await Promise.all([
                fetchAllPages(scheduleQuery),
                fetchAllPages(attendanceQuery)
            ]);

            setSchedule(scheduleRes.map(s => ({
                id: s.id, group: s.group, teacher: s.teacher_name, subject: s.subject, time: s.time, date: s.date,
                loadType: s.load_type || undefined, classroom: s.classroom || undefined
            })));

            setRawAttendanceRecords(attendanceRes as RawAttendanceRecord[]);

        } catch (err: any) {
            console.error("Stats fetch error:", err);
            // Silent fail for stats is better than blocking UI
        } finally {
            setStatsLoading(false);
        }
    };

    // Initial mount or date change (if we need to refetch specific day)
    useEffect(() => {
        fetchDailyData();
    }, []); // Run once on mount. Date changes handled by local state unless we need to refetch specific day.

    // If user changes viewDate on dashboard, and we haven't loaded full stats yet, we might miss data.
    // But fetchFullStatistics loads EVERYTHING. So usually we are fine.
    // If user switches date BEFORE background sync finishes, they might see empty.
    // We can add a targeted fetch when viewDate changes if statsLoading is true.
    useEffect(() => {
        if (statsLoading && !initialLoading) {
            // If stats still loading, try to fetch the specific new date to keep UI responsive
            const refreshDay = async () => {
                const dateStr = getISODateString(viewDate);
                // Check if we already have this date in current schedule state
                const hasDataForDate = schedule.some(s => s.date === dateStr);
                if (!hasDataForDate) {
                    let q = supabase.from('schedule').select('*').eq('date', dateStr);
                    if (!isPrivileged) q = q.eq('teacher_name', user.name);
                    const { data } = await q;
                    if (data) {
                        setSchedule(prev => [...prev, ...data.map((s: any) => ({
                            id: s.id, group: s.group, teacher: s.teacher_name, subject: s.subject, time: s.time, date: s.date,
                            loadType: s.load_type || undefined, classroom: s.classroom || undefined
                        }))]);
                    }
                }
            }
            refreshDay();
        }
    }, [viewDate, statsLoading, initialLoading, isPrivileged, user.name]);


    const teacherDashboardSchedule = useMemo(() => {
        if (isPrivileged) return [];
        const dateStr = getISODateString(viewDate);
        return schedule
            .filter(s => s.date === dateStr)
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [schedule, viewDate, isPrivileged]);

    const statisticsData = useMemo(() => {
        // If stats are still loading, return empties to prevent calculation errors on partial data
        if (statsLoading && rawAttendanceRecords.length === 0) {
            return {
                totalClasses: 0, averageAttendance: 0, totalAcademicHours: 0,
                uniqueGroupCount: 0, uniqueSubjectCount: 0, uniqueTeacherCount: 0,
                groupChartData: [], subjectTableData: [], studentAbsenceData: [], uniqueGroupsForReport: [], uniqueSubjectsForReport: [],
                riskGroups: { critical: [], high: [], normal: [] },
                weekdayHeatmap: [],
                unmarkedClasses: []
            };
        }

        const scheduleMap = new Map<number, ScheduleInfo>(schedule.map(s => [s.id, s]));
        const studentMap = new Map<number, Student>(students.map(s => [s.id, s]));

        const startStr = getISODateString(startDate);
        const endStr = getISODateString(endDate);

        const relevantAttendance = rawAttendanceRecords.filter(rec => {
            if (!rec.schedule_id) return false;
            const s = scheduleMap.get(rec.schedule_id);
            if (!s) return false;
            if (!isPrivileged && s.teacher !== user.name) return false;
            return s.date >= startStr && s.date <= endStr;
        });

        let totalPresent = 0, totalAbsent = 0;
        const groupStats: { [g: string]: { p: number; a: number; } } = {};
        const subjectStats: { [s: string]: { p: number; a: number; c: Set<number> } } = {};
        const studentAbsenceStats = new Map<number, StudentAbsenceStat>();
        const conductedClasses = new Set<number>();
        const uniqueTeachers = new Set<string>();

        relevantAttendance.forEach(rec => {
            if (!rec.schedule_id) return;
            const scheduleItem = scheduleMap.get(rec.schedule_id);
            const studentItem = studentMap.get(rec.student_id);
            if (!scheduleItem || !studentItem) return;

            conductedClasses.add(scheduleItem.id);
            uniqueTeachers.add(scheduleItem.teacher);

            const { group, subject } = scheduleItem;
            if (!groupStats[group]) groupStats[group] = { p: 0, a: 0 };
            if (!subjectStats[subject]) subjectStats[subject] = { p: 0, a: 0, c: new Set() };
            subjectStats[subject].c.add(scheduleItem.id);

            if (!studentAbsenceStats.has(studentItem.id)) {
                studentAbsenceStats.set(studentItem.id, { student: studentItem, absent: 0, excused: 0, monthlyData: new Map() });
            }
            const studentStat = studentAbsenceStats.get(studentItem.id)!;

            // Track monthly absences
            const absenceDate = new Date(rec.date);
            const monthKey = `${absenceDate.getFullYear()}-${(absenceDate.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!studentStat.monthlyData) {
                studentStat.monthlyData = new Map();
            }

            if (!studentStat.monthlyData.has(monthKey)) {
                studentStat.monthlyData.set(monthKey, []);
            }

            if (rec.status === AttendanceStatus.Present) { totalPresent++; groupStats[group].p++; subjectStats[subject].p++; }
            else if (rec.status === AttendanceStatus.Absent) {
                totalAbsent++; groupStats[group].a++; subjectStats[subject].a++; studentStat.absent++;
                studentStat.monthlyData.get(monthKey)!.push({
                    date: rec.date,
                    type: 'absent',
                    subject: scheduleItem.subject
                });
            }
            else if (rec.status === AttendanceStatus.ExcusedAbsent) {
                studentStat.excused++;
                studentStat.monthlyData.get(monthKey)!.push({
                    date: rec.date,
                    type: 'excused',
                    subject: scheduleItem.subject
                });
            }
        });

        const totalMarksForRate = totalPresent + totalAbsent;
        const averageAttendance = totalMarksForRate > 0 ? (totalPresent / totalMarksForRate) * 100 : 0;
        const studentAbsenceData = Array.from(studentAbsenceStats.values())
            .filter(d => d.absent > 0 || d.excused > 0)
            .sort((a, b) => a.student.name.localeCompare(b.student.name));

        const uniqueGroupsForReport = ['all', ...Array.from(Object.keys(groupStats)).sort()];
        const uniqueSubjectsForReport = ['all', ...Array.from(Object.keys(subjectStats)).sort()];

        // Calculate risk groups - students with high absence rates
        const studentTotalClasses = new Map<number, number>();
        relevantAttendance.forEach(rec => {
            const current = studentTotalClasses.get(rec.student_id) || 0;
            studentTotalClasses.set(rec.student_id, current + 1);
        });

        const riskStudents = Array.from(studentAbsenceStats.values())
            .map(stat => {
                const totalClasses = studentTotalClasses.get(stat.student.id) || 0;
                const absenceRate = totalClasses > 0 ? ((stat.absent) / totalClasses) * 100 : 0;
                return {
                    student: stat.student,
                    absenceRate,
                    totalAbsences: stat.absent,
                    totalClasses
                };
            })
            .filter(s => s.totalClasses > 0)
            .sort((a, b) => b.absenceRate - a.absenceRate);

        const criticalRisk = riskStudents.filter(s => s.absenceRate > 40);
        const highRisk = riskStudents.filter(s => s.absenceRate > 20 && s.absenceRate <= 40);
        const normalRisk = riskStudents.filter(s => s.absenceRate <= 20);

        // Calculate weekday heatmap
        const weekdayStats: { [day: number]: { present: number; absent: number } } = {
            1: { present: 0, absent: 0 }, // Monday
            2: { present: 0, absent: 0 }, // Tuesday
            3: { present: 0, absent: 0 }, // Wednesday
            4: { present: 0, absent: 0 }, // Thursday
            5: { present: 0, absent: 0 }, // Friday
            6: { present: 0, absent: 0 }, // Saturday
            0: { present: 0, absent: 0 }  // Sunday
        };

        relevantAttendance.forEach(rec => {
            const scheduleItem = scheduleMap.get(rec.schedule_id!);
            if (!scheduleItem) return;

            const date = new Date(scheduleItem.date);
            const dayOfWeek = date.getDay();

            if (rec.status === AttendanceStatus.Present) {
                weekdayStats[dayOfWeek].present++;
            } else if (rec.status === AttendanceStatus.Absent) {
                weekdayStats[dayOfWeek].absent++;
            }
        });

        const weekdayHeatmap = [1, 2, 3, 4, 5, 6, 0].map(day => {
            const stats = weekdayStats[day];
            const total = stats.present + stats.absent;
            const attendance = total > 0 ? (stats.present / total) * 100 : 0;
            const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            return {
                day: dayNames[day],
                dayNumber: day,
                attendance,
                total
            }
        }).filter(d => d.total > 0); // Only show days with data

        // Calculate unmarked classes (classes without any attendance records)
        const unmarkedClasses = schedule
            .filter(s => {
                // Only show classes for current teacher (if not privileged)
                if (!isPrivileged && s.teacher !== user.name) return false;

                // Only past and today's classes
                const classDate = new Date(s.date);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (classDate > today) return false;

                // Check if this class has any attendance records
                const hasRecords = rawAttendanceRecords.some(rec => rec.schedule_id === s.id);
                return !hasRecords;
            })
            .map(s => {
                const classDate = new Date(s.date);
                const today = new Date();
                const daysAgo = Math.floor((today.getTime() - classDate.getTime()) / (1000 * 60 * 60 * 24));

                const urgency: 'critical' | 'high' | 'normal' = daysAgo > 3 ? 'critical' : daysAgo > 1 ? 'high' : 'normal';

                return {
                    schedule: s,
                    daysAgo,
                    urgency
                };
            })
            .sort((a, b) => new Date(b.schedule.date).getTime() - new Date(a.schedule.date).getTime()); // Most recent first

        return {
            totalClasses: conductedClasses.size,
            averageAttendance,
            totalAcademicHours: conductedClasses.size * 2,
            uniqueGroupCount: Object.keys(groupStats).length,
            uniqueSubjectCount: Object.keys(subjectStats).length,
            uniqueTeacherCount: uniqueTeachers.size,
            groupChartData: Object.entries(groupStats).map(([g, s]) => ({ group: g, attendance: (s.p + s.a > 0) ? (s.p / (s.p + s.a)) * 100 : 0 })).sort((a, b) => b.attendance - a.attendance),
            subjectTableData: Object.entries(subjectStats).map(([s, d]) => ({ subject: s, classCount: d.c.size, attendance: (d.p + d.a > 0) ? (d.p / (d.a + d.p)) * 100 : 0 })).sort((a, b) => a.subject.localeCompare(b.subject)),
            studentAbsenceData,
            uniqueGroupsForReport,
            uniqueSubjectsForReport,
            // New analytics
            riskGroups: {
                critical: criticalRisk,
                high: highRisk,
                normal: normalRisk
            },
            weekdayHeatmap,
            unmarkedClasses
        };
    }, [isPrivileged, user.name, schedule, students, rawAttendanceRecords, startDate, endDate, statsLoading]);

    const finalStudentReport = useMemo(() => {
        let filtered = statisticsData.studentAbsenceData.filter(
            item => reportSelectedGroup === 'all' || item.student.group === reportSelectedGroup
        );

        // If specific month selected, recalculate totals for that month only
        if (reportSelectedMonth !== 'all') {
            filtered = filtered.map(item => {
                const monthData = item.monthlyData?.get(reportSelectedMonth) || [];
                const monthAbsent = monthData.filter(d => d.type === 'absent').length;
                const monthExcused = monthData.filter(d => d.type === 'excused').length;

                return {
                    ...item,
                    absent: monthAbsent,
                    excused: monthExcused
                };
            }).filter(item => item.absent > 0 || item.excused > 0); // Only show students with absences in selected month
        }

        return filtered;
    }, [statisticsData.studentAbsenceData, reportSelectedGroup, reportSelectedMonth]);

    // Generate month columns for the report based on date range
    const reportMonths = useMemo(() => {
        const months: Array<{ key: string; label: string; fullName: string }> = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const fullMonthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

        while (current <= endMonth) {
            const key = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
            const label = monthNames[current.getMonth()];
            const fullName = `${fullMonthNames[current.getMonth()]} ${current.getFullYear()}`;
            months.push({ key, label, fullName });
            current.setMonth(current.getMonth() + 1);
        }

        return months;
    }, [startDate, endDate]);

    const handleAbsenceReportExport = useCallback(() => {
        if (finalStudentReport.length === 0) {
            alert('Нет данных для экспорта.');
            return;
        }

        const formattedStartDate = startDate.toLocaleDateString('ru-RU');
        const formattedEndDate = endDate.toLocaleDateString('ru-RU');

        // Get month name if specific month selected
        const selectedMonthName = reportSelectedMonth === 'all'
            ? 'Весь период'
            : reportMonths.find(m => m.key === reportSelectedMonth)?.fullName || reportSelectedMonth;

        const summaryRows = [
            `Период отчета: ${reportSelectedMonth === 'all' ? `с ${formattedStartDate} по ${formattedEndDate}` : selectedMonthName}`,
            `Группа: ${reportSelectedGroup === 'all' ? 'Все группы' : reportSelectedGroup}`
        ];

        const headers = ['Студент', 'Группа', ...reportMonths.map(m => m.label), 'Итого пропусков'];
        const csvContent = [
            ...summaryRows,
            '', // Blank line for separation
            headers.join(';'),
            ...finalStudentReport.map(data => {
                const monthCounts = reportMonths.map(month => {
                    const monthData = data.monthlyData?.get(month.key) || [];
                    return monthData.length;
                });
                return [
                    `"${data.student.name}"`,
                    data.student.group,
                    ...monthCounts,
                    data.absent + data.excused
                ].join(';');
            })
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        const safeGroupName = reportSelectedGroup === 'all' ? 'all_groups' : reportSelectedGroup.replace(/[\s/\\?%*:|"<>]/g, '_');
        const monthSuffix = reportSelectedMonth === 'all' ? `${getISODateString(startDate)}_to_${getISODateString(endDate)}` : reportSelectedMonth;
        const filename = `student_absences_${safeGroupName}_${monthSuffix}.csv`;
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [finalStudentReport, reportSelectedGroup, reportSelectedMonth, startDate, endDate, reportMonths]);

    const getRateColor = (rate: number) => {
        if (rate >= 80) return 'text-green-600 dark:text-green-500';
        if (rate >= 50) return 'text-yellow-600 dark:text-yellow-500';
        return 'text-red-600 dark:text-red-500';
    };

    const handleStatsLinkClick = () => {
        if (isPrivileged) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setShowStats(prev => !prev);
        }
    };

    const renderStatisticsContent = () => {
        // Show skeleton if full stats are still loading in background
        if (statsLoading) {
            return <ProfileSkeleton role={user.role} />;
        }

        if (statisticsData.totalClasses === 0) {
            return <div className="p-8 text-center text-muted-foreground">Нет данных для отображения статистики за выбранный период.</div>;
        }

        // Вычисление количества студентов в группах преподавателя
        const studentsInTeacherGroups = !isPrivileged
            ? students.filter(s => statisticsData.uniqueGroupsForReport.includes(s.group)).length
            : 0;

        // Вычисление групп в зоне риска (< 70% посещаемость)
        const riskGroupsCount = isPrivileged
            ? statisticsData.groupChartData?.filter((g: any) => g.attendance < THRESHOLDS.RISK_GROUP_ATTENDANCE).length || 0
            : 0;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <Card className="shadow-none print:hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold">Общая сводка</h3>
                            {isAdmin && onNavigateToSystemHealth && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onNavigateToSystemHealth}
                                    className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-transparent transition-colors flex items-center gap-2"
                                >
                                    <IconActivity className="w-3 h-3" />
                                    Диагностика системы
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Общие карточки для всех */}
                            <StatCard
                                label="Средняя посещаемость"
                                value={`${statisticsData.averageAttendance.toFixed(1)}%`}
                                subtext="без ув. пропусков"
                                icon={<IconActivity className="w-5 h-5 text-blue-500" />}
                            />
                            <StatCard
                                label="Проведено занятий"
                                value={statisticsData.totalClasses}
                                subtext={`${statisticsData.totalAcademicHours} ак. ч.`}
                                icon={<IconBook className="w-5 h-5 text-blue-500" />}
                            />

                            {/* Карточки для администраторов/модераторов */}
                            {isPrivileged ? (
                                <>
                                    <StatCard
                                        label="Ожидающих заявок"
                                        value={pendingRequestsCount}
                                        icon={<IconFileText className="w-5 h-5 text-yellow-500" />}
                                        onClick={() => onNavigateToRequests()}
                                    />
                                    <StatCard
                                        label="Групп в зоне риска"
                                        value={riskGroupsCount}
                                        subtext="< 70% посещаемость"
                                        icon={<IconAlertTriangle className="w-5 h-5 text-red-500" />}
                                    />
                                    <StatCard
                                        label="Неотмеченных занятий"
                                        value={0}
                                        icon={<IconClock className="w-5 h-5 text-orange-500" />}
                                    />
                                </>
                            ) : (
                                /* Карточки для преподавателей */
                                <>
                                    <StatCard
                                        label="Мои группы"
                                        value={statisticsData.uniqueGroupCount}
                                        icon={<IconUsers className="w-5 h-5 text-purple-500" />}
                                    />
                                    <StatCard
                                        label="Неотмеченных занятий"
                                        value={0}
                                        icon={<IconClock className="w-5 h-5 text-orange-500" />}
                                    />
                                    <StatCard
                                        label="Студентов в группах"
                                        value={studentsInTeacherGroups}
                                        icon={<IconUsers className="w-5 h-5 text-purple-500" />}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Reports Section - Moved up */}
                {isPrivileged && (
                    <Card className="shadow-none">
                        <div className="p-6">
                            <div className="hidden print:block mb-4">
                                <h2 className="text-xl font-bold">Отчет по пропускам студентов</h2>
                                <p className="text-sm">
                                    Период: {reportSelectedMonth === 'all'
                                        ? `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`
                                        : reportMonths.find(m => m.key === reportSelectedMonth)?.fullName || reportSelectedMonth}
                                </p>
                                <p className="text-sm">Группа: {reportSelectedGroup === 'all' ? 'Все группы' : reportSelectedGroup}</p>
                            </div>
                            <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                                <h3 className="text-base font-semibold">Отчет по пропускам студентов</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="sm:w-48">
                                        <MonthFilter
                                            months={reportMonths}
                                            selectedMonth={reportSelectedMonth}
                                            onMonthChange={setReportSelectedMonth}
                                        />
                                    </div>
                                    <div className="sm:w-64">
                                        <GroupFilter
                                            groups={statisticsData.uniqueGroupsForReport}
                                            selectedGroup={reportSelectedGroup}
                                            onGroupChange={setReportSelectedGroup}
                                        />
                                    </div>
                                </div>
                            </div>
                            {reportSelectedGroup === 'all' ? (
                                <div className="rounded-lg border p-8 text-center text-muted-foreground">
                                    <p className="text-base font-medium mb-2">Выберите группу для просмотра отчета</p>
                                    <p className="text-sm">Используйте фильтр выше, чтобы выбрать конкретную группу</p>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-lg border overflow-hidden print:overflow-visible print:border print:shadow-none">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50">
                                                <tr className="border-b">
                                                    <th className="h-12 px-2 text-left font-medium text-muted-foreground">Студент</th>
                                                    <th className="h-12 px-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Группа</th>
                                                    {reportMonths.map(month => (
                                                        <th key={month.key} className="h-12 px-2 text-center font-medium text-muted-foreground hidden lg:table-cell" title={month.fullName}>
                                                            {month.label}
                                                        </th>
                                                    ))}
                                                    <th className="h-12 px-2 text-center font-medium text-muted-foreground">Итого</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {finalStudentReport.length > 0 ? (
                                                    finalStudentReport.map(({ student, absent, excused, monthlyData }) => (
                                                        <tr key={student.id} className="border-b hover:bg-muted/50 last:border-b-0">
                                                            <td className="p-2 font-medium">
                                                                <Button
                                                                    variant="ghost"
                                                                    onClick={() => setViewingAbsencesFor(student)}
                                                                    className="flex h-auto p-0 hover:bg-transparent items-center gap-3 text-left w-full group rounded-lg focus-visible:ring-1 focus-visible:ring-primary print:hidden"
                                                                >
                                                                    <Avatar name={student.name} avatarUrl={student.avatarUrl} className="w-8 h-8 shrink-0" textClassName="text-xs" />
                                                                    <div className="flex flex-col items-start">
                                                                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">{student.name}</div>
                                                                        <div className="text-muted-foreground sm:hidden">{student.group}</div>
                                                                    </div>
                                                                </Button>
                                                                <span className="hidden print:inline">{student.name}</span>
                                                            </td>
                                                            <td className="p-2 hidden sm:table-cell">{student.group}</td>
                                                            {reportMonths.map(month => {
                                                                const monthData = monthlyData?.get(month.key) || [];
                                                                const count = monthData.length;
                                                                return (
                                                                    <MonthlyAbsenceCell
                                                                        key={month.key}
                                                                        count={count}
                                                                        absences={monthData}
                                                                        monthName={month.fullName}
                                                                    />
                                                                );
                                                            })}
                                                            <td className="p-2 text-center font-semibold text-foreground">{absent + excused}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3 + reportMonths.length} className="p-8 text-center text-muted-foreground">
                                                            Нет данных о пропусках за выбранный период.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="print:hidden flex justify-end pt-4 gap-4">
                                        <Button
                                            onClick={() => window.print()}
                                            disabled={statsLoading || finalStudentReport.length === 0}
                                            variant="secondary"
                                        >
                                            Печать / PDF
                                        </Button>
                                        <Button
                                            onClick={handleAbsenceReportExport}
                                            disabled={statsLoading || finalStudentReport.length === 0}
                                            variant="secondary"
                                        >
                                            Экспорт в CSV
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                )}

                {/* Analytics Section - Accordion */}
                <Card className="shadow-none print:hidden">
                    <div className="p-6">
                        <h3 className="text-base font-semibold mb-4">Группы риска</h3>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            {/* Critical Risk */}
                            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                        <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statisticsData.riskGroups.critical.length}</p>
                                        <p className="text-xs text-red-600/80 dark:text-red-400/80">Критический уровень</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">&gt;40% пропусков</p>
                            </div>

                            {/* High Risk */}
                            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                        <IconAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statisticsData.riskGroups.high.length}</p>
                                        <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">Требует внимания</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">20-40% пропусков</p>
                            </div>

                            {/* Normal */}
                            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                        <IconCircleCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statisticsData.riskGroups.normal.length}</p>
                                        <p className="text-xs text-green-600/80 dark:text-green-400/80">В норме</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">&lt;20% пропусков</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <Accordion type="multiple" className="w-full space-y-2">
                            {/* Critical Risk Group */}
                            {statisticsData.riskGroups.critical.length > 0 && (
                                <AccordionItem value="critical" className="border rounded-lg">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            <span className="font-semibold">Критический уровень ({statisticsData.riskGroups.critical.length})</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="divide-y max-h-64 overflow-y-auto">
                                            {statisticsData.riskGroups.critical.slice(0, 10).map((item) => (
                                                <Button
                                                    key={item.student.id}
                                                    variant="ghost"
                                                    onClick={() => setViewingAbsencesFor(item.student)}
                                                    className="w-full h-auto p-3 hover:bg-muted/50 flex items-center justify-between text-left font-normal"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={item.student.name} avatarUrl={item.student.avatarUrl} className="w-8 h-8" textClassName="text-xs" />
                                                        <div>
                                                            <p className="font-medium text-sm">{item.student.name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.student.group}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{item.absenceRate.toFixed(1)}%</p>
                                                        <p className="text-xs text-muted-foreground">{item.totalAbsences}/{item.totalClasses}</p>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* High Risk Group */}
                            {statisticsData.riskGroups.high.length > 0 && (
                                <AccordionItem value="high" className="border rounded-lg">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <IconAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                            <span className="font-semibold">Требует внимания ({statisticsData.riskGroups.high.length})</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="divide-y max-h-64 overflow-y-auto">
                                            {statisticsData.riskGroups.high.slice(0, 10).map((item) => (
                                                <Button
                                                    key={item.student.id}
                                                    variant="ghost"
                                                    onClick={() => setViewingAbsencesFor(item.student)}
                                                    className="w-full h-auto p-3 hover:bg-muted/50 flex items-center justify-between text-left font-normal"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={item.student.name} avatarUrl={item.student.avatarUrl} className="w-8 h-8" textClassName="text-xs" />
                                                        <div>
                                                            <p className="font-medium text-sm">{item.student.name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.student.group}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{item.absenceRate.toFixed(1)}%</p>
                                                        <p className="text-xs text-muted-foreground">{item.totalAbsences}/{item.totalClasses}</p>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* Weekday Heatmap */}
                            {statisticsData.weekdayHeatmap.length > 0 && (
                                <AccordionItem value="heatmap" className="border rounded-lg">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <IconGrid3x3 className="w-5 h-5" />
                                            <span className="font-semibold">Тепловая карта посещаемости</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <WeekdayHeatmap data={statisticsData.weekdayHeatmap} />
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    </div>
                </Card>


                <Card className="shadow-none print:hidden" ref={subjectsTableRef}>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                            <h3 className="text-base font-semibold">Статистика по дисциплинам</h3>
                            <div className="sm:w-64">
                                <SubjectFilter
                                    subjects={statisticsData.uniqueSubjectsForReport}
                                    selectedSubject={reportSelectedSubject}
                                    onSubjectChange={setReportSelectedSubject}
                                />
                            </div>
                        </div>
                        {reportSelectedSubject === 'all' ? (
                            <div className="rounded-lg border p-8 text-center text-muted-foreground">
                                <p className="text-base font-medium mb-2">Выберите дисциплину для просмотра статистики</p>
                                <p className="text-sm">Используйте фильтр выше, чтобы выбрать конкретную дисциплину</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr className="border-b">
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">Дисциплина</th>
                                            <th className="h-12 px-4 text-center font-medium text-muted-foreground">Проведено занятий</th>
                                            <th className="h-12 px-4 text-right font-medium text-muted-foreground">Посещаемость</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statisticsData.subjectTableData
                                            .filter(item => item.subject === reportSelectedSubject)
                                            .map(({ subject, classCount, attendance }) => (
                                                <tr key={subject} className="border-b hover:bg-muted last:border-b-0 cursor-pointer" onClick={() => setViewingDiscipline(subject)}>
                                                    <td className="p-4 font-medium">{subject}</td>
                                                    <td className="p-4 text-center">{classCount}</td>
                                                    <td className="p-4 text-right">
                                                        <div className={`font-semibold ${getRateColor(attendance)}`}>{attendance.toFixed(1)}%</div>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    };

    const renderTeacherDashboard = () => (
        <>
            <Card className="shadow-none print:hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Мой день</h2>
                        <p className="text-sm text-muted-foreground mt-1">Расписание занятий на выбранный день.</p>
                    </div>
                    <div className="w-full md:w-48">
                        <DatePicker selectedDate={viewDate} onDateChange={setViewDate} align="right" />
                    </div>
                </div>
                <div className="px-6 pb-6 space-y-2">
                    {initialLoading && <div className="py-4"><ProfileSkeleton role={user.role} /></div>}
                    {!initialLoading && teacherDashboardSchedule.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">На выбранную дату занятий нет.</div>
                    )}
                    {!initialLoading && teacherDashboardSchedule.map(classInfo => {
                        // Helper to determine status
                        const getTimeStatus = (timeRange: string, dateStr: string) => {
                            const now = new Date();
                            const scheduleDate = new Date(dateStr);
                            const isToday = scheduleDate.toDateString() === now.toDateString();

                            if (scheduleDate < new Date(now.setHours(0, 0, 0, 0))) return 'past';
                            if (scheduleDate > new Date(now.setHours(23, 59, 59, 999))) return 'future';

                            if (!isToday) return 'future'; // Should be covered by above, but safe fallback

                            // Parse time range "HH:MM - HH:MM" or "HH.MM - HH.MM"
                            const parts = timeRange.split('-').map(s => s.trim());
                            if (parts.length !== 2) return 'future';

                            const [startStr, endStr] = parts;

                            const parseTime = (timeStr: string) => {
                                const [hours, minutes] = timeStr.replace('.', ':').split(':').map(Number);
                                const date = new Date();
                                date.setHours(hours, minutes, 0, 0);
                                return date;
                            };

                            const startTime = parseTime(startStr);
                            const endTime = parseTime(endStr);

                            // Reset now to current time for comparison
                            const currentTime = new Date();

                            if (currentTime >= startTime && currentTime <= endTime) return 'current';
                            if (currentTime > endTime) return 'past';
                            return 'future';
                        };

                        const getPairNumber = (time: string) => {
                            const pairs: Record<string, string> = {
                                '08.30 - 10.00': '1 пара', '08:30 - 10:00': '1 пара',
                                '10.10 - 11.40': '2 пара', '10:10 - 11:40': '2 пара',
                                '12.10 - 13.40': '3 пара', '12:10 - 13:40': '3 пара',
                                '13.50 - 15.20': '4 пара', '13:50 - 15:20': '4 пара',
                                '15.30 - 17.00': '5 пара', '15:30 - 17:00': '5 пара',
                                '17.10 - 18.40': '6 пара', '17:10 - 18:40': '6 пара',
                                '18.50 - 20.20': '7 пара', '18:50 - 20:20': '7 пара',
                            };
                            return pairs[time] || 'Пара';
                        };

                        const getLessonTypeStyle = (type: string) => {
                            if (!type) return 'text-muted-foreground';
                            const lower = type.toLowerCase();
                            if (lower.includes('лекц') || lower.includes('чтение')) return 'text-red-500';
                            if (lower.includes('практ') || lower.includes('семин') || lower.includes('лабор') || lower.includes('веден')) return 'text-blue-500';
                            return 'text-muted-foreground';
                        };

                        const status = getTimeStatus(classInfo.time, classInfo.date);
                        const isPast = status === 'past';
                        const isCurrent = status === 'current';

                        const [startTimeStr, endTimeStr] = classInfo.time.split('-').map(s => s.trim());

                        return (
                            <Card
                                key={classInfo.id}
                                className={`relative overflow-hidden shadow-none hover:shadow-sm transition-all py-2 pr-2 pl-4 flex flex-col md:flex-row items-stretch gap-4 ${isPast ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''} ${isCurrent ? 'border border-green-600/30 bg-green-50/10' : 'border border-border'}`}
                            >
                                {isCurrent && (
                                    <Badge
                                        variant="default"
                                        className="absolute top-0 right-0 rounded-none rounded-bl-lg px-3 py-1 bg-green-600 hover:bg-green-700 uppercase text-[10px] tracking-wider font-bold z-10 shadow-sm"
                                    >
                                        Сейчас
                                    </Badge>
                                )}

                                {/* Time Column Timeline Style */}
                                <div className="flex flex-col justify-center w-full md:w-[100px] shrink-0">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isCurrent ? 'text-green-600' : 'text-muted-foreground/60'}`}>
                                        {getPairNumber(classInfo.time)}
                                    </span>
                                    <span className={`text-2xl font-bold leading-none tracking-tight ${isCurrent ? 'text-green-700' : 'text-foreground'}`}>
                                        {startTimeStr}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium mt-1 pl-0.5 opacity-80">
                                        до {endTimeStr}
                                    </span>
                                </div>

                                {/* Group & Type Column */}
                                <div className="flex flex-col justify-center w-full md:w-[220px] shrink-0">
                                    <div className="flex items-center gap-2">
                                        <IconUsers className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-semibold text-foreground text-base truncate" title={classInfo.group}>{classInfo.group}</span>
                                    </div>
                                    <span className={`text-sm pl-6 leading-none ${getLessonTypeStyle(classInfo.loadType)}`}>{classInfo.loadType || 'Занятие'}</span>
                                </div>

                                {/* Subject Column */}
                                <div className="flex-1 min-w-0 w-full md:w-auto flex flex-col justify-center">
                                    <span className="font-semibold text-lg leading-tight truncate md:pr-4" title={classInfo.subject}>{classInfo.subject}</span>
                                </div>

                                {/* Right Section (Location + Button) */}
                                <div className="flex flex-col justify-end items-end ml-auto pl-4 pb-0.5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-sm text-foreground whitespace-nowrap">ауд. {classInfo.classroom || '—'}</span>
                                        <Button
                                            onClick={() => onNavigateToJournal(classInfo.id, viewDate)}
                                            variant={isPast ? "secondary" : "default"}
                                            className={`rounded-lg whitespace-nowrap ${isCurrent
                                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                                                : ''
                                                }`}
                                        >
                                            {isPast ? 'Просмотр' : 'Отметить'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </Card>

            {/* Unmarked Classes Section */}
            {statisticsData.unmarkedClasses.length > 0 && (
                <Card className="shadow-none print:hidden">
                    <Accordion type="single" collapsible value={showUnmarked ? "unmarked" : ""} onValueChange={(value) => setShowUnmarked(value === "unmarked")}>
                        <AccordionItem value="unmarked" className="border-0">
                            <AccordionTrigger className="px-6 hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Требуют отметки</span>
                                    <span className="inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                                        {statisticsData.unmarkedClasses.length}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                                <UnmarkedClassesCard
                                    classes={statisticsData.unmarkedClasses}
                                    onMarkAttendance={onNavigateToJournal}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>
            )}

            {/* Statistics Section */}
            <Card className="shadow-none print:hidden">
                <Accordion type="single" collapsible value={showStats ? "stats" : ""} onValueChange={(value) => setShowStats(value === "stats")}>
                    <AccordionItem value="stats" className="border-0">
                        <AccordionTrigger className="px-6 hover:no-underline">
                            <div className="flex items-center gap-4 w-full">
                                <span className="font-semibold">Моя статистика</span>
                                {!showStats && !statsLoading && statisticsData.totalClasses > 0 && (
                                    <div className="flex items-center gap-4 text-sm font-normal ml-auto mr-4 animate-in fade-in slide-in-from-left-4">
                                        <div className="flex items-center gap-1.5" title="Средняя посещаемость">
                                            <IconActivity className="w-4 h-4 text-blue-500" />
                                            <span className="text-foreground font-semibold">{statisticsData.averageAttendance.toFixed(1)}%</span>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1.5" title="Мои группы">
                                            <IconUsers className="w-4 h-4 text-purple-500" />
                                            <span className="text-foreground font-semibold">{statisticsData.uniqueGroupCount}</span>
                                            <span className="text-muted-foreground">групп</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                            {renderStatisticsContent()}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>
        </>
    );

    const renderAdminDashboard = () => (
        <>
            <Card className="shadow-none print:hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <Avatar name={user.name} avatarUrl={user.avatarUrl} className="w-16 h-16 border-2 border-primary/20" textClassName="text-2xl" />
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Общая статистика</h2>
                            <div className="text-sm text-muted-foreground mt-1">Агрегированные данные по всем преподавателям и группам.</div>
                        </div>
                    </div>
                </div>
            </Card>
            {initialLoading ? <ProfileSkeleton role={user.role} /> : renderStatisticsContent()}
        </>
    );

    const legacyAttendanceRecords = useMemo(() => {
        return rawAttendanceRecords.reduce((acc, rec) => {
            if (!acc[rec.date]) {
                acc[rec.date] = {};
            }
            acc[rec.date][rec.student_id] = rec.status;
            return acc;
        }, {} as any);
    }, [rawAttendanceRecords]);


    return (
        <div className="min-h-screen bg-muted flex flex-col print:bg-white">

            <main className="flex-1 flex flex-col container mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 print:p-0 print:m-0 print:max-w-none print:w-full">
                {error && <div className="p-4"><ErrorMessage message={error} onRetry={fetchDailyData} /></div>}
                {!error && (
                    <>
                        {isPrivileged ? renderAdminDashboard() : renderTeacherDashboard()}
                    </>
                )}
            </main>

            {viewingAbsencesFor && (
                <AbsenceDetailModal
                    user={user}
                    student={viewingAbsencesFor}
                    startDate={getISODateString(startDate)}
                    endDate={getISODateString(endDate)}
                    onClose={() => setViewingAbsencesFor(null)}
                    onDataRefresh={fetchFullStatistics}
                />
            )}

            {viewingDiscipline && (
                <DisciplineDetailModal
                    disciplineName={viewingDiscipline}
                    startDate={getISODateString(startDate)}
                    endDate={getISODateString(endDate)}
                    schedule={schedule}
                    students={students}
                    attendanceRecords={legacyAttendanceRecords}
                    onClose={() => setViewingDiscipline(null)}
                />
            )}
        </div>
    );
};

export default ProfilePage;
