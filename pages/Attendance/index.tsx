
import React, { useState, useMemo } from 'react';
import { User, Student, AttendanceStatus, AttendanceRecords } from '../../types/index';
import { useAttendanceLogic } from '../../hooks/useAttendanceLogic';

// Components
import DatePicker from '../../components/DatePicker';
import GroupFilter from '../../components/GroupFilter';
import TeacherFilter from '../../components/TeacherFilter';
import DepartmentFilter from '../../components/DepartmentFilter';
import ScheduleSelector from '../../components/ScheduleSelector';
import SearchInput from '../../components/SearchInput';
import StudentRow from '../../components/StudentRow';
import AttendanceSummary from '../../components/AttendanceSummary';
import SortableHeader from '../../components/SortableHeader';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import UserNav from '../../components/UserNav';
import ThemeToggle from '../../components/ThemeToggle';
import AbsenceDetailModal from '../../components/AbsenceDetailModal';
import ReportModal from '../../components/ReportModal';
import ImportModal from '../../components/ImportModal';
import Notification from '../../components/Notification';
import BottomNavBar from '../../components/BottomNavBar';
import MarkAllControl from '../../components/MarkAllControl';
import AddStudentModal from '../../components/AddStudentModal';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import { Button } from '../../components/ui/button';
import { IconCirclePlus, IconRefresh, IconArrowRight, IconBook } from '@tabler/icons-react';


interface AttendancePageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    onToggleTheme: () => void;
    onNavigateToUserManagement: () => void;
    onNavigateToProfile: () => void;
    onNavigateToRequests: () => void;
    initialScheduleId?: number | null;
    initialDate?: Date | null;
    fromUnmarkedClasses?: boolean; // Flag to show back button
}

