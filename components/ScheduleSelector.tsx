import React, { useState, useMemo } from 'react';
import { IconCheck, IconSelector } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScheduleInfo } from '../types/index';

interface ScheduleSelectorProps {
  schedules: ScheduleInfo[];
  selectedScheduleId: number | null;
  onScheduleSelect: (id: number | null) => void;
  studentCounts?: Record<string, number>;
}

const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  schedules,
  selectedScheduleId,
  onScheduleSelect,
  studentCounts
}) => {
  const [open, setOpen] = useState(false);

  // Helper function to parse time and get start time in minutes for sorting
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2})\.(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours * 60 + minutes;
    }
    return 0;
  };

  // Sort schedules by time
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  }, [schedules]);

  const getSelectedLabel = () => {
    if (selectedScheduleId === null) {
      return "Все занятия";
    }
    const selected = schedules.find(s => s.id === selectedScheduleId);
    return selected ? `${selected.time} - ${selected.subject} ` : "Выберите занятие...";
  };

  const getScheduleDisplayText = (schedule: ScheduleInfo) => {
    const count = studentCounts?.[schedule.group];
    const countStr = count !== undefined ? ` (${count})` : '';
    return `${schedule.time} - ${schedule.subject} - ${schedule.group}${countStr} - ${schedule.teacher} `;
  };

  const getScheduleSearchValue = (schedule: ScheduleInfo) => {
    // Value used for search filtering
    return `${schedule.subject} ${schedule.group} ${schedule.time} ${schedule.teacher} ${schedule.classroom || ''} `.toLowerCase();
  };

  if (schedules.length === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-between h-10 font-normal shadow-none opacity-50"
      >
        <span>Нет занятий на выбранную дату</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal shadow-none"
        >
          <span className="truncate">{getSelectedLabel()}</span>
          <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск занятия..." />
          <CommandList>
            <CommandEmpty>Занятие не найдено.</CommandEmpty>
            <CommandGroup>
              {/* "Все занятия" option */}
              <CommandItem
                value="all-classes"
                onSelect={() => {
                  onScheduleSelect(null);
                  setOpen(false);
                }}
              >
                <IconCheck
                  className={cn(
                    "h-4 w-4",
                    selectedScheduleId === null ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="font-medium">Все занятия</span>
                </div>
              </CommandItem>

              {/* Individual schedules */}
              {sortedSchedules.map((schedule) => (
                <CommandItem
                  key={schedule.id}
                  value={getScheduleSearchValue(schedule)}
                  onSelect={() => {
                    onScheduleSelect(schedule.id);
                    setOpen(false);
                  }}
                >
                  <IconCheck
                    className={cn(
                      "h-4 w-4",
                      selectedScheduleId === schedule.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground truncate text-sm">
                        {schedule.subject}
                      </span>
                      <span className="shrink-0 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded whitespace-nowrap">
                        {schedule.time}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground truncate gap-1.5">
                      <span className="font-medium text-foreground/80">
                        {schedule.group}
                        {studentCounts?.[schedule.group] !== undefined && (
                          <span className="opacity-70"> ({studentCounts[schedule.group]})</span>
                        )}
                      </span>
                      <span className="opacity-50">|</span>
                      <span className="truncate">{schedule.teacher}</span>
                      {schedule.classroom && (
                        <>
                          <span className="opacity-50">|</span>
                          <span className="truncate">{schedule.classroom}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ScheduleSelector;
