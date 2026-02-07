import React from 'react';
import { AttendanceStatus } from '../types';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Check, X, ChevronDown } from "lucide-react";

interface MarkAllControlProps {
  onMarkAll: (status: AttendanceStatus.Present | AttendanceStatus.Absent) => void;
  disabled?: boolean;
}

const MarkAllControl: React.FC<MarkAllControlProps> = ({ onMarkAll, disabled = false }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground h-auto p-1 font-normal data-[state=open]:text-foreground"
        >
          <span>Отметить всех</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onMarkAll(AttendanceStatus.Present)} className="cursor-pointer">
          <Check className="w-4 h-4 mr-2 text-green-500" />
          <span>Присутствуют</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMarkAll(AttendanceStatus.Absent)} className="cursor-pointer">
          <X className="w-4 h-4 mr-2 text-red-500" />
          <span>Отсутствуют</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MarkAllControl;