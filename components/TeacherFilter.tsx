import React, { useState } from 'react';
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

interface TeacherFilterProps {
  teachers: string[];
  selectedTeacher: string;
  onTeacherChange: (teacher: string) => void;
  disabled?: boolean;
  teacherCounts?: Record<string, number>;
}

const TeacherFilter: React.FC<TeacherFilterProps> = ({
  teachers,
  selectedTeacher,
  onTeacherChange,
  disabled = false,
  teacherCounts
}) => {
  const [open, setOpen] = useState(false);

  const getLabel = (teacher: string) => {
    return teacher === 'all' ? 'Все преподаватели' : teacher;
  };

  const getCount = (teacher: string) => {
    return teacherCounts?.[teacher];
  };

  const selectedCount = getCount(selectedTeacher);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-10 font-normal shadow-none"
        >
          <span className="truncate">{getLabel(selectedTeacher)}</span>
          <div className="flex items-center gap-2 shrink-0">
            {selectedCount !== undefined && (
              <span className="text-muted-foreground font-mono text-xs">
                {selectedCount}
              </span>
            )}
            <IconSelector className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск преподавателя..." />
          <CommandList>
            <CommandEmpty>Преподаватель не найден.</CommandEmpty>
            <CommandGroup>
              {teachers.map((teacher) => {
                const count = getCount(teacher);
                return (
                  <CommandItem
                    key={teacher}
                    value={teacher}
                    onSelect={() => {
                      onTeacherChange(teacher);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <IconCheck
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedTeacher === teacher ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{getLabel(teacher)}</span>
                    </div>
                    {count !== undefined && (
                      <span className="ml-2 text-muted-foreground font-mono text-xs shrink-0">
                        {count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TeacherFilter;