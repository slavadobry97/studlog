import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Student, AttendanceRecords, AttendanceStatus } from '../types/index';
import Avatar from './Avatar';
import DatePicker from './DatePicker';
import GroupFilter from './GroupFilter';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';

const getISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (startDate: Date, endDate: Date): string[] => {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalEndDate) {
    dates.push(getISODateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  attendanceRecords: AttendanceRecords;
}

const StatCard: React.FC<{ label: string; value: string | number; subtext?: string; valueColor?: string; }> = ({ label, value, subtext, valueColor = 'text-foreground' }) => (
  <div className="p-4 bg-muted/50 rounded-lg text-center">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
  </div>
);


const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, students, attendanceRecords }) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedGroup, setSelectedGroup] = useState('all');

  const drawerRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);

  const uniqueGroups = useMemo(() => ['all', ...Array.from(new Set(students.map(s => s.group))).sort()], [students]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: students.length };
    students.forEach(student => {
      counts[student.group] = (counts[student.group] || 0) + 1;
    });
    return counts;
  }, [students]);

  const reportData = useMemo(() => {
    if (startDate > endDate) return [];

    const dateRange = getDateRange(startDate, endDate);

    const filteredStudents = selectedGroup === 'all'
      ? students
      : students.filter(s => s.group === selectedGroup);

    const studentStats = filteredStudents.map(student => {
      const stats = {
        [AttendanceStatus.Present]: 0,
        [AttendanceStatus.Absent]: 0,
        [AttendanceStatus.ExcusedAbsent]: 0,
      };

      dateRange.forEach(dateKey => {
        const dayRecord = attendanceRecords[dateKey];
        if (dayRecord && dayRecord[student.id]) {
          const status = dayRecord[student.id];
          if (stats[status as keyof typeof stats] !== undefined) {
            stats[status as keyof typeof stats]++;
          }
        }
      });

      const totalForRate = stats.Present + stats.Absent; // Excused absences don't count against the rate
      const attendanceRate = totalForRate > 0 ? (stats.Present / totalForRate) * 100 : 0;

      return {
        student,
        stats,
        attendanceRate,
      };
    });

    return studentStats;
  }, [startDate, endDate, selectedGroup, students, attendanceRecords]);

  const reportSummary = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return {
        totalStudents: 0,
        totalClasses: 0,
        totalAcademicHours: 0,
        averageAttendanceRate: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalExcusedAbsent: 0,
      };
    }

    const totalPresent = reportData.reduce((sum, item) => sum + item.stats.Present, 0);
    const totalAbsent = reportData.reduce((sum, item) => sum + item.stats.Absent, 0);
    const totalExcusedAbsent = reportData.reduce((sum, item) => sum + item.stats.ExcusedAbsent, 0);
    const totalClasses = totalPresent + totalAbsent + totalExcusedAbsent;
    const totalAcademicHours = totalClasses * 2;
    const totalForRate = totalPresent + totalAbsent;
    const averageAttendanceRate = totalForRate > 0 ? (totalPresent / totalForRate) * 100 : 0;

    return {
      totalStudents: reportData.length,
      totalClasses,
      totalAcademicHours,
      averageAttendanceRate,
      totalPresent,
      totalAbsent,
      totalExcusedAbsent,
    };
  }, [reportData]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const currentY = e.targetTouches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) { // Only allow dragging downwards
      setDragY(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragY !== null) {
      if (dragY > 100) { // Threshold to close
        onClose();
      }
    }
    setDragY(null);
    touchStartY.current = 0;
  }, [dragY, onClose]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setDragY(null), 300); // Allow animation to finish
    }
  }, [isOpen]);

  const handleExport = useCallback(() => {
    const formattedStartDate = startDate.toLocaleDateString('ru-RU');
    const formattedEndDate = endDate.toLocaleDateString('ru-RU');

    const summaryRows = [
      `Период отчета: с ${formattedStartDate} по ${formattedEndDate}`,
      `Группа: ${selectedGroup === 'all' ? 'Все группы' : selectedGroup}`,
      `Всего студентов: ${reportSummary.totalStudents}`,
      `Всего занятий отмечено: ${reportSummary.totalClasses} (${reportSummary.totalAcademicHours} ак. часов)`,
      `Средняя посещаемость (без учета ув. пропусков): ${reportSummary.averageAttendanceRate.toFixed(1)}%`
    ];

    const headers = ['ID', 'Имя', 'Группа', 'Присутствовал', 'Отсутствовал (неув.)', 'Отсутствовал (уваж.)', '% Посещаемости'];
    const csvContent = [
      ...summaryRows,
      '', // Blank line for separation
      headers.join(';'),
      ...reportData.map(data => [
        data.student.id,
        `"${data.student.name}"`,
        data.student.group,
        data.stats.Present,
        data.stats.Absent,
        data.stats.ExcusedAbsent,
        `${data.attendanceRate.toFixed(1)}%`.replace('.', ',')
      ].join(';'))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const safeGroupName = selectedGroup === 'all' ? 'all_groups' : selectedGroup.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
    const filename = `report_${safeGroupName}_${getISODateString(startDate)}_to_${getISODateString(endDate)}.csv`;
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, reportSummary, startDate, endDate, selectedGroup]);

  if (!isOpen && dragY === null) return null;

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-500';
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-red-600 dark:text-red-500';
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} flex items-end sm:items-center sm:justify-center`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        ref={drawerRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: dragY !== null ? `translateY(${dragY}px)` : undefined,
          transition: dragY !== null ? 'none' : undefined,
        }}
        className={`
          bg-background w-full flex flex-col transition-transform duration-300 ease-out
          h-[90dvh] rounded-t-lg border-t
          sm:relative sm:h-auto sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-lg sm:border sm:shadow-lg
          ${isOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-0'}
        `}
      >
        <div className="sm:hidden absolute top-0 left-0 right-0 h-6 flex justify-center items-center cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30"></div>
        </div>

        <div className="flex items-center justify-between p-6 pt-8 sm:pt-6 border-b">
          <div>
            <h2 id="report-modal-title" className="text-lg font-semibold tracking-tight">Отчет по посещаемости</h2>
            <p className="text-sm text-muted-foreground">Анализ посещаемости студентов за выбранный период.</p>
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

        <div className="p-6 border-b grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Начало периода</span>
            <DatePicker selectedDate={startDate} onDateChange={setStartDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Конец периода</span>
            <DatePicker selectedDate={endDate} onDateChange={setEndDate} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-medium">Группа</span>
            <GroupFilter groups={uniqueGroups} selectedGroup={selectedGroup} onGroupChange={setSelectedGroup} groupCounts={groupCounts} />
          </div>
        </div>

        {reportData.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-base font-semibold mb-3">Сводка по группе: <span className="font-normal">{selectedGroup === 'all' ? 'Все группы' : selectedGroup}</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Студентов" value={reportSummary.totalStudents} />
              <StatCard label="Занятий" value={reportSummary.totalClasses} subtext={`${reportSummary.totalAcademicHours} ак. ч.`} />
              <StatCard label="Присутствий" value={reportSummary.totalPresent} valueColor="text-green-600 dark:text-green-500" />
              <StatCard label="Пропусков (неув.)" value={reportSummary.totalAbsent} valueColor="text-red-600 dark:text-red-500" />
              <StatCard label="Пропусков (уваж.)" value={reportSummary.totalExcusedAbsent} valueColor="text-blue-600 dark:text-blue-500" />
              <StatCard
                label="Посещаемость"
                value={`${reportSummary.averageAttendanceRate.toFixed(1)}%`}
                valueColor={getRateColor(reportSummary.averageAttendanceRate)}
                subtext="без ув. пропусков"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="sticky top-0 bg-muted/50 z-10">
              <tr className="border-b">
                <th className="h-12 px-2 sm:px-4 md:px-6 text-left align-middle font-medium text-muted-foreground">Студент</th>
                <th className="h-12 px-2 sm:px-4 md:px-6 text-center align-middle font-medium text-muted-foreground">Присутствовал</th>
                <th className="h-12 px-2 sm:px-4 md:px-6 text-center align-middle font-medium text-muted-foreground">Отсутствовал (неув.)</th>
                <th className="h-12 px-2 sm:px-4 md:px-6 text-center align-middle font-medium text-muted-foreground">Отсутствовал (уваж.)</th>
                <th className="h-12 px-2 sm:px-4 md:px-6 text-right align-middle font-medium text-muted-foreground">% Посещаемости</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? reportData.map(({ student, stats, attendanceRate }) => (
                <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-2 py-4 sm:p-4 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} avatarUrl={student.avatarUrl} className="w-8 h-8" textClassName="text-xs" />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.group}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4 sm:p-4 align-middle text-center font-medium">{stats.Present}</td>
                  <td className="px-2 py-4 sm:p-4 align-middle text-center font-medium">{stats.Absent}</td>
                  <td className="px-2 py-4 sm:p-4 align-middle text-center font-medium">{stats.ExcusedAbsent}</td>
                  <td className="px-2 py-4 sm:p-4 align-middle text-right">
                    <div className={`font-semibold ${getRateColor(attendanceRate)}`}>
                      {attendanceRate.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Нет данных для отображения. Выберите другой период или группу.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t gap-4">
          <Button onClick={handleExport} disabled={reportData.length === 0}>
            Экспорт в CSV
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;