import React from 'react';
import { Button } from './ui/button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 max-w-2xl w-full text-center" role="alert">
    <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
    <p className="mt-1 text-sm">{message}</p>
    {onRetry && (
      <div className="mt-4">
        <Button
          variant="destructive"
          onClick={onRetry}
          className="h-10 px-4"
        >
          Попробовать снова
        </Button>
      </div>
    )}
  </div>
);

export default ErrorMessage;