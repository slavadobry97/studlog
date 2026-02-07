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

interface MonthOption {
    key: string;
    label: string;
    fullName: string;
}

interface MonthFilterProps {
    months: MonthOption[];
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    disabled?: boolean;
}

const MonthFilter: React.FC<MonthFilterProps> = ({
    months,
    selectedMonth,
    onMonthChange,
    disabled = false
}) => {
    const [open, setOpen] = useState(false);

    const getSelectedLabel = () => {
        if (selectedMonth === 'all') return 'Весь период';
        const month = months.find(m => m.key === selectedMonth);
        return month?.fullName || selectedMonth;
    };

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
                    <span className="truncate">{getSelectedLabel()}</span>
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Поиск месяца..." />
                    <CommandList>
                        <CommandEmpty>Месяц не найден.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="all"
                                onSelect={() => {
                                    onMonthChange('all');
                                    setOpen(false);
                                }}
                            >
                                <IconCheck
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedMonth === 'all' ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                Весь период
                            </CommandItem>
                            {months.map((month) => (
                                <CommandItem
                                    key={month.key}
                                    value={month.fullName}
                                    onSelect={() => {
                                        onMonthChange(month.key);
                                        setOpen(false);
                                    }}
                                >
                                    <IconCheck
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedMonth === month.key ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {month.fullName}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default MonthFilter;
