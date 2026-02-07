import React, { useMemo } from 'react';
import { ScheduleInfo, Student, AttendanceRecords, AttendanceStatus } from '../types';
import Loader from './Loader';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';

// --- Types ---
interface DisciplineDetailModalProps {
    disciplineName: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    schedule: ScheduleInfo[];
    students: Student[];
    attendanceRecords: AttendanceRecords;
    onClose: () => void;
}

// --- Main Component ---
const DisciplineDetailModal: React.FC<DisciplineDetailModalProps> = ({ disciplineName, startDate, endDate, schedule, students, attendanceRecords, onClose }) => {

    const detailedClassData = useMemo(() => {
        // Filter schedule for the selected discipline and date range
        const relevantClasses = schedule.filter(s =>
            s.subject === disciplineName &&
            s.date >= startDate &&
            s.date <= endDate
        );

        // Create a map for quick lookup of students by group
        const studentsByGroup = new Map<string, Student[]>();
        students.forEach(student => {
            if (!studentsByGroup.has(student.group)) {
                studentsByGroup.set(student.group, []);
            }
            studentsByGroup.get(student.group)!.push(student);
        });

        const results = relevantClasses.map(classInfo => {
            const groupStudents = studentsByGroup.get(classInfo.group) || [];
            const dayRecord = attendanceRecords[classInfo.date] || {};

            let presentCount = 0;
            let hasAttendanceRecord = false;

            groupStudents.forEach(student => {
                const status = dayRecord[student.id];
                if (status !== undefined) {
                    hasAttendanceRecord = true;
                    if (status === AttendanceStatus.Present) {
                        presentCount++;
                    }
                }
            });

            // Only include classes that were actually conducted (have at least one attendance mark)
            if (!hasAttendanceRecord) return null;

            const totalStudents = groupStudents.length;
            const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

            return {
                ...classInfo,
                presentCount,
                totalStudents,
                attendanceRate
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null); // Filter out nulls

        // Sort by date descending, then by time descending (newest first, top to bottom)
        return results.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            // If dates are equal, sort by time (latest time first)
            return (b.time || '').localeCompare(a.time || '');
        });
    }, [disciplineName, startDate, endDate, schedule, students, attendanceRecords]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getRateColor = (rate: number) => {
        if (rate >= 80) return 'text-green-600 dark:text-green-500';
        if (rate >= 50) return 'text-yellow-600 dark:text-yellow-500';
        return 'text-red-600 dark:text-red-500';
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discipline-detail-title"
        >
            <div
                className="relative bg-background w-full max-w-3xl m-4 rounded-lg border shadow-lg flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b">
                    <h2 id="discipline-detail-title" className="text-xl font-semibold tracking-tight truncate">Детализация по дисциплине</h2>
                    <p className="text-sm text-muted-foreground mt-1 truncate">"{disciplineName}"</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                    {detailedClassData.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {detailedClassData.map(classData => (
                                <li key={classData.id} className="p-2 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                                    <div className="md:col-span-2">
                                        <p className="font-semibold">{formatDate(classData.date)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Группа: <span className="text-foreground font-medium">{classData.group}</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Преподаватель: <span className="text-foreground font-medium">{classData.teacher}</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Время: <span className="text-foreground font-medium">{classData.time}</span>
                                        </p>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-sm text-muted-foreground">Посещаемость:</p>
                                        <p className="font-semibold">
                                            {classData.presentCount} / {classData.totalStudents}
                                            <span className={`ml-2 ${getRateColor(classData.attendanceRate)}`}>
                                                ({classData.attendanceRate.toFixed(1)}%)
                                            </span>
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Нет проведенных занятий по этой дисциплине за выбранный период.
                        </div>
                    )}
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

export default DisciplineDetailModal;