import React from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Поиск...' }) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <IconSearch className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        id="search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 shadow-none"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Очистить поиск"
        >
          <IconX className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default SearchInput;