// Причины отсутствия для заявок
export const ABSENCE_REASONS = [
    { value: 'event_participation', label: 'Участие в мероприятии (конференции, соревнования)' },
    { value: 'event_prep', label: 'Подготовка к мероприятию' },
    { value: 'career_guidance', label: 'Профориентация в школах' },
    { value: 'medical', label: 'По болезни (справка)' },
    { value: 'family', label: 'Семейные обстоятельства' },
    { value: 'other', label: 'Другое' }
];

// Типы для причин отсутствия
export type AbsenceReasonValue = typeof ABSENCE_REASONS[number]['value'];
export type AbsenceReason = typeof ABSENCE_REASONS[number];

// Пороговые значения для статистики
export const THRESHOLDS = {
    /** Группы с посещаемостью ниже этого значения считаются в зоне риска */
    RISK_GROUP_ATTENDANCE: 70,
    /** Предупреждение при посещаемости ниже этого значения */
    LOW_ATTENDANCE_WARNING: 80,
} as const;

// Размеры пагинации
export const PAGINATION = {
    /** Размер батча для загрузки данных из Supabase */
    BATCH_SIZE: 1500,
} as const;

// Роли пользователей
export const ROLES = ['Преподаватель', 'Модератор', 'Администратор'] as const;
export type UserRole = typeof ROLES[number];

// Кафедры
export const DEPARTMENTS = [
    'Кафедра правовых дисциплин',
    'Кафедра психологии и конфликтологии',
    'Кафедра управления проектами',
    'Кафедра социальной работы',
];

// Маппинг колонок для парсинга Google Sheets
export const COLUMN_MAP: { [key: string]: string } = {
    'учебная группа': 'group',
    'преподаватель': 'teacher_name',
    'дисциплина': 'subject',
    'время': 'time',
    'дата': 'date',
    'вид нагрузки кафедры': 'load_type',
    'аудитория': 'classroom',
};

