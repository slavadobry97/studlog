import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, Student, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../types';
import Avatar from './Avatar';
import Loader from './Loader';
import { IconX, IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';

interface AbsenceDetail {
  id: number;
  date: string;
  status: AttendanceStatus;
  subject: string | null;
  time: string | null;
  schedule_id: number | null;
  absence_request_id: number | null;
}

interface AbsenceDetailModalProps {
  user: User;
  student: Student;
  startDate: string;
  endDate: string;
  onClose: () => void;
  onDataRefresh: () => void;
}

const getISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CalendarViewProps {
  absences: AbsenceDetail[];
  year: number;
  month: number;
}

const CalendarView: React.FC<CalendarViewProps> = ({ absences, year, month }) => {
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayISO = getISODateString(new Date());

  const dailyDetailsMap = useMemo(() => {
    const map = new Map<string, AbsenceDetail[]>();

    absences.forEach(absence => {
      const dateKey = absence.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(absence);
    });

    map.forEach(items => {
      items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    return map;
  }, [absences]);

  const getDayContent = (dateKey: string) => {
    const details = dailyDetailsMap.get(dateKey);
    if (!details || details.length === 0) return { style: {}, classes: 'bg-muted/30 text-muted-foreground border-transparent' };

    const counts = {
      [AttendanceStatus.Absent]: 0,
      [AttendanceStatus.ExcusedAbsent]: 0,
    };

    details.forEach(d => {
      if (d.status) counts[d.status]++;
    });

    const total = details.length;

    if (counts.Absent === total) return { style: {}, classes: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' };
    if (counts.ExcusedAbsent === total) return { style: {}, classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' };

    // Mixed absences
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

          // Smart tooltip positioning based on day of week
          const dayOfWeek = currentDate.getDay();
          const isFirstTwoDays = dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday
          const isLastTwoDays = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday

          const tooltipPositionClasses = isFirstTwoDays
            ? 'left-0' // Align to left edge
            : isLastTwoDays
              ? 'right-0' // Align to right edge
              : 'left-1/2 -translate-x-1/2'; // Center

          const arrowPositionClasses = isFirstTwoDays
            ? 'left-4' // Arrow near left
            : isLastTwoDays
              ? 'right-4' // Arrow near right
              : 'left-1/2 -translate-x-1/2'; // Arrow centered

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
                <div className={`absolute bottom-full mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none ${tooltipPositionClasses}`}>
                  <div className="font-semibold mb-2 border-b pb-1 text-center">{currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                  <div className="space-y-2">
                    {details.map((d, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-left">{d.subject || 'Занятие'}</span>
                          <span className="text-[10px] text-muted-foreground text-left">{d.time || 'Время не указано'}</span>
                        </div>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === AttendanceStatus.Absent ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          d.status === AttendanceStatus.ExcusedAbsent ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                          {d.status ? ATTENDANCE_STATUS_LABELS[d.status].split(' ')[0] : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-popover ${arrowPositionClasses}`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MonthlyAbsenceGroupProps {
  monthName: string;
  absences: AbsenceDetail[];
  absentCount: number;
  excusedCount: number;
  isPrivileged: boolean;
  onStatusToggle: (id: number, status: AttendanceStatus) => void;
  formatDate: (dateStr: string) => string;
}

const MonthlyAbsenceGroup: React.FC<MonthlyAbsenceGroupProps> = ({
  monthName,
  absences,
  absentCount,
  excusedCount,
  isPrivileged,
  onStatusToggle,
  formatDate
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalCount = absences.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center p-4 bg-muted/30 hover:bg-muted/50 transition-colors h-auto rounded-none justify-between text-left font-normal"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">{monthName}</h3>
          <div className="flex gap-2 text-xs">
            {absentCount > 0 && (
              <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                Неуваж.: {absentCount}
              </span>
            )}
            {excusedCount > 0 && (
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                Уваж.: {excusedCount}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-muted text-foreground">
              Всего: {totalCount}
            </span>
          </div>
        </div>
        <IconChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </Button>

      {isExpanded && (
        <ul className="divide-y divide-border">
          {absences.map(absence => {
            const isAbsent = absence.status === AttendanceStatus.Absent;
            return (
              <li key={absence.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="grow">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{formatDate(absence.date)}</p>
                      {absence.absence_request_id && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                          title="Пропуск по заявке студента"
                        >
                          <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          Заявка
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{absence.subject} ({absence.time})</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`text-sm font-medium px-3 py-1.5 rounded-lg flex flex-col items-center justify-center h-12 w-28 ${isAbsent ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                      <span>Отсутствовал</span>
                      <span className="text-xs font-normal">({isAbsent ? 'неув.' : 'уваж.'})</span>
                    </div>
                    {isPrivileged && (
                      <Button
                        onClick={() => onStatusToggle(absence.id, absence.status)}
                        variant={isAbsent ? "default" : "destructive"}
                        className="w-44 h-12"
                      >
                        {isAbsent ? 'Сделать уважительной' : 'Сделать неуважительной'}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const AbsenceDetailModal: React.FC<AbsenceDetailModalProps> = ({ user, student, startDate, endDate, onClose, onDataRefresh }) => {
  const [absences, setAbsences] = useState<AbsenceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const isPrivileged = user.role === 'Администратор' || user.role === 'Модератор';

  const fetchAbsenceDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          schedule_id,
          absence_request_id,
          schedule ( subject, time )
        `)
        .eq('student_id', student.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('status', [AttendanceStatus.Absent, AttendanceStatus.ExcusedAbsent])
        .not('schedule_id', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedData: AbsenceDetail[] = data.map((item: any) => ({
        id: item.id,
        date: item.date,
        status: item.status as AttendanceStatus,
        subject: item.schedule?.subject || 'Занятие не найдено',
        time: item.schedule?.time || 'Время не указано',
        schedule_id: item.schedule_id,
        absence_request_id: item.absence_request_id
      }));
      setAbsences(formattedData);

    } catch (err: any) {
      setError(`Не удалось загрузить детали пропусков: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [student.id, startDate, endDate]);

  useEffect(() => {
    fetchAbsenceDetails();
  }, [fetchAbsenceDetails]);

  const handleStatusToggle = async (absenceId: number, currentStatus: AttendanceStatus) => {
    const newStatus = currentStatus === AttendanceStatus.Absent ? AttendanceStatus.ExcusedAbsent : AttendanceStatus.Absent;

    const originalAbsences = [...absences];
    setAbsences(prev => prev.map(a => a.id === absenceId ? { ...a, status: newStatus } : a));

    const { error: updateError } = await supabase
      .from('attendance')
      .update({ status: newStatus })
      .eq('id', absenceId);

    if (updateError) {
      setAbsences(originalAbsences);
      setError(`Ошибка обновления: ${updateError.message}`);
    } else {
      onDataRefresh();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const filteredAbsences = useMemo(() => {
    return absences.filter(absence => {
      const date = new Date(absence.date);
      return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    });
  }, [absences, selectedYear, selectedMonth]);

  const groupedAbsences = useMemo(() => {
    const monthlyGroups = new Map<string, AbsenceDetail[]>();

    absences.forEach(absence => {
      const date = new Date(absence.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(absence);
    });

    return Array.from(monthlyGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [absences]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

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
      aria-labelledby="absence-detail-title"
    >
      <div
        className="relative bg-background w-full max-w-4xl m-4 rounded-lg border shadow-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 id="absence-detail-title" className="text-xl font-semibold tracking-tight">Детализация пропусков</h2>
          <div className="flex items-center gap-3 mt-2">
            <Avatar name={student.name} avatarUrl={student.avatarUrl} className="w-10 h-10" />
            <div>
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">Период: {formatDate(startDate)} - {formatDate(endDate)}</p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <ButtonGroup>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  onClick={() => setViewMode('calendar')}
                  size="sm"
                  className="rounded-r-none border-r-0 h-9"
                >
                  Календарь
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                  className="rounded-l-none h-9"
                >
                  Список
                </Button>
              </ButtonGroup>
            </div>

            {viewMode === 'calendar' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8"
                  aria-label="Предыдущий месяц"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[170px] text-center">
                  {monthNames[selectedMonth]} {selectedYear}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                  aria-label="Следующий месяц"
                >
                  <IconChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="p-8"><Loader text="Загрузка пропусков..." /></div>}
          {error && <div className="p-4 text-sm text-destructive">{error}</div>}
          {!loading && !error && (
            absences.length > 0 ? (
              viewMode === 'calendar' ? (
                <div className="space-y-4">
                  <CalendarView
                    absences={filteredAbsences}
                    year={selectedYear}
                    month={selectedMonth}
                  />
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t">
                    <LegendItem color="bg-red-500/20 text-red-600 border border-red-500/20" label="Отсутствовал (неув.)" />
                    <LegendItem color="bg-blue-500/20 text-blue-600 border border-blue-500/20" label="Отсутствовал (уваж.)" />
                    <LegendItem color="bg-gradient-to-br from-red-300 to-blue-300 border border-transparent" label="Смешанный статус" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedAbsences.map(([monthKey, monthAbsences]) => {
                    const [year, month] = monthKey.split('-');
                    const monthName = monthNames[parseInt(month) - 1];
                    const absentCount = monthAbsences.filter(a => a.status === AttendanceStatus.Absent).length;
                    const excusedCount = monthAbsences.filter(a => a.status === AttendanceStatus.ExcusedAbsent).length;

                    return (
                      <MonthlyAbsenceGroup
                        key={monthKey}
                        monthName={`${monthName} ${year}`}
                        absences={monthAbsences}
                        absentCount={absentCount}
                        excusedCount={excusedCount}
                        isPrivileged={isPrivileged}
                        onStatusToggle={handleStatusToggle}
                        formatDate={formatDate}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                У студента нет пропусков за выбранный период.
              </div>
            )
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

export default AbsenceDetailModal;