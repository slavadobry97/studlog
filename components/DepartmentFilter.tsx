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

interface DepartmentFilterProps {
  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  disabled?: boolean;
  departmentCounts?: Record<string, number>;
}

const DepartmentFilter: React.FC<DepartmentFilterProps> = ({
  departments,
  selectedDepartment,
  onDepartmentChange,
  disabled = false,
  departmentCounts
}) => {
  const [open, setOpen] = useState(false);

  const getLabel = (department: string) => {
    return department === 'all' ? 'Все кафедры' : department;
  };

  const getCount = (department: string) => {
    return departmentCounts?.[department];
  };

  const selectedCount = getCount(selectedDepartment);

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
          <span className="truncate">{getLabel(selectedDepartment)}</span>
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
          <CommandInput placeholder="Поиск кафедры..." />
          <CommandList>
            <CommandEmpty>Кафедра не найдена.</CommandEmpty>
            <CommandGroup>
              {departments.map((department) => {
                const count = getCount(department);
                return (
                  <CommandItem
                    key={department}
                    value={department}
                    onSelect={() => {
                      onDepartmentChange(department);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <IconCheck
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedDepartment === department ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{getLabel(department)}</span>
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

export default DepartmentFilter;
