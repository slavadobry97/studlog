
import React from 'react';
import Skeleton from './Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Props {
    rows?: number;
    className?: string;
}

const TableSkeleton: React.FC<Props> = ({ rows = 5, className }) => {
    return (
        <div className={`overflow-hidden rounded-lg border ${className}`}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50%]">
                            <Skeleton className="h-4 w-28" />
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                            <Skeleton className="h-4 w-32" />
                        </TableHead>
                        <TableHead className="text-right w-[100px]">
                            <Skeleton className="h-4 w-20 ml-auto" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    {/* Avatar skeleton */}
                                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* Name skeleton */}
                                        <Skeleton className="h-4 w-40" />
                                        {/* Mobile role/department skeleton */}
                                        <div className="md:hidden">
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {/* Role skeleton */}
                                <Skeleton className="h-4 w-24 mb-1" />
                                {/* Department skeleton */}
                                <Skeleton className="h-3 w-36" />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                    {/* Action buttons skeleton */}
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default TableSkeleton;
