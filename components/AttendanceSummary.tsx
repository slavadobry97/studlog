
import React from 'react';
import { AttendanceStatus } from '../types/index';

interface AttendanceSummaryProps {
  summary: {
    [AttendanceStatus.Present]: number;
    [AttendanceStatus.Absent]: number;
    [AttendanceStatus.ExcusedAbsent]: number;
  };
  groupName?: string;
  groupStudentCount?: number | null;
  subject?: string;
  loadType?: string;
  classroom?: string;
  time?: string;
  date?: Date;
}

interface SummaryItemProps {
  label: string;
  count: number;
  colorClass: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, count, colorClass }) => (
  <div className="flex items-center space-x-2">
    <span className={`h-2 w-2 rounded-full ${colorClass}`}></span>
    <span className="text-sm font-medium text-muted-foreground">{label}: <span className="text-foreground font-semibold">{count}</span></span>
  </div>
);

const DetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value || value.trim() === '') return null;
  return (
    <div className="py-1 px-2 md:px-4">
      <span className="text-sm text-muted-foreground">{label}: </span>
      {/* Use break-words to handle long text like discipline names without breaking the layout */}
      <span className="text-sm font-medium text-foreground wrap-break-word">{value}</span>
    </div>
  );
};

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ summary, groupName, groupStudentCount, subject, loadType, classroom, time, date }) => {
  const hasDetails = groupName || subject || loadType || classroom || time || date;

  const groupDisplayValue = (groupName && groupStudentCount != null)
    ? `${groupName} (${groupStudentCount})`
    : groupName;

  const formatDate = (date?: Date) => {
    if (!date) return undefined;
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Attendance Counts */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SummaryItem label="Присутствовал" count={summary[AttendanceStatus.Present]} colorClass="bg-green-500" />
        <SummaryItem label="Отсутствовал (неув.)" count={summary[AttendanceStatus.Absent]} colorClass="bg-red-500" />
        <SummaryItem label="Отсутствовал (уваж.)" count={summary[AttendanceStatus.ExcusedAbsent]} colorClass="bg-blue-500" />
      </div>

      {/* Schedule Details, only shown when a specific schedule is selected */}
      {hasDetails && (
        <div className="flex flex-col gap-1">
          {/* First row: Date, Group and Subject */}
          <div className="flex flex-wrap justify-start items-center md:divide-x md:divide-border -mx-2 md:-mx-4">
            {date && <DetailItem label="Дата" value={formatDate(date)} />}
            <DetailItem label="Группа" value={groupDisplayValue} />
            <DetailItem label="Дисциплина" value={subject} />
          </div>
          {/* Second row: Load Type, Classroom, and Time */}
          <div className="flex flex-wrap justify-start items-center md:divide-x md:divide-border -mx-2 md:-mx-4">
            <DetailItem label="Вид нагрузки" value={loadType} />
            <DetailItem label="Аудитория" value={classroom} />
            <DetailItem label="Время" value={time} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummary;
