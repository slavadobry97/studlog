
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useGoogleSheetData } from './useGoogleSheetData';
import { useSessionState } from './usePersistedState';
import { SCHEDULE_SHEET_URL } from '../config/index';
import { User, Student, ScheduleInfo, AttendanceStatus } from '../types/index';
import { useNotification } from './useNotification';
import { COLUMN_MAP } from '../constants';

// --- Helpers ---

const getISODateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getErrorMessage = (error: any): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null && 'message' in error) return String((error as any).message);
    return 'Неизвестная ошибка';
};

const parseSheetDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const trimmedDate = dateStr.trim();
    const match = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return trimmedDate;
};

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

const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

// --- Types ---

type Profile = { id: string; full_name: string | null; department: string | null; role: User['role'] | null };
type RawAttendanceRecord = { id: number; student_id: number; status: AttendanceStatus; schedule_id: number | null; date: string };
type SortKey = 'name' | 'group';
type SortConfig = { key: SortKey | null; order: 'asc' | 'desc' };


const REQUIRED_RUSSIAN_HEADERS = ['учебная группа', 'преподаватель', 'дисциплина', 'время', 'дата'];

export const useAttendanceLogic = (user: User, initialScheduleId?: number | null, initialDate?: Date | null) => {
    // UI State managed by hook
    // Note: selectedDate uses useState instead of useSessionState because Date objects
    // don't serialize/deserialize properly in sessionStorage (they become strings)
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());


    const [selectedDepartment, setSelectedDepartment] = useSessionState<string>(
        'attendance_selectedDepartment',
        user.role === 'Преподаватель' && user.department ? user.department : 'all'
    );

    const [selectedTeacher, setSelectedTeacher] = useSessionState<string>(
        'attendance_selectedTeacher',
        user.role === 'Преподаватель' ? user.name : 'all'
    );

    // Don't persist selectedScheduleId in sessionStorage - it causes issues with navigation
    // When navigating from Profile, initialScheduleId should take priority
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(initialScheduleId || null);

    // Filtering & Sorting State - also persisted
    const [searchTerm, setSearchTerm] = useSessionState<string>('attendance_searchTerm', '');
    const [sortConfig, setSortConfig] = useSessionState<SortConfig>(
        'attendance_sortConfig',
        { key: 'name', order: 'asc' }
    );
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 35;

    // Loading control
    const [forceLoadingStop, setForceLoadingStop] = useState(false);
    const [isLongLoading, setIsLongLoading] = useState(false);

    const { notification, showNotification } = useNotification();
    const queryClient = useQueryClient();

    // Track if we've already initialized from props
    const hasInitialized = useRef(false);

    // Update selected schedule and date when initial values change (e.g., navigating from Profile)
    useEffect(() => {
        if (initialScheduleId !== undefined && initialScheduleId !== null && !hasInitialized.current) {
            setSelectedScheduleId(initialScheduleId);
            hasInitialized.current = true;
        }
    }, [initialScheduleId]);

    useEffect(() => {
        if (initialDate) {
            setSelectedDate(initialDate);
        }
    }, [initialDate]);

    // Date string for queries
    const dateStr = getISODateString(selectedDate);

    // 1. Fetch Google Sheet Data (Background Sync)
    // We still fetch this to keep DB in sync, but we don't block the UI on it anymore
    const { data: sheetData, loading: sheetLoading, error: sheetError, progress: sheetProgress, refetch: refetchSheet } = useGoogleSheetData(SCHEDULE_SHEET_URL);

    // 2. Fetch Profiles (Cached) - Needed for filters
    const { data: allProfiles = [] } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            return await fetchAllPages(supabase.from('profiles').select('id, full_name, department, role')) as Profile[];
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours (increased from 1 hour - profiles rarely change)
    });

    // 3. OPTIMIZED: Fetch Schedules ONLY for selected date from DB
    const { data: dailySchedules = [], isLoading: isLoadingDailySchedule } = useQuery({
        queryKey: ['schedule', dateStr],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('schedule')
                .select('*')
                .eq('date', dateStr);

            if (error) throw error;

            // Map to camelCase
            return data.map((s: any) => ({
                id: s.id,
                group: s.group,
                teacher: s.teacher_name,
                subject: s.subject,
                time: s.time,
                date: s.date,
                loadType: s.load_type,
                classroom: s.classroom
            })) as ScheduleInfo[];
        },
        staleTime: 1000 * 60 * 60, // 60 minutes
        gcTime: 1000 * 60 * 120, // Keep in cache for 2 hours
        refetchOnWindowFocus: false, // Don't refetch on tab switch
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // 4. OPTIMIZED: Fetch Attendance ONLY for selected date from DB
    const { data: dailyAttendance = [], isLoading: isLoadingDailyAttendance } = useQuery({
        queryKey: ['attendance', dateStr],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', dateStr);
            if (error) throw error;
            return data as RawAttendanceRecord[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
        gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
        refetchOnWindowFocus: false, // Don't refetch on tab switch - critical for "multitasking" feel
        retry: 4,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // 5. Sync Logic (Sheet -> DB)
    // This runs in background. When it finishes, it invalidates 'schedule' query to refresh UI if needed.
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        const syncSchedules = async () => {
            // Only run sync if sheet loaded
            if (sheetLoading || !sheetData) return;

            // CRITICAL: Only Admins and Moderators can sync schedules to the database.
            // Teachers will only read what's already in the DB.
            const isPrivileged = user.role === 'Администратор' || user.role === 'Модератор';
            if (!isPrivileged) {
                console.log("Sync skipped: User does not have permissions to update schedule.");
                return;
            }

            if (sheetError) {
                setSyncError(sheetError);
                return;
            }

            try {
                if (sheetData.length < 2) return;
                const header = sheetData[0].map(h => h.trim().toLowerCase());
                const missingHeaders = REQUIRED_RUSSIAN_HEADERS.filter(rh => !header.includes(rh));
                if (missingHeaders.length > 0) throw new Error(`Заголовок таблицы неверный: ${missingHeaders.join(', ')}`);

                const headerIndexMap: { [key: string]: number } = {};
                for (const russianHeader in COLUMN_MAP) {
                    const index = header.indexOf(russianHeader);
                    if (index !== -1) headerIndexMap[COLUMN_MAP[russianHeader]] = index;
                }

                // Parse records
                const scheduleRecords = sheetData.slice(1).map(row => ({
                    group: row[headerIndexMap.group]?.trim(),
                    teacher_name: row[headerIndexMap.teacher_name]?.trim(),
                    subject: row[headerIndexMap.subject]?.trim(),
                    time: row[headerIndexMap.time]?.trim(),
                    date: parseSheetDate(row[headerIndexMap.date]),
                    load_type: headerIndexMap.load_type !== undefined ? row[headerIndexMap.load_type]?.trim() : null,
                    classroom: headerIndexMap.classroom !== undefined ? row[headerIndexMap.classroom]?.trim() : null,
                })).filter(r => r.date && r.group && r.teacher_name && r.subject && r.time);

                // Deduplicate
                const uniqueScheduleRecordsMap = new Map<string, typeof scheduleRecords[0]>();
                scheduleRecords.forEach(record => {
                    const key = [record.date, record.group, record.teacher_name, record.subject, record.time].join('|');
                    uniqueScheduleRecordsMap.set(key, record);
                });
                const uniqueScheduleRecords = Array.from(uniqueScheduleRecordsMap.values());

                // --- Optimization: Only upsert if data has likely changed or if it's the current date ---
                // For now, we perform a smart sync.

                if (uniqueScheduleRecords.length > 0) {
                    setSyncStatus('Фоновая синхронизация...');
                    const chunks = chunkArray(uniqueScheduleRecords, 100);

                    for (const chunk of chunks) {
                        const { error } = await supabase
                            .from('schedule')
                            .upsert(chunk, { onConflict: 'date,group,teacher_name,subject,time' });
                        if (error) throw error;
                    }

                    setSyncStatus('');
                    // Important: Refresh the daily schedule view if the sync might have affected it
                    queryClient.invalidateQueries({ queryKey: ['schedule', dateStr] });
                }

            } catch (err: any) {
                console.error("Sync error:", err);
                setSyncError(`Ошибка синхронизации: ${getErrorMessage(err)}`);
            }
        };

        // Debounce sync slightly to avoid React strict mode double-invocations causing race conditions
        const timer = setTimeout(syncSchedules, 1000);
        return () => clearTimeout(timer);

    }, [sheetData, sheetLoading, sheetError, queryClient, dateStr]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedScheduleId, sortConfig]);

    const selectedSchedule = useMemo(() => {
        return dailySchedules.find(s => s.id === selectedScheduleId) || null;
    }, [dailySchedules, selectedScheduleId]);

    // 6. Fetch Students for Selected Group (Cached by Group)
    const { data: students = [], isLoading: isLoadingStudents } = useQuery({
        queryKey: ['students', selectedSchedule?.group],
        queryFn: async () => {
            if (!selectedSchedule?.group) return [];
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('group', selectedSchedule.group)
                .order('name');
            if (error) throw error;
            return data.map((s: any) => ({ ...s, id: s.id, name: s.name, group: s.group, avatarUrl: s.avatar_url || undefined }));
        },
        enabled: !!selectedSchedule?.group,
        staleTime: 1000 * 60 * 120, // 120 minutes (increased from 30 - students list rarely changes)
    });

    // 7. Current Statuses Map (Derived from dailyAttendance)
    const currentStatuses = useMemo(() => {
        const map = new Map<number, AttendanceStatus>();
        if (!selectedScheduleId || students.length === 0) return map;

        dailyAttendance.forEach(record => {
            if (record.schedule_id === selectedScheduleId) {
                map.set(record.student_id, record.status as AttendanceStatus);
            }
        });
        return map;
    }, [dailyAttendance, selectedScheduleId, students]);


    // 8. Sync local date selection with reset
    const isMounted = useRef(false);
    const isNavigatingFromProfile = useRef(false);

    useEffect(() => {
        if (initialScheduleId) {
            isNavigatingFromProfile.current = true;
        }
    }, [initialScheduleId]);

    useEffect(() => {
        if (isMounted.current && !isNavigatingFromProfile.current) {
            setSelectedScheduleId(null);
        } else {
            isMounted.current = true;
            isNavigatingFromProfile.current = false; // Reset flag after first render
        }
    }, [selectedDate]);

    // 9. Auto-filter teacher based on role
    useEffect(() => {
        if (user.role !== 'Преподаватель') {
            setSelectedTeacher('all');
        }
    }, [selectedDepartment, user.role]);

    // --- Derived Data Calculations ---

    const teacherToDepartmentMap = useMemo(() => {
        const map = new Map<string, string>();
        allProfiles.forEach(p => { if (p.full_name && p.department) { map.set(p.full_name, p.department); } });
        return map;
    }, [allProfiles]);

    const uniqueDepartments = useMemo(() => {
        const depts = new Set(allProfiles.map(p => p.department).filter((d): d is string => !!d));
        return ['all', ...Array.from(depts).sort()];
    }, [allProfiles]);

    // Note: Since we only load daily schedules, the groups filter might be limited to today's groups. 
    // This is acceptable for optimization.
    const uniqueGroups = useMemo(() => {
        const allGroupNames = new Set(dailySchedules.map(s => s.group));
        return ['all', ...Array.from(allGroupNames).sort()];
    }, [dailySchedules]);

    const uniqueTeachers = useMemo(() => {
        if (user.role === 'Преподаватель') return [user.name];
        let teachers = allProfiles.filter(p => p.full_name && p.role === 'Преподаватель');
        if (selectedDepartment !== 'all') teachers = teachers.filter(p => p.department === selectedDepartment);
        const teacherNames = teachers.map(p => p.full_name!);
        return ['all', ...Array.from(new Set(teacherNames)).sort()];
    }, [allProfiles, user.role, user.name, selectedDepartment]);

    const schedulesForDateAndDepartment = useMemo(() => {
        let daily = dailySchedules; // Already filtered by date in query
        if (user.role === 'Преподаватель') return daily.filter(s => s.teacher === user.name);
        if (selectedDepartment !== 'all') daily = daily.filter(s => teacherToDepartmentMap.get(s.teacher) === selectedDepartment);
        return daily;
    }, [dailySchedules, selectedDepartment, teacherToDepartmentMap, user.role, user.name]);

    const schedulesForDate = useMemo(() => {
        let daily = schedulesForDateAndDepartment;
        if (user.role !== 'Преподаватель' && selectedTeacher !== 'all') {
            return daily.filter(s => s.teacher === selectedTeacher);
        }
        return daily;
    }, [schedulesForDateAndDepartment, selectedTeacher, user.role]);

    const groupCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        counts[selectedSchedule?.group || 'all'] = students.length;
        return counts;
    }, [students, selectedSchedule]);

    const departmentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const allTeachers = allProfiles.filter(p => p.role === 'Преподаватель' && p.full_name);
        counts['all'] = allTeachers.length;
        uniqueDepartments.forEach(dept => {
            if (dept === 'all') return;
            counts[dept] = allTeachers.filter(p => p.department === dept).length;
        });
        return counts;
    }, [allProfiles, uniqueDepartments]);

    const teacherCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const relevantSchedules = schedulesForDateAndDepartment;
        uniqueTeachers.forEach(teacher => {
            if (teacher === 'all') return;
            counts[teacher] = relevantSchedules.filter(s => s.teacher === teacher).length;
        });
        counts['all'] = relevantSchedules.length;
        return counts;
    }, [schedulesForDateAndDepartment, uniqueTeachers]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(s => s.name.toLowerCase().includes(lowercasedFilter));
        }
        return filtered;
    }, [students, searchTerm]);

    const sortedStudents = useMemo(() => {
        if (!sortConfig.key) return filteredStudents;
        const sorted = [...filteredStudents].sort((a, b) => {
            if (a[sortConfig.key!] < b[sortConfig.key!]) return sortConfig.order === 'asc' ? -1 : 1;
            if (a[sortConfig.key!] > b[sortConfig.key!]) return sortConfig.order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredStudents, sortConfig]);

    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedStudents, currentPage]);

    const totalPages = Math.ceil(sortedStudents.length / ITEMS_PER_PAGE);

    const summary = useMemo(() => {
        const summaryData = { [AttendanceStatus.Present]: 0, [AttendanceStatus.Absent]: 0, [AttendanceStatus.ExcusedAbsent]: 0 };
        for (const status of currentStatuses.values()) {
            if (status === AttendanceStatus.Present) summaryData[AttendanceStatus.Present]++;
            else if (status === AttendanceStatus.Absent) summaryData[AttendanceStatus.Absent]++;
            else if (status === AttendanceStatus.ExcusedAbsent) summaryData[AttendanceStatus.ExcusedAbsent]++;
        }
        return summaryData;
    }, [currentStatuses]);

    // --- Handlers ---

    const handleSort = (key: SortKey) => {
        let order: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.order === 'asc') order = 'desc';
        setSortConfig({ key, order });
    };

    const handleStatusChange = async (studentId: number, status: AttendanceStatus) => {
        try {
            const { error } = await supabase.from('attendance').upsert({
                date: dateStr,
                student_id: studentId,
                status: status,
                schedule_id: selectedScheduleId
            }, { onConflict: 'student_id,date,schedule_id' });

            if (error) throw error;

            // Invalidate attendance query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['attendance', dateStr] });

        } catch (err: any) {
            showNotification(`Ошибка сохранения: ${getErrorMessage(err)}`, 'info');
        }
    };

    const confirmMarkAll = async (status: AttendanceStatus) => {
        if (!status || sortedStudents.length === 0 || !selectedScheduleId) {
            showNotification('Нет студентов для отметки.', 'info');
            return;
        }

        const recordsToUpsert = sortedStudents.map(student => {
            return {
                date: dateStr,
                student_id: student.id,
                status: status,
                schedule_id: selectedScheduleId
            };
        });

        showNotification(`Все студенты отмечены как "${status === AttendanceStatus.Present ? 'присутствующие' : 'отсутствующие'}"`, 'success');

        try {
            const { error } = await supabase.from('attendance').upsert(recordsToUpsert, { onConflict: 'student_id,date,schedule_id' });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['attendance', dateStr] });
        } catch (err: any) {
            showNotification(`Ошибка массового сохранения: ${getErrorMessage(err)}`, 'info');
        }
    };

    const handleImport = () => {
        showNotification('Список студентов успешно обновлен!', 'success');
        queryClient.invalidateQueries({ queryKey: ['students'] });
    };

    const handleStudentAdded = () => {
        showNotification('Студент успешно добавлен!', 'success');
        queryClient.invalidateQueries({ queryKey: ['students'] });
    };

    const retryFetch = useCallback(() => {
        refetchSheet();
        queryClient.invalidateQueries();
    }, [refetchSheet, queryClient]);

    // Combined loading logic
    // We only block UI if daily schedules or daily attendance is loading.
    // Sheet Sync runs in background.
    const loading = (isLoadingDailySchedule || isLoadingDailyAttendance || isLoadingStudents) && !forceLoadingStop;

    // Detect long loading
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loading) {
            timer = setTimeout(() => {
                setIsLongLoading(true);
            }, 6000); // 6 seconds threshold
        } else {
            setIsLongLoading(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    // Handler to force stop loading
    const setLoading = useCallback((state: boolean) => {
        if (!state) {
            setForceLoadingStop(true);
        } else {
            setForceLoadingStop(false);
        }
    }, []);


    return {
        // State
        selectedDate, setSelectedDate,
        selectedDepartment, setSelectedDepartment,
        selectedTeacher, setSelectedTeacher,
        selectedScheduleId, setSelectedScheduleId,
        searchTerm, setSearchTerm,
        sortConfig, handleSort,
        currentPage, setCurrentPage,

        // Data
        allSchedules: dailySchedules, // Renamed but keeping interface
        allProfiles,
        students,
        allAttendance: dailyAttendance, // Renamed but keeping interface
        currentStatuses,
        filteredStudents,
        sortedStudents,
        paginatedStudents,
        selectedSchedule,
        summary,

        // derived
        uniqueDepartments,
        uniqueGroups,
        uniqueTeachers,
        departmentCounts,
        teacherCounts,
        groupCounts,
        schedulesForDate,
        totalPages,
        ITEMS_PER_PAGE,

        // Loading/Error
        loading,
        setLoading,
        isLoadingStudents,
        syncStatus,
        error: sheetError || syncError,
        isLongLoading,
        sheetProgress,

        // Actions
        handleStatusChange,
        confirmMarkAll,
        handleImport,
        handleStudentAdded,
        retryFetch,

        // Notifications
        notification
    };
};
