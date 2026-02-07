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

interface GroupFilterProps {
  groups: string[];
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  disabled?: boolean;
  groupCounts?: Record<string, number>;
}

const GroupFilter: React.FC<GroupFilterProps> = ({
  groups,
  selectedGroup,
  onGroupChange,
  disabled = false,
  groupCounts
}) => {
  const [open, setOpen] = useState(false);

  const getLabel = (group: string) => {
    return group === 'all' ? 'Все группы' : group;
  };

  const getCount = (group: string) => {
    return groupCounts?.[group];
  };

  const selectedCount = getCount(selectedGroup);

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
          <span className="truncate">{getLabel(selectedGroup)}</span>
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
          <CommandInput placeholder="Поиск группы..." />
          <CommandList>
            <CommandEmpty>Группа не найдена.</CommandEmpty>
            <CommandGroup>
              {groups.map((group) => {
                const count = getCount(group);
                return (
                  <CommandItem
                    key={group}
                    value={group}
                    onSelect={() => {
                      onGroupChange(group);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <IconCheck
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedGroup === group ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{getLabel(group)}</span>
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

export default GroupFilter;
