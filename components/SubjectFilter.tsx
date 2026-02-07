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

interface SubjectFilterProps {
    subjects: string[];
    selectedSubject: string;
    onSubjectChange: (subject: string) => void;
    disabled?: boolean;
}

const SubjectFilter: React.FC<SubjectFilterProps> = ({
    subjects,
    selectedSubject,
    onSubjectChange,
    disabled = false
}) => {
    const [open, setOpen] = useState(false);

    const getLabel = (subject: string) => {
        return subject === 'all' ? 'Выберите дисциплину' : subject;
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
                    <span className="truncate">{getLabel(selectedSubject)}</span>
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Поиск дисциплины..." />
                    <CommandList>
                        <CommandEmpty>Дисциплина не найдена.</CommandEmpty>
                        <CommandGroup>
                            {subjects.map((subject) => (
                                <CommandItem
                                    key={subject}
                                    value={subject}
                                    onSelect={() => {
                                        onSubjectChange(subject);
                                        setOpen(false);
                                    }}
                                >
                                    <IconCheck
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedSubject === subject ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {getLabel(subject)}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default SubjectFilter;
