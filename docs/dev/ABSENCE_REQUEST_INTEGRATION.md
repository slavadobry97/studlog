# Связь заявок студентов с записями посещаемости

## Описание функциональности

При одобрении заявки студента на отсутствие автоматически создаются/обновляются записи посещаемости со статусом "Уважительная причина" (ExcusedAbsent).

## Шаги реализации

### 1. Обновление базы данных

Выполните SQL скрипт `supabase_add_absence_request_link.sql`:

```sql
-- Добавить поле absence_request_id в таблицу attendance
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS absence_request_id INTEGER REFERENCES public.absence_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_absence_request_id 
ON public.attendance(absence_request_id);
```

### 2. Обновление типов TypeScript

Уже выполнено в `types/supabase.ts` - добавлено поле `absence_request_id` в типы attendance.

### 3. Логика обработки одобрения заявки

В файле `pages/Requests/index.tsx` функция `handleStatusUpdate` должна:

**При одобрении (status = 'approved'):**

1. Получить данные заявки (student_id, schedule_id, даты)
2. Если указан `schedule_id`:
   - Найти или создать запись attendance для этого студента и занятия
   - Установить status = 'ExcusedAbsent'
   - Установить absence_request_id = id заявки
3. Если НЕ указан schedule_id (заявка на период):
   - Извлечь даты из description (формат: [дата1, дата2, ...])
   - Найти все занятия студента в эти даты
   - Для каждого занятия создать/обновить запись attendance

**При отклонении (status = 'rejected'):**
- Найти все записи attendance с этим absence_request_id
- Изменить status на 'Absent' (неуважительная)
- Очистить absence_request_id

### 4. Отображение связи в интерфейсе

**В AbsenceDetailModal:**
- Показывать иконку/бейдж если пропуск связан с заявкой
- При клике - показывать детали заявки

**В StudentProfileModal:**
- Показывать связь с заявкой в календаре

**При изменении статуса пропуска вручную:**
- Если пропуск связан с заявкой, предупреждать администратора
- Опционально: отменять связь с заявкой

## Пример кода для handleStatusUpdate

```typescript
const handleStatusUpdate = useCallback(async (requestId: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

    try {
        // Получить данные заявки
        const request = requests.find(r => r.id === requestId);
        if (!request) throw new Error('Заявка не найдена');

        // Обновить статус заявки
        const { error } = await supabase
            .from('absence_requests')
            .update({ status: newStatus })
            .eq('id', requestId);

        if (error) throw error;

        // Обработка записей посещаемости
        if (newStatus === 'approved') {
            await handleApprovalAttendance(request);
        } else if (newStatus === 'rejected') {
            await handleRejectionAttendance(requestId);
        }

        showNotification(
            newStatus === 'approved' ? 'Заявка одобрена. Пропуски отмечены как уважительные.' :
            newStatus === 'rejected' ? 'Заявка отклонена.' :
            'Статус сброшен',
            'success'
        );
    } catch (err: any) {
        // ... обработка ошибок
    }
}, [requests, showNotification]);

const handleApprovalAttendance = async (request: AbsenceRequest) => {
    if (request.schedule_id) {
        // Одно занятие
        const schedule = schedules.find(s => s.id === request.schedule_id);
        if (!schedule) return;

        // Проверить, есть ли уже запись
        const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', request.student_id)
            .eq('schedule_id', request.schedule_id)
            .eq('date', schedule.date)
            .single();

        if (existing) {
            // Обновить существующую
            await supabase
                .from('attendance')
                .update({
                    status: 'ExcusedAbsent',
                    absence_request_id: request.id
                })
                .eq('id', existing.id);
        } else {
            // Создать новую
            await supabase
                .from('attendance')
                .insert({
                    student_id: request.student_id,
                    schedule_id: request.schedule_id,
                    date: schedule.date,
                    status: 'ExcusedAbsent',
                    absence_request_id: request.id
                });
        }
    } else {
        // Период - извлечь даты из description
        const dates = extractDatesFromDescription(request.description);
        
        for (const date of dates) {
            // Найти занятия студента в эту дату
            const studentGroup = students.find(s => s.id === request.student_id)?.group;
            if (!studentGroup) continue;

            const daySchedules = schedules.filter(s => 
                s.date === date && s.group === studentGroup
            );

            for (const schedule of daySchedules) {
                // Создать/обновить запись посещаемости
                const { data: existing } = await supabase
                    .from('attendance')
                    .select('id')
                    .eq('student_id', request.student_id)
                    .eq('schedule_id', schedule.id)
                    .eq('date', date)
                    .single();

                if (existing) {
                    await supabase
                        .from('attendance')
                        .update({
                            status: 'ExcusedAbsent',
                            absence_request_id: request.id
                        })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('attendance')
                        .insert({
                            student_id: request.student_id,
                            schedule_id: schedule.id,
                            date: date,
                            status: 'ExcusedAbsent',
                            absence_request_id: request.id
                        });
                }
            }
        }
    }
};

const handleRejectionAttendance = async (requestId: number) => {
    // Найти все записи, связанные с этой заявкой
    const { data: linkedAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('absence_request_id', requestId);

    if (linkedAttendance && linkedAttendance.length > 0) {
        // Изменить на неуважительные и убрать связь
        await supabase
            .from('attendance')
            .update({
                status: 'Absent',
                absence_request_id: null
            })
            .eq('absence_request_id', requestId);
    }
};

const extractDatesFromDescription = (description: string | null): string[] => {
    if (!description) return [];
    
    // Формат: [2025-12-23, 2025-12-24] остальной текст
    const match = description.match(/\[([\d\-,\s]+)\]/);
    if (!match) return [];
    
    return match[1].split(',').map(d => d.trim());
};
```

## Следующие шаги

1. ✅ Выполнить SQL миграцию
2. ✅ Обновить типы TypeScript
3. ⏳ Реализовать логику в handleStatusUpdate
4. ⏳ Добавить визуальные индикаторы связи в UI
5. ⏳ Тестирование

## Примечания

- При изменении статуса пропуска вручную администратором, связь с заявкой сохраняется
- Если заявка отклоняется после одобрения, пропуски становятся неуважительными
- Один пропуск может быть связан только с одной заявкой
