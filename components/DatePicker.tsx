import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  align?: 'left' | 'right';
}

const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
    <line x1="16" x2="16" y1="2" y2="6"></line>
    <line x1="8" x2="8" y1="2" y2="6"></line>
    <line x1="3" x2="21" y1="10" y2="10"></line>
  </svg>
);

const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"></path>
  </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"></path>
  </svg>
);

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateChange, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState(selectedDate);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  // Correctly calculate the first day of the month for a Monday-first week.
  // (0 for Monday, 6 for Sunday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };


  const handleDateSelect = (day: number) => {
    const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    onDateChange(new Date());
    setIsOpen(false);
  };

  const handlePrevMonth = () => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  const handleNextMonth = () => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    return (
      <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-2 z-30 w-80 rounded-lg border bg-background p-3 shadow-lg flex flex-col`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <div className="font-semibold text-foreground text-sm">{monthNames[month]} {year}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Improved header contrast for better readability */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-foreground/70">
          {daysOfWeek.map(day => <div key={day} className="h-9 w-9 flex items-center justify-center">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const currentDateObj = new Date(year, month, day);

            const isSelected = isSameDay(currentDateObj, selectedDate);
            const isToday = isSameDay(currentDateObj, today);
            const isFuture = currentDateObj > today;
            const dayOfWeek = currentDateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let buttonClass = "h-9 w-9 text-sm p-0 font-normal";
            if (isToday && !isSelected) {
              buttonClass += " border border-primary text-primary";
            } else if (isFuture || isWeekend) {
              buttonClass += " text-muted-foreground";
            }

            return (
              <Button
                key={day}
                variant={isSelected ? "default" : "ghost"}
                onClick={() => handleDateSelect(day)}
                className={buttonClass}
                disabled={isFuture}
              >
                {day}
              </Button>
            );
          })}
        </div>
        <div className="border-t border-border mt-2 pt-2">
          <Button
            onClick={handleTodayClick}
            variant="secondary"
            className="w-full h-8 text-xs font-medium"
          >
            Сегодня
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="outline"
        onClick={() => { setIsOpen(!isOpen); setDisplayDate(selectedDate); }}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="truncate text-left">{selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
      </Button>
      {isOpen && renderCalendar()}
    </div>
  );
};

export default DatePicker;