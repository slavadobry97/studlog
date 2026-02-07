
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentRow from './StudentRow';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../types/index';

// Fix for missing Jest type definitions
declare var jest: any;
declare var describe: any;
declare var it: any;
declare var expect: any;
declare var afterEach: any;

const mockStudent = {
  id: 1,
  name: 'Иванов Иван',
  group: 'ИС-21',
  avatarUrl: 'https://example.com/avatar.jpg'
};

const mockHandlers = {
  onStatusChange: jest.fn(),
  onViewProfile: jest.fn(),
};

describe('StudentRow Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders student name and group correctly', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Преподаватель"
        {...mockHandlers} 
      />
    );

    expect(screen.getByText('Иванов Иван')).toBeInTheDocument();
    expect(screen.getByText('ИС-21')).toBeInTheDocument();
  });

  it('calls onViewProfile when name is clicked', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Преподаватель"
        {...mockHandlers} 
      />
    );

    fireEvent.click(screen.getByText('Иванов Иван'));
    expect(mockHandlers.onViewProfile).toHaveBeenCalledWith(mockStudent);
  });

  it('renders standard status buttons for Teacher role', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Преподаватель"
        {...mockHandlers} 
      />
    );

    // Should see Present and Absent
    expect(screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Present])).toBeInTheDocument();
    expect(screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Absent])).toBeInTheDocument();
    
    // Should NOT see Excused Absent
    expect(screen.queryByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.ExcusedAbsent])).not.toBeInTheDocument();
  });

  it('renders all status buttons for Admin role', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Администратор"
        {...mockHandlers} 
      />
    );

    // Should see all three
    expect(screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Present])).toBeInTheDocument();
    expect(screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Absent])).toBeInTheDocument();
    expect(screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.ExcusedAbsent])).toBeInTheDocument();
  });

  it('calls onStatusChange with correct values when buttons are clicked', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Преподаватель"
        {...mockHandlers} 
      />
    );

    const presentBtn = screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Present]);
    fireEvent.click(presentBtn);

    expect(mockHandlers.onStatusChange).toHaveBeenCalledWith(mockStudent.id, AttendanceStatus.Present);
  });

  it('highlights the active status button', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Present} 
        userRole="Преподаватель"
        {...mockHandlers} 
      />
    );

    const presentBtn = screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Present]);
    const absentBtn = screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Absent]);

    expect(presentBtn).toHaveAttribute('aria-pressed', 'true');
    expect(absentBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('respects the disabled prop', () => {
    render(
      <StudentRow 
        student={mockStudent} 
        status={AttendanceStatus.Unmarked} 
        userRole="Преподаватель"
        disabled={true}
        {...mockHandlers} 
      />
    );

    const presentBtn = screen.getByLabelText(ATTENDANCE_STATUS_LABELS[AttendanceStatus.Present]);
    expect(presentBtn).toBeDisabled();
    
    fireEvent.click(presentBtn);
    expect(mockHandlers.onStatusChange).not.toHaveBeenCalled();
  });
});
