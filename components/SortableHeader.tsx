import React from 'react';
import { IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { Button } from './ui/button';

type SortKey = 'name' | 'group';

interface SortableHeaderProps {
    title: string;
    sortKey: SortKey;
    sortConfig: { key: SortKey | null; order: 'asc' | 'desc' };
    onSort: (key: SortKey) => void;
    className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ title, sortKey, sortConfig, onSort, className }) => {
    const isSorting = sortConfig.key === sortKey;

    const getAriaLabel = () => {
        const base = `Сортировать по полю "${title}"`;
        if (!isSorting) {
            return `${base}. Нажмите для сортировки по возрастанию.`;
        }
        if (sortConfig.order === 'asc') {
            return `${base}. Отсортировано по возрастанию. Нажмите для сортировки по убыванию.`;
        }
        return `${base}. Отсортировано по убыванию. Нажмите для сортировки по возрастанию.`;
    };

    const renderIcon = () => {
        if (!isSorting) {
            return <IconArrowsSort className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
        }
        if (sortConfig.order === 'asc') {
            return <IconSortAscending className="h-4 w-4 shrink-0" />;
        }
        return <IconSortDescending className="h-4 w-4 shrink-0" />;
    };

    return (
        <Button
            variant="ghost"
            onClick={() => onSort(sortKey)}
            className={`h-8 w-full justify-center gap-1.5 px-2 font-medium hover:text-foreground ${className}`}
            aria-label={getAriaLabel()}
        >
            <span>{title}</span>
            {renderIcon()}
        </Button>
    );
};

export default SortableHeader;