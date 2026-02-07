import React from 'react';
import { User } from '../types/index';

const BarChartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="20" y2="10" />
        <line x1="18" x2="18" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
);

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

interface BottomNavBarProps {
    onOpenReport: () => void;
    onOpenImport: () => void;
    userRole: User['role'];
}

const NavItem: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; }> = ({ onClick, icon, label }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center space-y-1 w-full p-2 text-muted-foreground hover:text-primary focus:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-colors"
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onOpenReport, onOpenImport, userRole }) => {
    const canManageStudents = userRole === 'Администратор' || userRole === 'Модератор';
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background/60 backdrop-blur-sm border-t border-border sm:hidden">
            <div className="flex justify-around items-center h-16 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <NavItem onClick={onOpenReport} icon={<BarChartIcon className="w-6 h-6" />} label="Отчет" />
                {canManageStudents && (
                    <NavItem onClick={onOpenImport} icon={<UploadIcon className="w-6 h-6" />} label="Импорт" />
                )}
            </div>
        </nav>
    );
};

export default BottomNavBar;