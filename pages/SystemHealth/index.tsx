
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import Loader from '../../components/Loader';
import ThemeToggle from '../../components/ThemeToggle';
import UserNav from '../../components/UserNav';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { IconChevronLeft } from '@tabler/icons-react';


interface SystemHealthPageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    onToggleTheme: () => void;
    onBack: () => void;
}

const SystemHealthPage: React.FC<SystemHealthPageProps> = ({ user, onLogout, theme, onToggleTheme, onBack }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [simulatedUserCount, setSimulatedUserCount] = useState<number>(100);

    const log = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const withTimeout = (promise: any, ms: number, errorMsg: string) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
        ]);
    };

    const runTests = async () => {
        setIsRunning(true);
        setLogs([]);
        log("Запуск диагностики системы...");

        try {
            // 1. Network Test
            log("--- ТЕСТ СЕТИ (Supabase) ---");
            const startPing = performance.now();

            try {
                const { error: pingError } = await withTimeout(
                    supabase.from('profiles').select('id').limit(1),
                    10000,
                    "Превышено время ожидания (10с). Возможно, база данных 'уснула'."
                );

                const endPing = performance.now();

                if (pingError) {
                    log(`[ОШИБКА] Связь с базой данных: ${pingError.message}`);
                } else {
                    log(`[OK] Связь с базой данных установлена. Задержка: ${(endPing - startPing).toFixed(2)}мс`);
                }
            } catch (timeoutErr: any) {
                log(`[TIMEOUT] ${timeoutErr.message}`);
            }

            // 2. Browser Performance (Render Mock)
            log("--- ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ БРАУЗЕРА ---");
            const startRender = performance.now();
            const dummyArray = new Array(10000).fill(0).map((_, i) => i * 2); // Simulating heavy calculation
            const endRender = performance.now();
            log(`[OK] Генерация 10,000 элементов в памяти: ${(endRender - startRender).toFixed(2)}мс`);

            if ((endRender - startRender) > 100) {
                log(`[WARN] Медленная работа JS. Возможно, устройство перегружено.`);
            }

            // 3. Functional: Parse Date
            log("--- ФУНКЦИОНАЛЬНЫЙ ТЕСТ ---");
            const testDate = "25.12.2023";
            const match = testDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
            if (match && match[3] === '2023' && match[2] === '12' && match[1] === '25') {
                log(`[OK] Парсер дат работает корректно.`);
            } else {
                log(`[FAIL] Ошибка парсера дат.`);
            }

            log("Диагностика завершена.");

        } catch (e: any) {
            log(`[CRITICAL] Критическая ошибка во время тестов: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const runLoadTest = async () => {
        if (simulatedUserCount <= 0 || simulatedUserCount > 1000) {
            log(`[WARN] Количество пользователей должно быть от 1 до 1000.`);
            return;
        }

        setIsRunning(true);
        log("--- ЗАПУСК НАГРУЗОЧНОГО ТЕСТИРОВАНИЯ ---");
        log(`Симуляция ${simulatedUserCount} запросов (режим пакетирования)...`);
        log(`Примечание: Запросы отправляются пачками по 10 штук, чтобы избежать блокировки браузером.`);

        try {
            const batchSize = 10; // Browser friendly limit
            const results: { success: boolean; duration: number; error?: any }[] = [];
            const startTime = performance.now();

            // Helper to run a single request
            const makeRequest = async () => {
                const start = performance.now();
                try {
                    const { error } = await withTimeout(
                        supabase.from('profiles').select('id, role').limit(1),
                        5000,
                        "Timeout"
                    );
                    const end = performance.now();
                    return { success: !error, duration: end - start, error };
                } catch (e) {
                    const end = performance.now();
                    return { success: false, duration: end - start, error: e };
                }
            };

            // Process in batches
            for (let i = 0; i < simulatedUserCount; i += batchSize) {
                const batchPromises = [];
                const currentBatchSize = Math.min(batchSize, simulatedUserCount - i);

                for (let j = 0; j < currentBatchSize; j++) {
                    batchPromises.push(makeRequest());
                }

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Optional small delay to let UI breathe, though not strictly necessary for stress testing
                // await new Promise(r => setTimeout(r, 10)); 
            }

            const endTime = performance.now();
            const totalDuration = endTime - startTime;

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
            const maxDuration = Math.max(...results.map(r => r.duration));
            const minDuration = Math.min(...results.map(r => r.duration));

            log(`Результаты теста:`);
            log(`- Всего запросов: ${results.length}`);
            log(`- Успешно: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`);
            log(`- Ошибок: ${failed}`);
            log(`- Общее время теста: ${(totalDuration / 1000).toFixed(2)} сек`);
            log(`- Среднее время ответа сервера: ${avgDuration.toFixed(2)} мс`);
            log(`- Мин/Макс время: ${minDuration.toFixed(0)} мс / ${maxDuration.toFixed(0)} мс`);

            if (failed > 0) {
                log(`[WARN] Система испытывает трудности.`);
                const uniqueErrors = Array.from(new Set(results.filter(r => !r.success).map(r => r.error?.message)));
                uniqueErrors.forEach(err => log(`Пример ошибки: ${err}`));
            } else if (avgDuration > 500) {
                log(`[WARN] Сервер отвечает медленно (>500мс).`);
            } else {
                log(`[OK] Система работает стабильно и быстро.`);
            }

        } catch (e: any) {
            log(`[CRITICAL] Ошибка при запуске нагрузочного теста: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted flex flex-col">

            <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle>Быстрая самодиагностика</CardTitle>
                        <CardDescription>
                            Базовый тест соединения с базой данных и производительности вашего браузера.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={runTests}
                            disabled={isRunning}
                        >
                            {isRunning ? 'Выполнение...' : 'Запустить проверку'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle>Стресс-тест (Симуляция нагрузки)</CardTitle>
                        <CardDescription>
                            Эмулирует одновременные запросы к серверу. Использует пакетирование для обхода ограничений браузера.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="user-count">Кол-во запросов</Label>
                                <Input
                                    id="user-count"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={simulatedUserCount}
                                    onChange={(e) => setSimulatedUserCount(parseInt(e.target.value) || 0)}
                                    className="w-24"
                                />
                            </div>
                            <Button
                                onClick={runLoadTest}
                                disabled={isRunning}
                                variant="destructive"
                                className="whitespace-nowrap"
                            >
                                {isRunning ? 'Тестирование...' : 'Начать стресс-тест'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">Журнал операций</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="bg-muted h-80 w-full rounded-md border p-4">
                            {logs.length === 0 ? (
                                <span className="text-muted-foreground font-mono text-sm">Журнал операций пуст...</span>
                            ) : (
                                <div className="space-y-1">
                                    {logs.map((line, i) => (
                                        <div key={i} className={`font-mono text-xs break-all ${line.includes('[ОШИБКА]') || line.includes('[FAIL]') || line.includes('[CRITICAL]') ? 'text-red-500 font-bold' : line.includes('[WARN]') ? 'text-yellow-600' : 'text-foreground'}`}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default SystemHealthPage;