const AttendancePage: React.FC<AttendancePageProps> = ({ user, onLogout, theme, onToggleTheme, onNavigateToUserManagement, onNavigateToProfile, onNavigateToRequests, initialScheduleId, initialDate, fromUnmarkedClasses }) => {
    // UI State (Modals)
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
    const [markAllConfirmation, setMarkAllConfirmation] = useState<{ isOpen: boolean, status: AttendanceStatus | null }>({ isOpen: false, status: null });

    // Use Custom Hook
    const {
        selectedDate, setSelectedDate,
        selectedDepartment, setSelectedDepartment,
        selectedTeacher, setSelectedTeacher,
        selectedScheduleId, setSelectedScheduleId,
        searchTerm, setSearchTerm,
        sortConfig, handleSort,
        currentPage, setCurrentPage,
        students,
        allAttendance,
        allSchedules,
        currentStatuses,
        paginatedStudents,
        sortedStudents,
        selectedSchedule,
        summary,
        uniqueDepartments,
        uniqueTeachers,
        departmentCounts,
        teacherCounts,
        groupCounts,
        schedulesForDate,
        totalPages,
        ITEMS_PER_PAGE,
        loading, setLoading,
        isLoadingStudents,
        syncStatus,
        error,
        isLongLoading,
        sheetProgress,
        handleStatusChange,
        confirmMarkAll,
        handleImport,
        handleStudentAdded,
        retryFetch,
        notification
    } = useAttendanceLogic(user, initialScheduleId, initialDate);

    const isTeacher = user.role === 'Преподаватель';
    const canManageStudents = user.role === 'Администратор' || user.role === 'Модератор';

    // Derived state for legacy ReportModal (can be refactored later)
    const legacyAttendanceRecords = useMemo(() => {
        const records: AttendanceRecords = {};
        allAttendance.forEach(a => {
            if (!records[a.date]) records[a.date] = {};
            records[a.date][a.student_id] = a.status;
        });
        return records;
    }, [allAttendance]);

    const initiateMarkAll = (status: AttendanceStatus.Present | AttendanceStatus.Absent) => {
        setMarkAllConfirmation({ isOpen: true, status });
    };

    const executeMarkAll = () => {
        if (markAllConfirmation.status) {
            confirmMarkAll(markAllConfirmation.status);
        }
        setMarkAllConfirmation({ isOpen: false, status: null });
    };

    const onImportSuccess = () => {
        setImportModalOpen(false);
        handleImport();
    };

    const onAddStudentSuccess = () => {
        setAddStudentModalOpen(false);
        handleStudentAdded();
    };

    const renderTableSkeleton = () => {
        return (
            <div className="flex-1 overflow-hidden p-0">
                <table className="w-full text-sm">
                    <colgroup>
                        <col className="w-auto" />
                        <col className="hidden md:table-column w-[200px]" />
                        <col className="w-[140px] sm:w-[170px]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 border-b">
                        <tr>
                            <th className="h-12 px-2 sm:px-3 md:px-4 text-left align-middle"><Skeleton className="h-4 w-24" /></th>
                            <th className="h-12 px-2 sm:px-3 md:px-4 text-left align-middle hidden md:table-cell"><Skeleton className="h-4 w-16" /></th>
                            <th className="h-12 px-2 sm:px-3 md:px-4 text-right align-middle"><Skeleton className="h-4 w-20 ml-auto" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="px-2 sm:px-3 md:px-4 py-2 align-middle">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-32 sm:w-48" />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 py-2 align-middle hidden md:table-cell">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 py-2 align-middle">
                                    <div className="flex justify-end">
                                        <Skeleton className="h-9 w-24 sm:w-32 rounded-lg" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderContent = () => {
        // Show skeleton if loading students or initially loading sheet data
        if (loading) {
            // If it's a long load (stuck or syncing), show a nice Sync Card
            if (isLongLoading) {
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative bg-background p-4 rounded-full border shadow-sm">
                                <IconRefresh className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight mb-2">Обновление данных</h3>
                        <p className="text-muted-foreground text-center max-w-xs mb-8 text-sm leading-relaxed">
                            {syncStatus || sheetProgress || "Синхронизация расписания с сервером..."}
                            <br />
                            <span className="opacity-75">Если база данных "спит", это может занять 1-3 минуты. Пожалуйста, подождите.</span>
                        </p>

                        <Button
                            variant="outline"
                            onClick={() => setLoading(false)}
                            className="group"
                        >
                            <span>Продолжить с текущими данными</span>
                            <IconArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div >
                );
            }
            // Otherwise, show nice skeletons for initial quick load
            return renderTableSkeleton();
        }

        if (error && !allSchedules.length) {
            return <div className="flex-1 flex items-center justify-center p-4"><ErrorMessage message={error} onRetry={retryFetch} /></div>;
        }

        if (!selectedScheduleId) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <p className="text-lg font-medium text-muted-foreground">Выберите занятие для отображения списка студентов.</p>
                </div>
            );
        }
        return (
            <>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <table className="w-full text-sm">
                        <colgroup>
                            <col className="w-auto" />
                            <col className="hidden md:table-column w-[200px]" />
                            <col className="w-[140px] sm:w-[170px]" />
                        </colgroup>
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 border-b">
                            <tr className="border-b">
                                <th className="h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium">
                                    <SortableHeader title="Студент" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                                </th>
                                <th className="h-12 px-2 sm:px-3 md:px-4 text-center align-middle font-medium hidden md:table-cell">
                                    <SortableHeader title="Группа" sortKey="group" sortConfig={sortConfig} onSort={handleSort} />
                                </th>
                                <th className="h-12 px-2 sm:px-3 md:px-4 text-right align-middle font-medium text-muted-foreground">
                                    <div className="flex justify-end items-center">
                                        <MarkAllControl onMarkAll={initiateMarkAll} disabled={!selectedScheduleId} />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedStudents.length > 0 ? (
                                paginatedStudents.map(student => (
                                    <StudentRow
                                        key={student.id} student={student}
                                        status={currentStatuses.get(student.id) || AttendanceStatus.Unmarked}
                                        onStatusChange={handleStatusChange} onViewProfile={setViewingStudent}
                                        disabled={!selectedScheduleId} userRole={user.role}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                        В этой группе нет студентов. Вы можете добавить их или импортировать список.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={sortedStudents.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-muted flex flex-col">

            <main className="flex-1 flex flex-col container mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                        <div className="lg:col-span-1">
                            <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
                        </div>
                        <div className="lg:col-span-1">
                            <DepartmentFilter departments={uniqueDepartments} selectedDepartment={selectedDepartment} onDepartmentChange={setSelectedDepartment} departmentCounts={departmentCounts} disabled={isTeacher} />
                        </div>
                        <div className="lg:col-span-1">
                            <TeacherFilter teachers={uniqueTeachers} selectedTeacher={selectedTeacher} onTeacherChange={setSelectedTeacher} teacherCounts={teacherCounts} disabled={isTeacher} />
                        </div>
                        <div className="lg:col-span-2">
                            <ScheduleSelector schedules={schedulesForDate} selectedScheduleId={selectedScheduleId} onScheduleSelect={setSelectedScheduleId} studentCounts={groupCounts} />
                        </div>
                        <div className="lg:col-span-2 flex items-center gap-2">
                            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Поиск по имени..." />
                            {canManageStudents && (
                                <Button onClick={() => setAddStudentModalOpen(true)} className="shrink-0 gap-2" aria-label="Добавить студента">
                                    <IconCirclePlus className="w-4 h-4" />
                                    <span className="hidden xl:inline">Добавить</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border bg-card">
                        {loading ? (
                            <div className="flex flex-wrap justify-between items-center gap-4 animate-pulse">
                                <div className="flex gap-4">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                                <div className="hidden md:flex gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        ) : (
                            <AttendanceSummary
                                summary={summary}
                                groupName={selectedSchedule?.group}
                                groupStudentCount={students.length > 0 ? students.length : undefined}
                                subject={selectedSchedule?.subject}
                                loadType={selectedSchedule?.loadType}
                                classroom={selectedSchedule?.classroom}
                                time={selectedSchedule?.time}
                                date={selectedDate}
                            />
                        )}
                    </div>
                </div>

                <div className="flex flex-col flex-1 mt-4 rounded-lg border bg-card overflow-hidden">
                    {renderContent()}
                </div>
            </main>

            <BottomNavBar onOpenReport={() => setReportModalOpen(true)} onOpenImport={() => setImportModalOpen(true)} userRole={user.role} />

            {
                viewingStudent && (
                    <AbsenceDetailModal
                        user={user}
                        student={viewingStudent}
                        startDate={(() => {
                            const now = new Date();
                            const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                            return `${year}-09-01`;
                        })()}
                        endDate={(() => {
                            const now = new Date();
                            const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
                            return `${year}-06-30`;
                        })()}
                        onClose={() => setViewingStudent(null)}
                        onDataRefresh={retryFetch}
                    />
                )
            }
            {
                isReportModalOpen && (
                    <ReportModal
                        isOpen={isReportModalOpen}
                        onClose={() => setReportModalOpen(false)}
                        students={students}
                        attendanceRecords={legacyAttendanceRecords}
                    />
                )
            }
            {
                isImportModalOpen && canManageStudents && (
                    <ImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => setImportModalOpen(false)}
                        onImport={onImportSuccess}
                    />
                )
            }
            {
                canManageStudents && (
                    <AddStudentModal
                        isOpen={isAddStudentModalOpen}
                        onClose={() => setAddStudentModalOpen(false)}
                        onSuccess={onAddStudentSuccess}
                    />
                )
            }
            {
                markAllConfirmation.isOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="bg-background rounded-lg border shadow-lg p-6 max-w-sm w-full mx-4">
                            <h3 className="text-lg font-semibold">Подтвердите действие</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Вы собираетесь отметить всех студентов как <strong>"{markAllConfirmation.status === AttendanceStatus.Present ? 'присутствующие' : 'отсутствующие'}"</strong>.
                                Это действие перезапишет существующие отметки для текущего занятия.
                            </p>
                            <div className="mt-6 flex justify-end gap-4">
                                <Button
                                    onClick={() => setMarkAllConfirmation({ isOpen: false, status: null })}
                                    variant="secondary"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={executeMarkAll}
                                >
                                    Подтвердить
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            <Notification message={notification?.message || null} type={notification?.type} />
        </div >
    );
};

export default AttendancePage;
