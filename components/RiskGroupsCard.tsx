
import React from 'react';
import Avatar from './Avatar';
import { Student } from '../types/index';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';

interface RiskStudent {
    student: Student;
    absenceRate: number;
    totalAbsences: number;
    totalClasses: number;
}

interface RiskGroupsCardProps {
    critical: RiskStudent[];
    high: RiskStudent[];
    normal: RiskStudent[];
    onStudentClick?: (student: Student) => void;
}

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <path d="M12 9v4"></path>
        <path d="M12 17h.01"></path>
    </svg>
);

const AlertCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
    </svg>
);

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <path d="m9 11 3 3L22 4"></path>
    </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"></path>
    </svg>
);

const RiskGroupsCard: React.FC<RiskGroupsCardProps> = ({ critical, high, normal, onStudentClick }) => {
    const totalStudents = critical.length + high.length + normal.length;

    return (
        <div className="space-y-4">
            <h3 className="text-base font-semibold">Группы риска</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Critical Risk */}
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{critical.length}</p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80">Критический уровень</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">&gt;40% пропусков</p>
                </div>

                {/* High Risk */}
                <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                            <AlertCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{high.length}</p>
                            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">Требует внимания</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">20-40% пропусков</p>
                </div>

                {/* Normal */}
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{normal.length}</p>
                            <p className="text-xs text-green-600/80 dark:text-green-400/80">В норме</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">&lt;20% пропусков</p>
                </div>
            </div>

            {/* Critical Students List */}
            {critical.length > 0 && (
                <Collapsible>
                    <div className="border bg-card overflow-hidden mt-4">
                        <CollapsibleTrigger className="w-full px-6 py-4 border-b bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <AlertTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                Критический уровень ({critical.length})
                            </h4>
                            <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="divide-y max-h-64 overflow-y-auto">
                                {critical.slice(0, 10).map((item) => (
                                    <Button
                                        key={item.student.id}
                                        variant="ghost"
                                        onClick={() => onStudentClick?.(item.student)}
                                        className="w-full p-3 h-auto hover:bg-muted/50 flex items-center justify-between text-left transition-colors cursor-pointer rounded-none font-normal"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar name={item.student.name} avatarUrl={item.student.avatarUrl} className="w-8 h-8" textClassName="text-xs" />
                                            <div>
                                                <p className="font-medium text-sm">{item.student.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.student.group}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-red-600 dark:text-red-400">{item.absenceRate.toFixed(1)}%</p>
                                            <p className="text-xs text-muted-foreground">{item.totalAbsences}/{item.totalClasses}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            )}

            {/* High Risk Students List */}
            {high.length > 0 && (
                <Collapsible>
                    <div className="border bg-card overflow-hidden mt-4">
                        <CollapsibleTrigger className="w-full px-6 py-4 border-b bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <AlertCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                Требует внимания ({high.length})
                            </h4>
                            <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="divide-y max-h-64 overflow-y-auto">
                                {high.slice(0, 10).map((item) => (
                                    <Button
                                        key={item.student.id}
                                        variant="ghost"
                                        onClick={() => onStudentClick?.(item.student)}
                                        className="w-full p-3 h-auto hover:bg-muted/50 flex items-center justify-between text-left transition-colors cursor-pointer rounded-none font-normal"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar name={item.student.name} avatarUrl={item.student.avatarUrl} className="w-8 h-8" textClassName="text-xs" />
                                            <div>
                                                <p className="font-medium text-sm">{item.student.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.student.group}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{item.absenceRate.toFixed(1)}%</p>
                                            <p className="text-xs text-muted-foreground">{item.totalAbsences}/{item.totalClasses}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            )}
        </div>
    );
};

export default RiskGroupsCard;
