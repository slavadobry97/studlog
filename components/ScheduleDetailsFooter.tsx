import React from 'react';

interface ScheduleDetailsFooterProps {
  subject?: string;
  loadType?: string;
  classroom?: string;
}

const DetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value || value.trim() === '') return null;
  return (
    <div className="px-4">
      <span className="text-sm text-muted-foreground">{label}: </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
};

const ScheduleDetailsFooter: React.FC<ScheduleDetailsFooterProps> = ({ subject, loadType, classroom }) => {
  const hasDetails = (subject && subject.trim() !== '') || (loadType && loadType.trim() !== '') || (classroom && classroom.trim() !== '');

  if (!hasDetails) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center sm:justify-between flex-wrap text-center">
        <div className="hidden sm:block font-semibold">Детали занятия:</div>
        <div className="flex items-center divide-x divide-border">
          <DetailItem label="Дисциплина" value={subject} />
          <DetailItem label="Вид нагрузки" value={loadType} />
          <DetailItem label="Аудитория" value={classroom} />
        </div>
      </div>
    </footer>
  );
};

export default ScheduleDetailsFooter;
