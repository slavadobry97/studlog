import React from 'react';
import { Button } from './ui/button';
import { IconSquareRoundedArrowLeft } from '@tabler/icons-react';

interface PageHeaderProps {
    onBack?: () => void;
    backButtonText?: string;
    showBackButton?: boolean;
    className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    onBack,
    backButtonText = 'Назад',
    showBackButton = true,
    className = ''
}) => {
    return (
        <header className={`border-b bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 ${className}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center">
                    {showBackButton && onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="gap-2"
                        >
                            <IconSquareRoundedArrowLeft className="h-6 w-6" />
                            <span>{backButtonText}</span>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default PageHeader;
