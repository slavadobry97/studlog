import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CustomSelect from './CustomSelect';
import { Student } from '../types';
import ErrorMessage from './ErrorMessage';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [groups, setGroups] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Загрузка списка групп из базы данных
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('group')
          .order('group');

        if (error) throw error;

        // Получаем уникальные группы
        const uniqueGroups = Array.from(new Set(data?.map(s => s.group) || []))
          .filter(g => g) // Убираем пустые значения
          .sort()
          .map(g => ({ value: g, label: g }));

        setGroups(uniqueGroups);
      } catch (err) {
        console.error('Ошибка загрузки групп:', err);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setGroup('');
      setError(null);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !group.trim()) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from('students')
        .insert([{ name: name.trim(), group: group.trim().toUpperCase() }])
        .select();

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      console.log('Student added successfully:', data);
      onSuccess();
    } catch (err: any) {
      console.error('Error adding student:', err);
      const errorMessage = err.message || 'Произошла непредвиденная ошибка при добавлении студента.';

      // More user-friendly error messages
      if (err.message?.includes('row-level security')) {
        setError('Ошибка прав доступа. Проверьте настройки безопасности в Supabase или обратитесь к администратору базы данных.');
      } else if (err.code === '23505') {
        setError('Студент с таким именем уже существует в этой группе.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
    >
      <div
        className="relative bg-background w-full max-w-md m-4 rounded-lg border shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h2 id="add-student-modal-title" className="text-lg font-semibold tracking-tight">Добавить студента</h2>
            <p className="text-sm text-muted-foreground">Введите данные нового студента.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="student-name" className="block text-sm font-medium mb-1">ФИО студента</label>
              <Input
                ref={nameInputRef}
                id="student-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="student-group" className="block text-sm font-medium mb-1">Учебная группа</label>
              {isLoadingGroups ? (
                <div className="flex h-10 w-full items-center justify-center rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
                  Загрузка групп...
                </div>
              ) : (
                <CustomSelect
                  options={groups}
                  selectedValue={group}
                  onValueChange={setGroup}
                  placeholder="Выберите группу"
                  disabled={isLoading}
                />
              )}
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <div className="flex items-center justify-end p-6 pt-0 gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </form>
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

export default AddStudentModal;