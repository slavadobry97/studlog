
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Student, AbsenceRequest, ScheduleInfo } from '../../types/index';
import Loader from '../../components/Loader';
import ThemeToggle from '../../components/ThemeToggle';
import UserNav from '../../components/UserNav';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../../components/Notification';
import EditRequestModal from '../../components/EditRequestModal';
import TableSkeleton from '../../components/TableSkeleton';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { IconChevronLeft, IconCheck, IconX, IconArrowBackUp, IconEdit, IconFileText } from '@tabler/icons-react';

interface RequestsPageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    onToggleTheme: () => void;
    onNavigateToProfile: () => void;
    onNavigateToUserManagement: () => void;
}

// Helper to safely parse dates from Supabase
const formatDate = (isoString: string) => {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
};

const getReasonLabel = (val: string) => {
    const reasons: Record<string, string> = {
        'event_participation': 'Участие в мероприятии',
        'event_prep': 'Подготовка к мероприятию',
        'career_guidance': 'Профориентация',
        'medical': 'Болезнь',
        'family': 'Семейные обстоятельства',
        'other': 'Другое'
    };
    return reasons[val] || val;
};

// Helper to extract class info from description
const getClassInfoFromDescription = (description: string | null): { subject: string; time: string; date: string } | null => {
    if (!description) return null;

    // New format: [2025-12-23] Subject (Time) - Description
    const newFormatMatch = description.match(/\[(\d{4}-\d{2}-\d{2})\]\s*([^(]+)\(([^)]+)\)/);
    if (newFormatMatch) {
        return {
            date: newFormatMatch[1],
            subject: newFormatMatch[2].trim(),
            time: newFormatMatch[3].trim()
        };
    }

    // Old format: [Subject (Time)] Description
    const oldFormatMatch = description.match(/\[([^\(]+)\(([^\)]+)\)\]/);
    if (oldFormatMatch) {
        return {
            date: '',
            subject: oldFormatMatch[1].trim(),
            time: oldFormatMatch[2].trim()
        };
    }

    return null;
};

// --- Optimized Request Row ---
interface RequestRowProps {
    request: AbsenceRequest;
    student?: Student;
    schedule?: ScheduleInfo | null;
    onEdit: (req: AbsenceRequest) => void;
    onStatusUpdate: (id: number, status: 'approved' | 'rejected' | 'pending') => void;
}

const RequestRow: React.FC<RequestRowProps> = React.memo(({ request, student, schedule, onEdit, onStatusUpdate }) => (
    <tr className="hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
        <td className="p-4 whitespace-nowrap text-muted-foreground align-top">
            {formatDate(request.created_at)}
        </td>
        <td className="p-4 align-top">
            {student ? (
                <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.group}</div>
                </div>
            ) : (
                <span className="text-muted-foreground italic">Студент удален (ID: {request.student_id})</span>
            )}
        </td>
        <td className="p-4 hidden md:table-cell align-top">
            {schedule ? (
                <>
                    <div className="font-medium">{schedule.subject}</div>
                    <div className="text-xs text-muted-foreground">{schedule.date} {schedule.time}</div>
                </>
            ) : (() => {
                const classInfo = getClassInfoFromDescription(request.description);
                return classInfo ? (
                    <>
                        <div className="font-medium">{classInfo.subject}</div>
                        <div className="text-xs text-muted-foreground">
                            {classInfo.date && `${classInfo.date} `}{classInfo.time}
                        </div>
                    </>
                ) : (
                    <span className="italic text-muted-foreground text-xs">Информация недоступна</span>
                );
            })()}
        </td>
        <td className="p-4 align-top max-w-xs">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-1">
                {getReasonLabel(request.reason_type)}
            </div>
            {request.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {request.description.startsWith('[') && request.description.includes('] ')
                        ? request.description.split('] ')[1]
                        : request.description}
                </p>
            )}
        </td>
        <td className="p-4 text-right align-top">
            <div className="flex justify-end gap-1">
                <button
                    onClick={() => onEdit(request)}
                    title="Редактировать"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground bg-accent hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                    <IconEdit className="w-4 h-4" />
                </button>
                {request.status === 'pending' ? (
                    <>
                        <button
                            onClick={() => onStatusUpdate(request.id!, 'approved')}
                            title="Согласовать"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-green-100 text-green-700 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
                        >
                            <IconCheck className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onStatusUpdate(request.id!, 'rejected')}
                            title="Отклонить"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                        >
                            <IconX className="w-4 h-4" />
                        </button>
                    </>
                ) : request.status === 'approved' ? (
                    <button
                        onClick={() => onStatusUpdate(request.id!, 'rejected')}
                        title="Отозвать и отклонить"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={() => onStatusUpdate(request.id!, 'approved')}
                        title="Пересмотреть и согласовать"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-green-100 text-green-700 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
                    >
                        <IconArrowBackUp className="w-4 h-4" />
                    </button>
                )}
            </div>
        </td>
    </tr>
));


