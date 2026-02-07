# Краткая инструкция по внедрению

## 🚀 Быстрое начало (15 минут)

### Шаг 1: Подключите провайдеры

Откройте `index.tsx` и оберните App:

```typescript
import { QueryProvider } from '@/app/providers/QueryProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';

root.render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
);
```

### Шаг 2: Используйте хуки в компонентах

**Пример 1: Получение студентов**
```typescript
import { useStudents } from '@/features/students/hooks/useStudents';

function MyComponent() {
  const { data: students, isLoading } = useStudents();
  
  if (isLoading) return <Loader />;
  return <div>{students?.length} студентов</div>;
}
```

**Пример 2: Обновление посещаемости**
```typescript
import { useUpdateAttendanceStatus } from '@/features/attendance/hooks/useAttendance';

function AttendanceButton() {
  const updateStatus = useUpdateAttendanceStatus();
  
  const handleClick = () => {
    updateStatus.mutate({
      studentId: 1,
      scheduleId: 10,
      date: '2024-01-01',
      status: AttendanceStatus.Present
    });
  };
  
  return <button onClick={handleClick}>Отметить</button>;
}
```

### Шаг 3: Используйте новые компоненты

```typescript
import StatCard from '@/features/analytics/components/StatCard';

<StatCard 
  label="Посещаемость" 
  value="85%" 
/>
```

## ✅ Готово!

Теперь у вас:
- ✅ Автоматическое кеширование данных
- ✅ Оптимизированный бандл
- ✅ Переиспользуемые компоненты

Подробнее в [USAGE_GUIDE.md](./USAGE_GUIDE.md)
