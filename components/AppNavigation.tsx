import React from 'react';
import {
    IconHome,
    IconClipboardList,
    IconUsers,
    IconFileText,
    IconActivity,
    IconChevronLeft,
    IconLogout,
    IconSun,
    IconMoon,
} from '@tabler/icons-react';
import { User } from '@/types/index';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AppNavigationProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    user?: User; // Опциональный для поддержки неаутентифицированных студентов
    onLogout?: () => void;
    theme?: string;
    onToggleTheme?: () => void;
    canGoBack?: boolean;
    onGoBack?: () => void;
    pendingRequestsCount?: number;
    showOnlyBack?: boolean; // Режим "только кнопка Назад" для студентов
}

interface NavButtonProps {
    icon: React.ElementType;
    label: string;
    page: string;
    active: boolean;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon: Icon, label, active, onClick }) => {
    return (
        <Button
            variant={active ? "default" : "ghost"}
            size="sm"
            onClick={onClick}
            className={cn(
                "gap-2",
                active && "bg-primary text-primary-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{label}</span>
        </Button>
    );
};

const AppNavigation: React.FC<AppNavigationProps> = ({
    currentPage,
    onNavigate,
    user,
    onLogout,
    theme,
    onToggleTheme,
    canGoBack = false,
    onGoBack,
    pendingRequestsCount,
    showOnlyBack = false,
}) => {
    const isAdmin = user?.role === 'Администратор';
    const isTeacher = user?.role === 'Преподаватель';
    const isModerator = user?.role === 'Модератор';

    return (
        <header className="border-b bg-background/60 backdrop-blur-md supports-backdrop-filter:bg-background/60 sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Left: Logo and Back Button */}
                    <div className="flex items-center gap-3">
                        {canGoBack && onGoBack && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onGoBack}
                                className="gap-2"
                            >
                                <IconChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Назад</span>
                            </Button>
                        )}
                        {!showOnlyBack && (
                            <h1 className="text-lg font-bold hidden sm:block">Журнал посещаемости</h1>
                        )}
                    </div>

                    {/* Center: Navigation - скрыто в режиме showOnlyBack */}
                    {!showOnlyBack && (
                        <nav className="flex items-center gap-2">
                            <NavButton
                                icon={IconHome}
                                label={isTeacher ? "Моя статистика" : "Главная"}
                                page="profile"
                                active={currentPage === 'profile'}
                                onClick={() => onNavigate('profile')}
                            />
                            <NavButton
                                icon={IconClipboardList}
                                label="Посещаемость"
                                page="attendance"
                                active={currentPage === 'attendance'}
                                onClick={() => onNavigate('attendance')}
                            />

                            {/* Admin/Moderator Menu */}
                            {(isAdmin || isModerator) && (
                                <>
                                    {isAdmin && (
                                        <NavButton
                                            icon={IconUsers}
                                            label="Пользователи"
                                            page="userManagement"
                                            active={currentPage === 'userManagement'}
                                            onClick={() => onNavigate('userManagement')}
                                        />
                                    )}
                                    <NavButton
                                        icon={IconFileText}
                                        label="Заявки"
                                        page="requests"
                                        active={currentPage === 'requests'}
                                        onClick={() => onNavigate('requests')}
                                    />
                                    {isAdmin && (
                                        <NavButton
                                            icon={IconActivity}
                                            label="Система"
                                            page="systemHealth"
                                            active={currentPage === 'systemHealth'}
                                            onClick={() => onNavigate('systemHealth')}
                                        />
                                    )}
                                </>
                            )}
                        </nav>
                    )}

                    {/* Right: User Menu - скрыто в режиме showOnlyBack */}
                    {!showOnlyBack && user && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground hidden md:block">
                                {user.name}
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-full">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary/10">
                                                {user.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.role}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {/* Navigation Items */}
                                    <DropdownMenuItem onClick={() => onNavigate('profile')} className="flex items-center">
                                        <IconHome className="mr-2 h-4 w-4" />
                                        Статистика
                                    </DropdownMenuItem>

                                    {(isModerator || isAdmin) && (
                                        <DropdownMenuItem onClick={() => onNavigate('requests')} className="flex items-center justify-between">
                                            <IconFileText className="mr-2 h-4 w-4" />
                                            Заявки
                                            {pendingRequestsCount !== undefined && pendingRequestsCount > 0 && (
                                                <Badge className="ml-auto rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold bg-yellow-500 text-white hover:bg-yellow-500 shadow-none">
                                                    {pendingRequestsCount}
                                                </Badge>
                                            )}
                                        </DropdownMenuItem>
                                    )}

                                    {isAdmin && (
                                        <DropdownMenuItem onClick={() => onNavigate('userManagement')} className="flex items-center">
                                            <IconUsers className="mr-2 h-4 w-4" />
                                            Пользователи
                                        </DropdownMenuItem>
                                    )}

                                    {onToggleTheme && theme && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={onToggleTheme}>
                                                {theme === 'dark' ? (
                                                    <>
                                                        <IconSun className="mr-2 h-4 w-4" />
                                                        Светлая тема
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconMoon className="mr-2 h-4 w-4" />
                                                        Темная тема
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {onLogout && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={onLogout} className="text-destructive">
                                                <IconLogout className="mr-2 h-4 w-4" />
                                                Выйти
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AppNavigation;
