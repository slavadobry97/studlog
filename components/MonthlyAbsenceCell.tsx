import React, { useState } from 'react';

interface AbsenceDetail {
    date: string;
    type: 'absent' | 'excused';
    subject?: string;
    reason?: string;
}

interface MonthlyAbsenceCellProps {
    count: number;
    absences: AbsenceDetail[];
    monthName: string;
}

const MonthlyAbsenceCell: React.FC<MonthlyAbsenceCellProps> = ({ count, absences, monthName }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (count === 0) {
        return <td className="p-2 text-center text-muted-foreground hidden lg:table-cell">—</td>;
    }

    // Color coding based on count
    const getColorClass = (count: number) => {
        if (count >= 6) return 'text-red-600 dark:text-red-500 font-semibold';
        if (count >= 3) return 'text-yellow-600 dark:text-yellow-500';
        return 'text-foreground';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    };

    return (
        <td
            className="p-2 text-center relative hidden lg:table-cell cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className={getColorClass(count)}>{count}</span>


            {showTooltip && absences.length > 0 && (
                <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg border border-gray-700">
                    {/* Tooltip arrow */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
                        <div className="border-8 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
                    </div>
                    <div className="font-semibold mb-2 pb-2 border-b border-gray-700">
                        {monthName} ({count} {count === 1 ? 'пропуск' : count < 5 ? 'пропуска' : 'пропусков'})
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {absences.map((absence, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <span className="text-gray-400 shrink-0">{formatDate(absence.date)}</span>
                                <div className="flex-1">
                                    {absence.subject && (
                                        <div className="font-medium">{absence.subject}</div>
                                    )}
                                    <div className={absence.type === 'absent' ? 'text-red-400' : 'text-green-400'}>
                                        {absence.type === 'absent' ? 'Неуваж.' : 'Уваж.'}
                                        {absence.reason && ` - ${absence.reason}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </td>
    );
};

export default MonthlyAbsenceCell;
