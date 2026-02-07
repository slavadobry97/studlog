import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface CustomSelectProps {
  options: { value: string; label: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Выберите...',
  disabled = false
}) => {
  return (
    <Select
      value={selectedValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CustomSelect;
