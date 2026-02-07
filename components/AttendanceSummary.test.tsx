
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceSummary from './AttendanceSummary';
import { AttendanceStatus } from '../types/index';

// Fix for missing Jest type definitions
declare var describe: any;
declare var it: any;
declare var expect: any;

const mockSummary = {
  [AttendanceStatus.Present]: 10,
  [AttendanceStatus.Absent]: 3,
  [AttendanceStatus.ExcusedAbsent]: 1,
};

describe('AttendanceSummary Component', () => {
  it('renders attendance counts correctly', () => {
    render(
      <AttendanceSummary 
        summary={mockSummary} 
      />
    );

    // Helper regex to match text that might be split across spans
    // However, the component structure is explicit: label: count
    // We check for the numbers specifically associated with labels
    
    // Check Present
    expect(screen.getByText('Присутствовал:')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // Check Absent
    expect(screen.getByText('Отсутствовал (неув.):')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Check Excused
    expect(screen.getByText('Отсутствовал (уваж.):')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders schedule details when provided', () => {
    render(
      <AttendanceSummary 
        summary={mockSummary} 
        groupName="ИС-21"
        groupStudentCount={25}
        subject="Математика"
        classroom="Ауд. 101"
        time="10:00"
      />
    );

    expect(screen.getByText('ИС-21 (25)')).toBeInTheDocument();
    expect(screen.getByText('Математика')).toBeInTheDocument();
    expect(screen.getByText('Ауд. 101')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('does not render detail section if no details provided', () => {
    render(
      <AttendanceSummary 
        summary={mockSummary} 
      />
    );

    // Ensure labels for details are not present
    expect(screen.queryByText('Дисциплина:')).not.toBeInTheDocument();
    expect(screen.queryByText('Аудитория:')).not.toBeInTheDocument();
  });

  it('handles missing group count gracefully', () => {
    render(
      <AttendanceSummary 
        summary={mockSummary} 
        groupName="ИС-21"
        // groupStudentCount is undefined
      />
    );

    expect(screen.getByText('ИС-21')).toBeInTheDocument();
    // Should not see the parenthesis format
    expect(screen.queryByText(/ИС-21 \(\d+\)/)).not.toBeInTheDocument();
  });
});
