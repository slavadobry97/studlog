# Руководство по использованию новой структуры

## 🚀 Быстрый старт

### 1. Использование провайдеров

Оберните приложение провайдерами в `index.tsx`:

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

### 2. Использование хуков аутентификации

```typescript
import { useAuth } from '@/app/providers/AuthProvider';

function MyComponent() {
  const { currentUser, loading, signOut } = useAuth();
  
  if (loading) return <Loader />;
  if (!currentUser) return <LoginPage />;
  
  return <div>Привет, {currentUser.name}!</div>;
}
```

### 3. Использование React Query хуков

#### Получение студентов:
```typescript
import { useStudents } from '@/features/students/hooks/useStudents';

function StudentsList() {
  const { data: students, isLoading, error } = useStudents();
  
  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error.message} />;
  
  return (
    <div>
      {students?.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  );
}
```

#### Обновление посещаемости:
```typescript
import { useUpdateAttendanceStatus } from '@/features/attendance/hooks/useAttendance';

function AttendanceControl() {
  const updateStatus = useUpdateAttendanceStatus();
  
  const handleMarkPresent = (studentId: number, scheduleId: number, date: string) => {
    updateStatus.mutate({
      studentId,
      scheduleId,
      date,
      status: AttendanceStatus.Present
    });
  };
  
  return <button onClick={() => handleMarkPresent(1, 10, '2024-01-01')}>
    Отметить присутствие
  </button>;
}
```

### 4. Использование утилит

#### Работа с датами:
```typescript
import { getISODateString, getAcademicYearStart } from '@/shared/lib/dateUtils';

const today = new Date();
const dateStr = getISODateString(today); // "2024-01-01"
const yearStart = getAcademicYearStart(); // 1 сентября текущего года
```

#### Использование констант:
```typescript
import { PAGINATION, RISK_THRESHOLDS } from '@/shared/lib/constants';

const itemsPerPage = PAGINATION.ITEMS_PER_PAGE; // 20
const isCritical = absenceRate > RISK_THRESHOLDS.CRITICAL; // > 40%
```

### 5. Использование компонентов

#### StatCard:
```typescript
import StatCard from '@/features/analytics/components/StatCard';

<StatCard 
  label="Средняя посещаемость" 
  value="85.5%" 
  subtext="без ув. пропусков"
  onClick={() => console.log('Clicked')}
/>
```

#### TeacherDashboard:
```typescript
import TeacherDashboard from '@/features/analytics/components/TeacherDashboard';

<TeacherDashboard
  schedule={todaySchedule}
  viewDate={new Date()}
  onDateChange={setDate}
  onNavigateToJournal={(id, date) => navigate(`/attendance/${id}`)}
/>
```

#### AttendanceTable:
```typescript
import AttendanceTable from '@/features/attendance/components/AttendanceTable';

<AttendanceTable
  students={students}
  paginatedStudents={paginatedStudents}
  currentStatuses={statusMap}
  sortConfig={sortConfig}
  selectedScheduleId={scheduleId}
  userRole={user.role}
  currentPage={1}
  totalPages={5}
  totalItems={100}
  itemsPerPage={20}
  onStatusChange={handleStatusChange}
  onViewProfile={setViewingStudent}
  onSort={handleSort}
  onPageChange={setPage}
  onMarkAll={handleMarkAll}
/>
```

### 6. Виртуализация больших списков

Для списков с более чем 50 элементами используйте виртуализацию:

```typescript
import VirtualizedStudentList from '@/features/attendance/components/VirtualizedStudentList';

<VirtualizedStudentList
  students={allStudents}
  currentStatuses={statusMap}
  selectedScheduleId={scheduleId}
  userRole={user.role}
  onStatusChange={handleStatusChange}
  onViewProfile={setViewingStudent}
/>
```

## 📁 Структура импортов

### Алиасы путей:
- `@/*` - корень проекта
- `@app/*` - папка app
- `@shared/*` - папка shared

### Примеры:
```typescript
// Провайдеры
import { useAuth } from '@/app/providers/AuthProvider';
import { useTheme } from '@/app/providers/ThemeProvider';

// API
import { studentsApi } from '@/features/students/api/studentsApi';
import { attendanceApi } from '@/features/attendance/api/attendanceApi';

// Хуки
import { useStudents } from '@/features/students/hooks/useStudents';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';

// Утилиты
import { getISODateString } from '@/shared/lib/dateUtils';
import { PAGINATION } from '@/shared/lib/constants';

// Компоненты
import StatCard from '@/features/analytics/components/StatCard';
import AttendanceTable from '@/features/attendance/components/AttendanceTable';

// Типы
import { Student, AttendanceStatus } from '@/types/index';
```

## 🎯 Лучшие практики

### 1. Используйте React Query для всех запросов к БД
❌ **Плохо:**
```typescript
const [students, setStudents] = useState([]);
useEffect(() => {
  supabase.from('students').select('*').then(({data}) => setStudents(data));
}, []);
```

✅ **Хорошо:**
```typescript
const { data: students } = useStudents();
```

### 2. Используйте константы вместо магических чисел
❌ **Плохо:**
```typescript
if (absenceRate > 40) { /* критический риск */ }
```

✅ **Хорошо:**
```typescript
import { RISK_THRESHOLDS } from '@/shared/lib/constants';
if (absenceRate > RISK_THRESHOLDS.CRITICAL) { /* критический риск */ }
```

### 3. Используйте утилиты для работы с датами
❌ **Плохо:**
```typescript
const dateStr = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
```

✅ **Хорошо:**
```typescript
import { getISODateString } from '@/shared/lib/dateUtils';
const dateStr = getISODateString(date);
```

### 4. Разделяйте компоненты на мелкие переиспользуемые части
❌ **Плохо:** Один большой компонент на 1000 строк

✅ **Хорошо:** Несколько маленьких компонентов по 50-100 строк

## 🔄 Миграция существующего кода

### Шаг 1: Замените прямые вызовы Supabase
```typescript
// Было:
const { data } = await supabase.from('students').select('*');

// Стало:
const { data: students } = useStudents();
```

### Шаг 2: Используйте новые компоненты
```typescript
// Было: Inline компонент карточки
<div className="p-4 rounded-lg border">
  <p className="text-sm">{label}</p>
  <p className="text-3xl font-bold">{value}</p>
</div>

// Стало:
<StatCard label={label} value={value} />
```

### Шаг 3: Вынесите константы
```typescript
// Было:
const ITEMS_PER_PAGE = 20;

// Стало:
import { PAGINATION } from '@/shared/lib/constants';
const itemsPerPage = PAGINATION.ITEMS_PER_PAGE;
```

## 📚 Дополнительные ресурсы

- [React Query документация](https://tanstack.com/query/latest)
- [React Window документация](https://react-window.vercel.app/)
- [Vite документация](https://vitejs.dev/)
