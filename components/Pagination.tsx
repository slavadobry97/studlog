import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from './ui/button';
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationItem,
} from './ui/pagination';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between p-4">
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? `Показано ${startItem}–${endItem} из ${totalItems}` : 'Нет данных'}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium whitespace-nowrap">
          Страница {currentPage} из {totalPages}
        </span>

        <ShadcnPagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                aria-label="Предыдущая страница"
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentPage === 1}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                aria-label="Следующая страница"
                size="icon"
                variant="ghost"
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </ShadcnPagination>
      </div>
    </div>
  );
};

export default Pagination;
