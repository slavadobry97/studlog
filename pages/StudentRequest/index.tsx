import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, ScheduleInfo, AbsenceRequest } from '../../types/index';
import DatePicker from '../../components/DatePicker';
import Loader from '../../components/Loader';
import CustomSelect from '../../components/CustomSelect';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../../components/Notification';
import Logo from '../../components/Logo';
import { useGoogleSheetData } from '../../hooks/useGoogleSheetData';
import { SCHEDULE_SHEET_URL } from '../../config/index';
import { IconChevronLeft, IconSquareRoundedCheck, IconSquareRounded, IconCircleCheck, IconLoader2 } from '@tabler/icons-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { ABSENCE_REASONS, COLUMN_MAP } from '../../constants';


interface StudentRequestPageProps {
    onBack: () => void;
    theme: string;
}



// Constants for Google Sheet Parsing


const parseSheetDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const trimmedDate = dateStr.trim();
    // Check for DD.MM.YYYY format
    const match = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year} -${month.padStart(2, '0')} -${day.padStart(2, '0')} `;
    }
    // Assume other formats (like YYYY-MM-DD) are already correct.
    return trimmedDate;
};

// Helper to extract error message safely
const getErrorMessage = (error: any): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
        if ('message' in error) return String((error as any).message);
        if ('error_description' in error) return String((error as any).error_description);
        if ('details' in error) return String((error as any).details);
    }
    return 'Неизвестная ошибка';
};

const StudentRequestPage: React.FC<StudentRequestPageProps> = ({ onBack, theme }) => {
    // Form State
    const [date, setDate] = useState(new Date());
    const [group, setGroup] = useState('');
    // Changed from single ID to array of IDs
    const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
    const [studentId, setStudentId] = useState<string>('');
    const [reasonType, setReasonType] = useState('');
    const [reasonDescription, setReasonDescription] = useState('');

    // Data State
    const [groups, setGroups] = useState<string[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { notification, showNotification } = useNotification();
    const [submitted, setSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<{ classCount: number; date: string } | null>(null);

    // Fetch Google Sheet Data
    const { data: sheetData, loading: sheetLoadingRaw } = useGoogleSheetData(SCHEDULE_SHEET_URL);

    // Fetch Groups: Combine Supabase and Google Sheets (as fallback if RLS blocks DB)
    useEffect(() => {
        const fetchGroups = async () => {
            const allGroups = new Set<string>();

            // 1. Try Supabase
            const { data, error } = await supabase.from('students').select('group');
            if (data) {
                data.forEach((d: any) => {
                    if (d.group) allGroups.add(d.group.trim());
                });
            }

            // 2. Try Google Sheets (Fallback)
            if (sheetData && sheetData.length > 1) {
                const header = sheetData[0].map(h => h.trim().toLowerCase());
                const groupIndex = header.indexOf('учебная группа');

                if (groupIndex !== -1) {
                    for (let i = 1; i < sheetData.length; i++) {
                        const row = sheetData[i];
                        if (row[groupIndex]) {
                            allGroups.add(row[groupIndex].trim());
                        }
                    }
                }
            }

            setGroups(Array.from(allGroups).sort());
        };

        fetchGroups();
    }, [sheetData]);

    // Fetch Students when Group changes
    useEffect(() => {
        if (!group) {
            setStudents([]);
            setStudentId('');
            return;
        }
        const fetchStudents = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('group', group)
                .order('name');

            if (data) {
                // Map the DB response (snake_case) to our Type (camelCase)
                const mappedStudents: Student[] = data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    group: s.group,
                    avatarUrl: s.avatar_url
                }));
                setStudents(mappedStudents);
            } else if (error) {
                // If error implies RLS or network issue
                console.error("Student fetch error:", error);
                showNotification("Не удалось загрузить список студентов. Возможно, доступ ограничен.", "info");
            }
            setLoading(false);
        };
        fetchStudents();
    }, [group, showNotification]);

    // Calculate Schedule from Google Sheet Data
    useEffect(() => {
        setSelectedScheduleIds([]); // Reset selection when filters change

        if (!group || !sheetData) {
            setSchedules([]);
            return;
        }

        setScheduleLoading(true);

        const processSchedule = async () => {
            try {
                // 1. Prepare target filters
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const targetDateStr = `${year} -${month} -${day} `;
                const normalizedGroup = group.trim().toLowerCase();

                // 2. Parse Google Sheet Data
                const header = sheetData[0].map(h => h.trim().toLowerCase());
                const headerIndexMap: { [key: string]: number } = {};
                for (const russianHeader in COLUMN_MAP) {
                    const index = header.indexOf(russianHeader);
                    if (index !== -1) headerIndexMap[COLUMN_MAP[russianHeader]] = index;
                }

                const matchedSheetRows: ScheduleInfo[] = [];

                // Skip header row
                for (let i = 1; i < sheetData.length; i++) {
                    const row = sheetData[i];
                    // Skip empty rows
                    if (!row || row.length === 0) continue;

                    const rawDate = row[headerIndexMap.date];
                    const rawGroup = row[headerIndexMap.group];

                    if (!rawDate || !rawGroup) continue;

                    const rowDateStr = parseSheetDate(rawDate);

                    if (rowDateStr === targetDateStr) {
                        if (rawGroup.trim().toLowerCase() === normalizedGroup) {
                            matchedSheetRows.push({
                                id: -i, // Temporary negative ID to indicate "from sheet"
                                group: rawGroup.trim(),
                                teacher: row[headerIndexMap.teacher_name]?.trim() || '',
                                subject: row[headerIndexMap.subject]?.trim() || '',
                                time: row[headerIndexMap.time]?.trim() || '',
                                date: rowDateStr,
                                loadType: row[headerIndexMap.load_type]?.trim(),
                                classroom: row[headerIndexMap.classroom]?.trim()
                            });
                        }
                    }
                }

                // 3. Try to fetch matching IDs from Supabase to ensure Foreign Key integrity on submit
                // We fetch all schedules for this date from DB
                const { data: dbData } = await supabase
                    .from('schedule')
                    .select('*')
                    .eq('date', targetDateStr);

                // 4. Merge Data: Use Sheet Data for display, but grab ID from DB if available
                const finalSchedules = matchedSheetRows.map(sheetItem => {
                    const matchingDbRecord = dbData?.find(dbItem =>
                        dbItem.group.trim().toLowerCase() === sheetItem.group.toLowerCase() &&
                        dbItem.time.trim() === sheetItem.time.trim() &&
                        dbItem.subject.trim().toLowerCase() === sheetItem.subject.toLowerCase()
                    );

                    return {
                        ...sheetItem,
                        id: matchingDbRecord ? matchingDbRecord.id : sheetItem.id
                    };
                });

                // Sort by time
                finalSchedules.sort((a, b) => a.time.localeCompare(b.time));

                setSchedules(finalSchedules);

            } catch (err) {
                console.error("Error processing schedule from sheet:", err);
                setSchedules([]);
            } finally {
                setScheduleLoading(false);
            }
        };

        processSchedule();

    }, [group, date, sheetData]);

    const toggleSchedule = (id: string) => {
        setSelectedScheduleIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleAllSchedules = () => {
        if (selectedScheduleIds.length === schedules.length) {
            setSelectedScheduleIds([]);
        } else {
            setSelectedScheduleIds(schedules.map(s => s.id.toString()));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!group || !studentId || selectedScheduleIds.length === 0 || !reasonType) {
            showNotification('Пожалуйста, заполните все обязательные поля.', 'info');
            return;
        }

        if (reasonType === 'other' && !reasonDescription.trim()) {
            showNotification('Для причины "Другое" необходимо заполнить поле "Пояснение / Комментарий".', 'info');
            return;
        }

        setSubmitting(true);

        try {
            const requests = selectedScheduleIds.map(scheduleId => {
                const numericId = parseInt(scheduleId);
                const isUnsynced = numericId < 0;

                // Find the schedule details to preserve them if unsynced
                const scheduleItem = schedules.find(s => s.id.toString() === scheduleId);

                // If unsynced, we can't send a negative ID to DB. We send null.
                // We append the details to the description so admins know what class it was.
                // Format: [DATE] Subject (Time) - Description
                const finalDescription = isUnsynced && scheduleItem
                    ? `[${scheduleItem.date}] ${scheduleItem.subject} (${scheduleItem.time}) - ${reasonDescription} `
                    : reasonDescription;

                return {
                    student_id: parseInt(studentId),
                    schedule_id: isUnsynced ? null : numericId,
                    reason_type: reasonType,
                    description: finalDescription,
                    study_form: '',
                    direction: '',
                    status: 'pending',
                    created_at: new Date().toISOString()
                };
            });

            // Capture data for success screen
            setSubmittedData({
                classCount: selectedScheduleIds.length,
                date: date.toLocaleDateString('ru-RU')
            });

            // Attempt to insert into absence_requests table.
            const { error } = await supabase
                .from('absence_requests' as any)
                .insert(requests);

            if (error) {
                throw error;
            }

            setSubmitted(true);
            showNotification('Заявка успешно отправлена!', 'success');
        } catch (err: any) {
            console.error(err);
            const msg = getErrorMessage(err);
            showNotification(`Ошибка при отправке заявки: ${msg} `, 'info');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg">
                    <CardContent className="pt-6 text-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <IconCircleCheck className="w-8 h-8" stroke={2} />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Заявка отправлена</h2>
                        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg text-left space-y-2">
                            <p><strong>Дата:</strong> {submittedData?.date}</p>
                            <p><strong>Количество занятий:</strong> {submittedData?.classCount}</p>
                            <p><strong>Причина:</strong> {ABSENCE_REASONS.find(r => r.value === reasonType)?.label}</p>
                            <p className="pt-2 text-xs opacity-75">Заявка будет рассмотрена деканатом.</p>
                        </div>
                        <div className="grid gap-3">
                            <Button
                                onClick={onBack}
                                className="w-full"
                            >
                                Вернуться на главную
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSubmitted(false);
                                    setReasonDescription('');
                                    setSelectedScheduleIds([]);
                                    // Keep student and group selected for convenience
                                }}
                                className="w-full"
                            >
                                Отправить еще одну
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted flex flex-col">
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center gap-6">
                <Logo className="h-24 sm:h-28" />

                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-lg md:text-2xl">Заявка на пропуск занятий студентов</CardTitle>
                        <CardDescription>Укажите причину отсутствия на занятии.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* 1. Date */}
                            <div className="space-y-2">
                                <Label>Дата занятия <span className="text-destructive">*</span></Label>
                                <DatePicker selectedDate={date} onDateChange={(d) => { setDate(d); }} />
                            </div>

                            {/* 2. Group */}
                            <div className="space-y-2">
                                <Label>Учебная группа <span className="text-destructive">*</span></Label>
                                <CustomSelect
                                    options={groups.map(g => ({ value: g, label: g }))}
                                    selectedValue={group}
                                    onValueChange={(val) => { setGroup(val); setStudentId(''); }}
                                    placeholder={groups.length > 0 ? "Выберите группу" : "Загрузка групп..."}
                                />
                            </div>

                            {/* 3. Schedule / Class (Multi-select) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Занятия (можно выбрать несколько) <span className="text-destructive">*</span></Label>
                                    {schedules.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            onClick={toggleAllSchedules}
                                            className="h-auto p-0 text-xs"
                                        >
                                            {selectedScheduleIds.length === schedules.length ? 'Снять выделение' : 'Выбрать все'}
                                        </Button>
                                    )}
                                </div>

                                {!group ? (
                                    <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg bg-muted/50 text-center">
                                        Сначала выберите учебную группу, чтобы увидеть список занятий.
                                    </div>
                                ) : (scheduleLoading || sheetLoadingRaw) ? (
                                    <div className="p-4 border border-dashed rounded-lg bg-muted/50 flex justify-center">
                                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                                    </div>
                                ) : schedules.length === 0 ? (
                                    <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg bg-muted/50 text-center">
                                        Нет занятий на выбранную дату для этой группы.
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {schedules.map(schedule => {
                                            const isSelected = selectedScheduleIds.includes(schedule.id.toString());
                                            const isUnsynced = schedule.id < 0;
                                            return (
                                                <div
                                                    key={schedule.id}
                                                    className={`flex items-start space-x-3 p-2 border rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-primary/5 border-primary ring-0 ring-primary' : 'hover:bg-accent/50 border-input'} `}
                                                    onClick={() => toggleSchedule(schedule.id.toString())}
                                                >
                                                    <div className={`-mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'} `}>
                                                        {isSelected ? <IconSquareRoundedCheck className="w-5 h-5" stroke={1.5} /> : <IconSquareRounded className="w-5 h-5" stroke={1.5} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <p className="text-sm font-medium leading-none">{schedule.time} — {schedule.subject}</p>
                                                            {isUnsynced && (
                                                                <span title="Это занятие из Google Таблицы, оно еще не синхронизировано с базой данных." className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                                                    Не синхр.
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{schedule.teacher}</p>
                                                        <div className="flex gap-2 text-[10px] text-muted-foreground/70">
                                                            {schedule.loadType && <span>{schedule.loadType}</span>}
                                                            {schedule.classroom && <span>{schedule.classroom}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 4. Student Name */}
                            <div className="space-y-2">
                                <Label>ФИО студента <span className="text-destructive">*</span></Label>
                                {loading ? (
                                    <div className="h-10 w-full rounded-lg border border-input bg-muted animate-pulse"></div>
                                ) : (
                                    <>
                                        <CustomSelect
                                            options={students.map(s => ({ value: s.id.toString(), label: s.name }))}
                                            selectedValue={studentId}
                                            onValueChange={setStudentId}
                                            placeholder={group ? (students.length > 0 ? "Выберите себя из списка" : "Список студентов пуст (Проверьте доступ)") : "Сначала выберите группу"}
                                            disabled={!group || students.length === 0}
                                        />
                                        {group && students.length === 0 && (
                                            <p className="text-xs text-red-500">
                                                Не удалось загрузить студентов этой группы. Возможно, база данных недоступна или доступ ограничен (RLS). Попробуйте позже.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* 5. Reason */}
                            <div className="space-y-2">
                                <Label>Причина отсутствия <span className="text-destructive">*</span></Label>
                                <CustomSelect
                                    options={ABSENCE_REASONS}
                                    selectedValue={reasonType}
                                    onValueChange={setReasonType}
                                    placeholder="Выберите причину"
                                />
                            </div>

                            {/* 6. Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Пояснение / Комментарий
                                    {reasonType === 'other' && <span className="text-destructive"> *</span>}
                                </Label>
                                <Textarea
                                    id="description"
                                    value={reasonDescription}
                                    onChange={(e) => setReasonDescription(e.target.value)}
                                    placeholder="Опишите подробности, если необходимо (название мероприятия, школы и т.д.)"
                                    className="min-h-[100px] text-xs md:text-sm"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onBack}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting || !studentId || selectedScheduleIds.length === 0}
                                >
                                    {submitting ? (
                                        <>
                                            <IconLoader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                            Отправка...
                                        </>
                                    ) : 'Отправить заявку'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
            <Notification message={notification?.message || null} type={notification?.type} />
        </div>
    );
};

export default StudentRequestPage;
