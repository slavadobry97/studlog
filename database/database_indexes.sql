-- Индексы для оптимизации запросов в Student Attendance Tracker
-- Выполните этот скрипт в Supabase SQL Editor

-- ============================================
-- ATTENDANCE TABLE INDEXES
-- ============================================

-- Индекс для частых запросов attendance по дате
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date);

-- Индекс для запросов attendance по schedule_id
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_id 
ON attendance(schedule_id);

-- Индекс для запросов attendance по student_id
CREATE INDEX IF NOT EXISTS idx_attendance_student_id 
ON attendance(student_id);

-- Составной индекс для частого запроса "attendance за дату для конкретного schedule"
-- Это самый важный индекс для страницы журнала посещаемости
CREATE INDEX IF NOT EXISTS idx_attendance_date_schedule 
ON attendance(date, schedule_id);

-- ============================================
-- SCHEDULE TABLE INDEXES
-- ============================================

-- Индекс для запросов schedule по дате
-- Используется при загрузке расписания на конкретную дату
CREATE INDEX IF NOT EXISTS idx_schedule_date 
ON schedule(date);

-- Составной индекс для уникальности расписания
-- Предотвращает дубликаты и ускоряет upsert операции
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_unique 
ON schedule(date, "group", teacher_name, subject, time);

-- ============================================
-- STUDENTS TABLE INDEXES
-- ============================================

-- Индекс для поиска студентов по группе
-- Используется при загрузке списка студентов для выбранной группы
CREATE INDEX IF NOT EXISTS idx_students_group 
ON students("group");

-- Индекс для поиска студентов по имени (для функции поиска)
CREATE INDEX IF NOT EXISTS idx_students_name 
ON students(name);

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================

-- Индекс для поиска профилей по роли
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

-- Индекс для поиска профилей по кафедре
CREATE INDEX IF NOT EXISTS idx_profiles_department 
ON profiles(department);

-- Индекс для поиска по имени (для функции поиска в управлении пользователями)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON profiles(full_name);

-- ============================================
-- ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- ============================================

-- Выполните этот запрос для проверки всех созданных индексов:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('attendance', 'schedule', 'students', 'profiles')
    AND schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ============================================
-- ПРИМЕЧАНИЯ
-- ============================================

/*
1. Все индексы используют IF NOT EXISTS, поэтому скрипт можно выполнять многократно
2. Индексы автоматически обновляются при INSERT/UPDATE/DELETE операциях
3. Индексы занимают дополнительное место на диске, но значительно ускоряют SELECT запросы
4. Для таблиц с миллионами записей рекомендуется периодически выполнять REINDEX
5. Мониторьте использование индексов через pg_stat_user_indexes
*/
