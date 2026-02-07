import React, { useState, useRef, useCallback } from 'react';
import { Student } from '../types';
import { supabase } from '../lib/supabase';
import ErrorMessage from './ErrorMessage';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        throw new Error("CSV файл должен содержать заголовок и хотя бы одну строку с данными.");
      }
      const header = lines.shift()!.trim().split(';').map(h => h.toLowerCase());

      const requiredHeaders = ['id', 'name', 'group'];
      if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error(`CSV файл должен содержать столбцы: ${requiredHeaders.join(', ')}.`);
      }

      const studentsToUpsert = lines.map((line, index) => {
        const values = line.trim().split(';');
        const studentData: any = {};
        header.forEach((h, i) => {
          studentData[h] = values[i];
        });

        if (!studentData.id || !studentData.name || !studentData.group) {
          throw new Error(`Ошибка в строке ${index + 2}: Отсутствуют обязательные данные (id, name, group).`);
        }

        return {
          id: parseInt(studentData.id, 10),
          name: studentData.name,
          group: studentData.group,
          avatar_url: studentData.avatarurl || null,
        };
      });

      const { error: upsertError } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'id' });
      if (upsertError) {
        throw upsertError;
      }

      onImport();
    } catch (err: any) {
      setError(err.message || 'Не удалось обработать файл. Убедитесь, что он в формате CSV и соответствует структуре.');
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file
      event.target.value = '';
    }
  }, [onImport]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="relative bg-background w-full max-w-lg m-4 rounded-lg border shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 p-6">
          <h2 id="import-modal-title" className="text-lg font-semibold tracking-tight">Импорт студентов</h2>
          <p className="text-sm text-muted-foreground">Загрузите CSV-файл для добавления или обновления списка студентов.</p>
        </div>
        <div className="p-6 pt-0">
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              <p>Ожидаемый формат CSV (с заголовком, разделитель - точка с запятой ";"):</p>
              <code className="block bg-muted p-2 rounded-lg mt-1 font-mono">id;name;group;avatarUrl</code>
              <p className="mt-1">Поля `id`, `name`, `group` обязательны. `avatarUrl` является необязательным.</p>
            </div>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer file:cursor-pointer"
            />
            {isLoading && <p className="text-sm font-medium text-primary">Идет загрузка данных в базу...</p>}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end p-6 pt-0">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Закрыть
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground opacity-70 hover:opacity-100 h-8 w-8"
          aria-label="Закрыть"
        >
          <IconX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImportModal;