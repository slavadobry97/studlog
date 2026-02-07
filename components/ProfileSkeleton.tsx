import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';

interface ProfileSkeletonProps {
    role?: 'Администратор' | 'Преподаватель' | 'Модератор';
}

const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ role = 'Администратор' }) => {
    const isPrivileged = role === 'Администратор' || role === 'Модератор';
    const isTeacher = role === 'Преподаватель';

    if (isTeacher) {
        return (
            <div className="space-y-6">
                {/* My Day Schedule */}
                <Card className="shadow-none">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <Skeleton className="h-7 w-32 mb-2" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-10 w-48" />
                        </div>
                    </div>
                    <div className="px-6 pb-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="shadow-none p-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-5 w-16" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                    <Skeleton className="h-9 w-32" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* Unmarked Classes */}
                <Card className="shadow-none">
                    <div className="border-b">
                        <Skeleton className="h-14 w-full" />
                    </div>
                </Card>

                {/* My Statistics */}
                <Card className="shadow-none">
                    <div className="border-b">
                        <Skeleton className="h-14 w-full" />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* General Summary - StatCards */}
            <Card className="shadow-none">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-32" />
                        {isPrivileged && <Skeleton className="h-4 w-40" />}
                    </div>
                    <div className={`grid grid-cols-2 ${isPrivileged ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
                        {Array.from({ length: isPrivileged ? 5 : 4 }).map((_, i) => (
                            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Reports Section */}
            {isPrivileged && (
                <Card className="shadow-none">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-6 w-56" />
                            <div className="flex gap-3">
                                <Skeleton className="h-10 w-48" />
                                <Skeleton className="h-10 w-48" />
                            </div>
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                            <div className="bg-muted/50 border-b p-4">
                                <div className="flex gap-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="border-b p-4 flex items-center gap-4">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Risk Groups */}
            <Card className="shadow-none">
                <div className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-lg border p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-8 w-12" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Accordion Items */}
                <div className="px-6 pb-6 space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="border rounded-md">
                            <Skeleton className="h-14 w-full rounded-md" />
                        </div>
                    ))}
                </div>
            </Card>

            {/* Subjects Table */}
            <Card className="shadow-none">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-10 w-64" />
                    </div>
                    <div className="rounded-lg border p-8 text-center">
                        <Skeleton className="h-5 w-64 mx-auto mb-2" />
                        <Skeleton className="h-4 w-96 mx-auto" />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ProfileSkeleton;
