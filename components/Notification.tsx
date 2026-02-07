import React from 'react';

interface NotificationProps {
  message: string | null;
  type?: 'success' | 'info';
}

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);


const Notification: React.FC<NotificationProps> = ({ message, type = 'info' }) => {
  const isVisible = !!message;
  
  const baseClasses = "fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center w-full max-w-xs p-4 space-x-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out";
  const typeClasses = {
    success: 'bg-green-50 text-green-700 dark:bg-green-800/80 dark:text-green-200 border border-green-200 dark:border-green-700',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-800/80 dark:text-blue-200 border border-blue-200 dark:border-blue-700',
  };
  
  const visibilityClasses = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none';

  const iconClasses = "w-6 h-6";
  const icon = type === 'success' ? <CheckCircleIcon className={iconClasses} /> : <InfoIcon className={iconClasses} />;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`}
    >
      {icon}
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
};

export default Notification;
