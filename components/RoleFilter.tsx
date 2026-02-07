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

interface RoleFilterProps {
    roles: string[];
    selectedRole: string;
    onRoleChange: (role: string) => void;
    disabled?: boolean;
}

const RoleFilter: React.FC<RoleFilterProps> = ({
    roles,
    selectedRole,
    onRoleChange,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);

    const getLabel = (role: string) => {
        return role === 'all' ? 'Все роли' : role;
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
                    <span className="truncate">{getLabel(selectedRole)}</span>
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Поиск роли..." />
                    <CommandList>
                        <CommandEmpty>Роль не найдена.</CommandEmpty>
                        <CommandGroup>
                            {roles.map((role) => (
                                <CommandItem
                                    key={role}
                                    value={role}
                                    onSelect={() => {
                                        onRoleChange(role);
                                        setOpen(false);
                                    }}
                                >
                                    <IconCheck
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedRole === role ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{getLabel(role)}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default RoleFilter;
