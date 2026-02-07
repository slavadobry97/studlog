
import { useQuery } from '@tanstack/react-query';

// Улучшенный парсер CSV
const parseCSV = (csvText: string): string[][] => {
    const rows: string[][] = [];
    if (!csvText) return rows;

    const text = csvText.trim().replace(/\r\n/g, '\n');
    
    const firstLine = text.substring(0, text.indexOf('\n')).trim();
    const delimiter = firstLine.includes(';') ? ';' : ',';

    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    currentField += '"';
                    i++; 
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === delimiter) {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '"' && currentField.length === 0) {
                inQuotes = true;
            } else {
                currentField += char;
            }
        }
    }
    
    currentRow.push(currentField);
    rows.push(currentRow);

    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
        rows.pop();
    }
    
    return rows;
};

export const useGoogleSheetData = (url: string) => {
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['googleSheet', url],
        queryFn: async () => {
            if (!url || url.includes('YOUR_SCHEDULE_SHEET_URL_HERE')) {
                throw new Error("URL не настроен");
            }

            const fetchUrl = new URL(url);
            // Добавляем timestamp, чтобы обойти кэш CDN Google, но React Query сам закэширует результат
            fetchUrl.searchParams.set('cache_bust', new Date().getTime().toString());
            
            const response = await fetch(fetchUrl.toString());

            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            
            let text = await response.text();
            
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.substring(1);
            }
            
            if (text.trim().startsWith('<!DOCTYPE html>') || text.trim() === '') {
               throw new Error("Некорректный ответ от Google Sheets");
            }
            
            const parsedData = parseCSV(text);
            if (parsedData.length === 0) {
                throw new Error("Пустой CSV файл");
            }
            return parsedData;
        },
        // Кэшируем данные на 15 минут, так как расписание меняется редко
        staleTime: 1000 * 60 * 15,
        enabled: !!url && !url.includes('YOUR_SCHEDULE_SHEET_URL_HERE'),
    });

    return { 
        data, 
        loading: isLoading, // Mapping for compatibility
        error: error ? (error as Error).message : null, 
        progress: isFetching ? 'Загрузка...' : '', // Simplified progress
        refetch 
    };
};
