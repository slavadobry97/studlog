import React from 'react';
import { Student, User, AttendanceStatus, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_CHARS } from '../types/index';
import { IconCheck, IconX, IconClipboardCheck } from '@tabler/icons-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';

interface StudentRowProps {
  student: Student;
  status: AttendanceStatus;
  onStatusChange: (studentId: number, status: AttendanceStatus) => void;
  onViewProfile: (student: Student) => void;
  disabled?: boolean;
  userRole: User['role'];
}

interface StatusSegmentProps {
  statusKey: AttendanceStatus;
  currentStatus: AttendanceStatus;
  onClick: () => void;
  disabled?: boolean;
}

const StatusSegment: React.FC<StatusSegmentProps> = ({ statusKey, currentStatus, onClick, disabled = false }) => {
  const isActive = statusKey === currentStatus;

  const getVariant = () => {
    if (!isActive) return 'outline';
    switch (statusKey) {
      case AttendanceStatus.Present: return 'default'; // We'll style it green in className
      case AttendanceStatus.Absent: return 'destructive';
      case AttendanceStatus.ExcusedAbsent: return 'secondary'; // We'll style it blue
    }
    return 'outline';
  };

  const getCustomStyles = () => {
    if (!isActive) return 'text-muted-foreground hover:bg-accent hover:text-accent-foreground border-input';
    switch (statusKey) {
      case AttendanceStatus.Present: return 'bg-green-600 hover:bg-green-700 text-white shadow-sm border-green-600';
      case AttendanceStatus.ExcusedAbsent: return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-blue-600';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (statusKey) {
      case AttendanceStatus.Present:
        return <IconCheck className="w-4 h-4" />;
      case AttendanceStatus.Absent:
        return <IconX className="w-4 h-4" />;
      case AttendanceStatus.ExcusedAbsent:
        return <IconClipboardCheck className="w-4 h-4" />;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          onClick={onClick}
          disabled={disabled}
          variant={getVariant()}
          aria-label={ATTENDANCE_STATUS_LABELS[statusKey]}
          aria-pressed={isActive}
          className={`w-9 h-9 p-0 ${getCustomStyles()}`}
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <p>{ATTENDANCE_STATUS_LABELS[statusKey]}</p>
      </TooltipContent>
    </Tooltip>
  );
};


const StudentRow: React.FC<StudentRowProps> = ({ student, status, onStatusChange, onViewProfile, disabled = false, userRole }) => {
  const isPrivilegedUser = userRole === 'Администратор' || userRole === 'Модератор';

  const statusButtons: { key: AttendanceStatus }[] = [
    { key: AttendanceStatus.Present },
    { key: AttendanceStatus.Absent },
  ];

  if (isPrivilegedUser) {
    statusButtons.push({ key: AttendanceStatus.ExcusedAbsent });
  }

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      <td className="px-2 sm:px-3 md:px-4 py-2 align-middle">
        <Button
          variant="ghost"
          onClick={() => onViewProfile(student)}
          className="flex items-center text-left w-full group rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-auto p-2 hover:bg-transparent px-0"
          aria-label={`Показать профиль студента ${student.name}`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{student.name}</div>
          </div>
        </Button>
      </td>
      <td className="px-2 sm:px-3 md:px-4 py-2 align-middle hidden md:table-cell text-center">
        <div className="inline-flex items-center justify-center text-xs font-medium bg-secondary/50 text-secondary-foreground px-2.5 py-1 rounded-md border border-secondary transition-colors hover:bg-secondary/70">{student.group}</div>
      </td>
      <td className="px-2 sm:px-3 md:px-4 py-2 align-middle">
        <div className="flex justify-end">
          <ButtonGroup className="rounded-lg divide-x divide-input">
            {statusButtons.map((btn) => (
              <StatusSegment
                key={btn.key}
                statusKey={btn.key}
                currentStatus={status}
                onClick={() => onStatusChange(student.id, btn.key)}
                disabled={disabled}
              />
            ))}
          </ButtonGroup>
        </div>
      </td>
    </tr>
  );
};

export default React.memo(StudentRow);