const RequestsPage: React.FC<RequestsPageProps> = ({ user, onLogout, theme, onToggleTheme, onNavigateToProfile, onNavigateToUserManagement }) => {
    const [requests, setRequests] = useState<AbsenceRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const { notification, showNotification } = useNotification();

    const [editingRequest, setEditingRequest] = useState<AbsenceRequest | null>(null);
    const studentsRef = useRef<Student[]>([]); // Ref to access current students in closure

    // Update ref when students state changes
    useEffect(() => {
        studentsRef.current = students;
    }, [students]);

    // Fetch Data
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Requests
                const { data: requestData, error: reqError } = await supabase
                    .from('absence_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (reqError) {
                    throw reqError;
                } else {
                    setRequests((requestData as unknown as AbsenceRequest[]) || []);
                }

                // 2. Fetch Students (for names and avatars)
                const { data: studentData } = await supabase.from('students').select('*');
                if (studentData) setStudents(studentData);

                // 3. Fetch Schedule (for class details if available)
                const { data: scheduleData } = await supabase.from('schedule').select('*');
                if (scheduleData) setSchedules(scheduleData.map(s => ({
                    id: s.id, group: s.group, teacher: s.teacher_name, subject: s.subject, time: s.time, date: s.date
                })));

            } catch (err: any) {
                console.error(err);
                const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Неизвестная ошибка');
                showNotification(`Ошибка загрузки данных: ${errorMessage}`, 'info');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [showNotification]);

    // Real-time Subscription
    useEffect(() => {
        const channel = supabase.channel('realtime_requests')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'absence_requests' },
                async (payload: RealtimePostgresChangesPayload<AbsenceRequest>) => {
                    if (payload.eventType === 'INSERT') {
                        const newRequest = payload.new as AbsenceRequest;
                        setRequests(prev => [newRequest, ...prev]);

                        // Try to find student name immediately
                        const studentId = newRequest.student_id;
                        let studentName = 'Студент';

                        // Check cached students
                        const cachedStudent = studentsRef.current.find(s => s.id === studentId);

                        if (cachedStudent) {
                            studentName = cachedStudent.name;
                        } else {
                            // If student not found (maybe new?), try to fetch specifically
                            const { data } = await supabase.from('students').select('name').eq('id', studentId).single();
                            if (data) studentName = data.name;
                        }

                        showNotification(`Новая заявка: ${studentName}`, 'info');
                    }
                    else if (payload.eventType === 'UPDATE') {
                        const updatedRequest = payload.new as AbsenceRequest;
                        setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
                        // No notification on update to avoid spam if self-triggered, 
                        // but lists update instantly for everyone.
                    }
                    else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        setRequests(prev => prev.filter(r => r.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [showNotification]); // Only depend on stable notification hook

    // Helper to extract dates from description
    const extractDatesFromDescription = (description: string | null): string[] => {
        if (!description) return [];

        // Format 1: [2025-12-23, 2025-12-24] rest of text (multiple dates)
        const multiDateMatch = description.match(/\[([\d\-,\s]+)\]/);
        if (multiDateMatch) {
            const dates = multiDateMatch[1].split(',').map(d => d.trim()).filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d));
            if (dates.length > 0) return dates;
        }

        // Format 2: [2025-12-23] Subject (Time) - Description (single date from unsynced schedule)
        const singleDateMatch = description.match(/\[(\d{4}-\d{2}-\d{2})\]/);
        if (singleDateMatch) {
            return [singleDateMatch[1]];
        }

        return [];
    };

    // Helper to extract subject and time from old format: [Subject (Time)]
    const extractSubjectAndTime = (description: string | null): { subject: string; time: string } | null => {
        if (!description) return null;

        // Old format: [Subject (Time)] Description
        const match = description.match(/\[([^\(]+)\(([^\)]+)\)\]/);
        if (match) {
            return {
                subject: match[1].trim(),
                time: match[2].trim()
            };
        }

        return null;
    };

    // Handle attendance records when approving a request
    const handleApprovalAttendance = async (request: AbsenceRequest) => {
        try {
            console.log('=== Handling Approval Attendance ===');
            console.log('Request:', request);

            if (request.schedule_id) {
                console.log('Processing single class absence, schedule_id:', request.schedule_id);

                // Single class absence
                const schedule = schedules.find(s => s.id === request.schedule_id);
                if (!schedule) {
                    console.warn('Schedule not found for request', request.id);
                    return;
                }

                console.log('Found schedule:', schedule);

                // Check if attendance record already exists
                const { data: existing, error: selectError } = await supabase
                    .from('attendance')
                    .select('id')
                    .eq('student_id', request.student_id)
                    .eq('schedule_id', request.schedule_id)
                    .eq('date', schedule.date)
                    .maybeSingle();

                if (selectError) {
                    console.error('Error checking existing attendance:', selectError);
                    throw selectError;
                }

                console.log('Existing attendance record:', existing);

                if (existing) {
                    // Update existing record
                    console.log('Updating existing attendance record:', existing.id);
                    const { error: updateError } = await supabase
                        .from('attendance')
                        .update({
                            status: 'ExcusedAbsent',
                            absence_request_id: request.id
                        })
                        .eq('id', existing.id);

                    if (updateError) {
                        console.error('Error updating attendance:', updateError);
                        throw updateError;
                    }
                    console.log('✅ Successfully updated attendance record');
                } else {
                    // Create new record
                    console.log('Creating new attendance record');
                    const { error: insertError } = await supabase
                        .from('attendance')
                        .insert({
                            student_id: request.student_id,
                            schedule_id: request.schedule_id,
                            date: schedule.date,
                            status: 'ExcusedAbsent',
                            absence_request_id: request.id
                        });

                    if (insertError) {
                        console.error('Error inserting attendance:', insertError);
                        throw insertError;
                    }
                    console.log('✅ Successfully created attendance record');
                }
            } else {
                console.log('Processing period absence');

                // Period absence - extract dates from description
                const dates = extractDatesFromDescription(request.description);
                console.log('Extracted dates:', dates);

                if (dates.length === 0) {
                    // Fallback: Try old format [Subject (Time)]
                    console.log('No dates found, trying old format...');
                    const subjectTime = extractSubjectAndTime(request.description);

                    if (subjectTime) {
                        console.log('Extracted from old format:', subjectTime);

                        const student = students.find(s => s.id === request.student_id);
                        if (!student) {
                            console.warn('Student not found for request', request.id);
                            return;
                        }

                        // Find matching schedule by subject and time
                        const matchingSchedules = schedules.filter(s =>
                            s.subject.toLowerCase().includes(subjectTime.subject.toLowerCase()) &&
                            s.time === subjectTime.time &&
                            s.group === student.group
                        );

                        console.log('Found matching schedules:', matchingSchedules);

                        if (matchingSchedules.length === 0) {
                            console.warn('No matching schedules found for old format request');
                            showNotification('Не удалось найти занятие по описанию заявки. Возможно, расписание изменилось.', 'info');
                            return;
                        }

                        // Create attendance for the first matching schedule
                        const schedule = matchingSchedules[0];
                        const { data: existing, error: selectError } = await supabase
                            .from('attendance')
                            .select('id')
                            .eq('student_id', request.student_id)
                            .eq('schedule_id', schedule.id)
                            .eq('date', schedule.date)
                            .maybeSingle();

                        if (selectError) {
                            console.error('Error checking existing attendance:', selectError);
                            throw selectError;
                        }

                        if (existing) {
                            console.log('Updating existing attendance for old format');
                            const { error: updateError } = await supabase
                                .from('attendance')
                                .update({
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                })
                                .eq('id', existing.id);

                            if (updateError) {
                                console.error('Error updating attendance:', updateError);
                                throw updateError;
                            }
                            console.log('✅ Successfully updated attendance (old format)');
                        } else {
                            console.log('Creating new attendance for old format');
                            const { error: insertError } = await supabase
                                .from('attendance')
                                .insert({
                                    student_id: request.student_id,
                                    schedule_id: schedule.id,
                                    date: schedule.date,
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                });

                            if (insertError) {
                                console.error('Error inserting attendance:', insertError);
                                throw insertError;
                            }
                            console.log('✅ Successfully created attendance (old format)');
                        }
                    } else {
                        console.warn('Could not extract dates or subject/time from description');
                    }
                    return;
                }

                const student = students.find(s => s.id === request.student_id);
                if (!student) {
                    console.warn('Student not found for request', request.id);
                    return;
                }

                console.log('Student:', student);

                // Process each date
                for (const date of dates) {
                    console.log(`Processing date: ${date}`);

                    // Find all schedules for this student's group on this date
                    const daySchedules = schedules.filter(s =>
                        s.date === date && s.group === student.group
                    );

                    console.log(`Found ${daySchedules.length} schedules for ${date}:`, daySchedules);

                    if (daySchedules.length === 0) {
                        // No schedules found in DB for this group/date
                        // Try to extract subject and time from description to find the specific class
                        console.log(`No schedules in DB for group ${student.group} on ${date}`);

                        // Extract subject and time from description
                        // New format: [2025-12-23] Subject (Time) - Description
                        const subjectTimeMatch = request.description?.match(/\]\s*([^(]+)\(([^)]+)\)/);

                        if (subjectTimeMatch) {
                            const subject = subjectTimeMatch[1].trim();
                            const time = subjectTimeMatch[2].trim();
                            console.log(`Extracted subject: "${subject}", time: "${time}"`);

                            // Search for matching schedule directly in Supabase
                            const { data: matchingSchedules, error: scheduleError } = await supabase
                                .from('schedule')
                                .select('*')
                                .eq('date', date)
                                .ilike('subject', `%${subject}%`)
                                .eq('time', time);

                            if (scheduleError) {
                                console.error('Error searching for schedule:', scheduleError);
                            } else {
                                console.log(`Found ${matchingSchedules?.length || 0} matching schedules in DB:`, matchingSchedules);
                            }

                            const matchingSchedule = matchingSchedules?.[0];

                            if (matchingSchedule) {
                                console.log(`Using schedule:`, matchingSchedule);

                                // Check if attendance already exists
                                const { data: existing, error: selectError } = await supabase
                                    .from('attendance')
                                    .select('id')
                                    .eq('student_id', request.student_id)
                                    .eq('schedule_id', matchingSchedule.id)
                                    .eq('date', date)
                                    .maybeSingle();

                                if (selectError) {
                                    console.error('Error checking existing attendance:', selectError);
                                    continue;
                                }

                                if (existing) {
                                    console.log('Updating existing attendance');
                                    const { error: updateError } = await supabase
                                        .from('attendance')
                                        .update({
                                            status: 'ExcusedAbsent',
                                            absence_request_id: request.id
                                        })
                                        .eq('id', existing.id);

                                    if (updateError) {
                                        console.error('Error updating attendance:', updateError);
                                    } else {
                                        console.log('✅ Updated attendance with schedule');
                                    }
                                } else {
                                    console.log('Creating new attendance with schedule');
                                    const { error: insertError } = await supabase
                                        .from('attendance')
                                        .insert({
                                            student_id: request.student_id,
                                            schedule_id: matchingSchedule.id,
                                            date: date,
                                            status: 'ExcusedAbsent',
                                            absence_request_id: request.id
                                        });

                                    if (insertError) {
                                        console.error('Error inserting attendance:', insertError);
                                    } else {
                                        console.log('✅ Created attendance with schedule');
                                    }
                                }
                                continue;
                            } else {
                                console.log(`No matching schedule found for subject "${subject}" and time "${time}"`);
                            }
                        }

                        // Fallback: create attendance record without schedule_id
                        console.log(`Creating attendance without schedule_id as fallback`);

                        const { data: existing, error: selectError } = await supabase
                            .from('attendance')
                            .select('id')
                            .eq('student_id', request.student_id)
                            .eq('date', date)
                            .is('schedule_id', null)
                            .maybeSingle();

                        if (selectError) {
                            console.error('Error checking existing attendance:', selectError);
                            continue;
                        }

                        if (existing) {
                            console.log('Updating existing attendance without schedule');
                            const { error: updateError } = await supabase
                                .from('attendance')
                                .update({
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                })
                                .eq('id', existing.id);

                            if (updateError) {
                                console.error('Error updating attendance:', updateError);
                            } else {
                                console.log('✅ Updated attendance (no schedule)');
                            }
                        } else {
                            console.log('Creating new attendance without schedule');
                            const { error: insertError } = await supabase
                                .from('attendance')
                                .insert({
                                    student_id: request.student_id,
                                    schedule_id: null,
                                    date: date,
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                });

                            if (insertError) {
                                console.error('Error inserting attendance:', insertError);
                            } else {
                                console.log('✅ Created attendance (no schedule)');
                            }
                        }
                        continue;
                    }

                    // Create/update attendance for each class
                    for (const schedule of daySchedules) {
                        const { data: existing, error: selectError } = await supabase
                            .from('attendance')
                            .select('id')
                            .eq('student_id', request.student_id)
                            .eq('schedule_id', schedule.id)
                            .eq('date', date)
                            .maybeSingle();

                        if (selectError) {
                            console.error('Error checking existing attendance:', selectError);
                            continue;
                        }

                        if (existing) {
                            console.log(`Updating attendance for schedule ${schedule.id}`);
                            const { error: updateError } = await supabase
                                .from('attendance')
                                .update({
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                })
                                .eq('id', existing.id);

                            if (updateError) {
                                console.error('Error updating attendance:', updateError);
                            } else {
                                console.log('✅ Updated attendance');
                            }
                        } else {
                            console.log(`Creating attendance for schedule ${schedule.id}`);
                            const { error: insertError } = await supabase
                                .from('attendance')
                                .insert({
                                    student_id: request.student_id,
                                    schedule_id: schedule.id,
                                    date: date,
                                    status: 'ExcusedAbsent',
                                    absence_request_id: request.id
                                });

                            if (insertError) {
                                console.error('Error inserting attendance:', insertError);
                            } else {
                                console.log('✅ Created attendance');
                            }
                        }
                    }
                }
            }
            console.log('=== Approval Attendance Complete ===');
        } catch (err) {
            console.error('Error handling approval attendance:', err);
            throw err;
        }
    };

    // Handle attendance records when rejecting a request
    const handleRejectionAttendance = async (requestId: number) => {
        try {
            // Find all attendance records linked to this request
            const { data: linkedAttendance } = await supabase
                .from('attendance')
                .select('id')
                .eq('absence_request_id', requestId);

            if (linkedAttendance && linkedAttendance.length > 0) {
                // Change to unexcused and remove link
                await supabase
                    .from('attendance')
                    .update({
                        status: 'Absent',
                        absence_request_id: null
                    })
                    .eq('absence_request_id', requestId);
            }
        } catch (err) {
            console.error('Error handling rejection attendance:', err);
            throw err;
        }
    };

    const handleStatusUpdate = useCallback(async (requestId: number, newStatus: 'approved' | 'rejected' | 'pending') => {
        // Optimistic Update to prevent UI lag
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

        try {
            // Get request data before updating
            const request = requests.find(r => r.id === requestId);
            if (!request) throw new Error('Заявка не найдена');

            // Update request status
            const { error } = await supabase
                .from('absence_requests')
                .update({ status: newStatus })
                .eq('id', requestId);

            if (error) {
                throw error;
            }

            // Handle attendance records based on new status
            if (newStatus === 'approved') {
                await handleApprovalAttendance(request);
            } else if (newStatus === 'rejected') {
                await handleRejectionAttendance(requestId);
            }

            let message = '';
            if (newStatus === 'approved') message = 'Заявка одобрена. Пропуски отмечены как уважительные.';
            else if (newStatus === 'rejected') message = 'Заявка отклонена. Связанные пропуски изменены на неуважительные.';
            else message = 'Статус сброшен (ожидание)';

            showNotification(message, 'success');
        } catch (err: any) {
            // Revert optimistic update only on error, by refetching is safest or reverting state logic
            const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Неизвестная ошибка');
            showNotification(`Ошибка обновления: ${errorMessage}`, 'info');

            // Re-fetch strictly needed data to sync state
            const { data } = await supabase.from('absence_requests').select('*').eq('id', requestId).single();
            if (data) {
                setRequests(prev => prev.map(r => r.id === requestId ? (data as unknown as AbsenceRequest) : r));
            }
        }
    }, [requests, students, schedules, showNotification]);

    const handleEditSave = async (id: number, reasonType: string, description: string) => {
        try {
            const { error } = await supabase
                .from('absence_requests')
                .update({ reason_type: reasonType, description: description })
                .eq('id', id);

            if (error) throw error;

            setRequests(prev => prev.map(r => r.id === id ? { ...r, reason_type: reasonType, description: description } : r));
            showNotification('Заявка успешно обновлена', 'success');
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Неизвестная ошибка');
            showNotification(`Ошибка при редактировании: ${errorMessage}`, 'info');
        }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(r => r.status === filterStatus);
    }, [requests, filterStatus]);

    const getStudent = (id: number) => students.find(s => s.id === id);
    const getSchedule = (id: number) => schedules.find(s => s.id === id);



    // Подсчёт заявок по статусам
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    return (
        <div className="min-h-screen bg-muted flex flex-col">

            <main className="flex-1 flex flex-col container mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
                    <TabsList className="bg-background border p-1 mb-6 rounded-xl shadow-sm h-auto inline-flex gap-1">
                        <TabsTrigger
                            value="pending"
                            className="rounded-lg px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-2 transition-all duration-200"
                        >
                            Ожидающие
                            {pendingCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-bold">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="approved"
                            className="rounded-lg px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-2 transition-all duration-200"
                        >
                            Согласованные
                            {approvedCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
                                    {approvedCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="rejected"
                            className="rounded-lg px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-2 transition-all duration-200"
                        >
                            Отклонённые
                            {rejectedCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-600 text-[11px] font-bold">
                                    {rejectedCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="flex-1 mt-0">
                        <div className="rounded-lg border bg-card overflow-hidden h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-12"><TableSkeleton rows={5} /></div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9 2 2 4-4" /></svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground">Заявок нет</h3>
                                        <p className="text-muted-foreground mt-1">В этой категории пока нет заявок.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                            <tr className="border-b shadow-sm">
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Дата</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Студент</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Занятие</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Причина</th>
                                                <th className="h-10 px-4 text-right font-medium text-muted-foreground w-[180px]">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredRequests.map(req => (
                                                <RequestRow
                                                    key={req.id}
                                                    request={req}
                                                    student={getStudent(req.student_id)}
                                                    schedule={req.schedule_id ? getSchedule(req.schedule_id) : null}
                                                    onEdit={setEditingRequest}
                                                    onStatusUpdate={handleStatusUpdate}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="approved" className="flex-1 mt-0">
                        <div className="rounded-lg border bg-card overflow-hidden h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-12"><TableSkeleton rows={5} /></div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9 2 2 4-4" /></svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground">Заявок нет</h3>
                                        <p className="text-muted-foreground mt-1">В этой категории пока нет заявок.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                            <tr className="border-b shadow-sm">
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Дата</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Студент</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Занятие</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Причина</th>
                                                <th className="h-10 px-4 text-right font-medium text-muted-foreground w-[180px]">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredRequests.map(req => (
                                                <RequestRow
                                                    key={req.id}
                                                    request={req}
                                                    student={getStudent(req.student_id)}
                                                    schedule={req.schedule_id ? getSchedule(req.schedule_id) : null}
                                                    onEdit={setEditingRequest}
                                                    onStatusUpdate={handleStatusUpdate}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="rejected" className="flex-1 mt-0">
                        <div className="rounded-lg border bg-card overflow-hidden h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-12"><TableSkeleton rows={5} /></div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9 2 2 4-4" /></svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground">Заявок нет</h3>
                                        <p className="text-muted-foreground mt-1">В этой категории пока нет заявок.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                            <tr className="border-b shadow-sm">
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Дата</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Студент</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Занятие</th>
                                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Причина</th>
                                                <th className="h-10 px-4 text-right font-medium text-muted-foreground w-[180px]">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredRequests.map(req => (
                                                <RequestRow
                                                    key={req.id}
                                                    request={req}
                                                    student={getStudent(req.student_id)}
                                                    schedule={req.schedule_id ? getSchedule(req.schedule_id) : null}
                                                    onEdit={setEditingRequest}
                                                    onStatusUpdate={handleStatusUpdate}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
            {editingRequest && (
                <EditRequestModal
                    isOpen={!!editingRequest}
                    onClose={() => setEditingRequest(null)}
                    onSave={handleEditSave}
                    request={editingRequest}
                    studentName={getStudent(editingRequest.student_id)?.name || 'Неизвестный студент'}
                />
            )}
            <Notification message={notification?.message || null} type={notification?.type} />
        </div>
    );
};

export default RequestsPage;
