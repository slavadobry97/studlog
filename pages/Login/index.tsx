
import React, { useState } from 'react';
import Logo from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface LoginPageProps {
  onNavigateToStudentRequest?: () => void;
}


const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToStudentRequest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Вход в систему...');
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setProgress(0);
    setLoadingMessage('Подключение к серверу...');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Stop at 90% until actual completion
        return prev + Math.random() * 15; // Random increment for realistic feel
      });
    }, 300);

    // Update messages at different stages
    const messageTimer1 = setTimeout(() => {
      setLoadingMessage('Проверка учетных данных...');
    }, 1000);

    const messageTimer2 = setTimeout(() => {
      setLoadingMessage('Пробуждение сервера...');
    }, 3000);

    const messageTimer3 = setTimeout(() => {
      setLoadingMessage('Загрузка данных профиля...');
    }, 8000);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      clearInterval(progressInterval);
      clearTimeout(messageTimer1);
      clearTimeout(messageTimer2);
      clearTimeout(messageTimer3);

      if (error) {
        setProgress(0);
        setIsLoading(false);
        if (error.message === 'Invalid login credentials') {
          setError('Неверный логин или пароль');
        } else {
          setError(error.message);
        }
      } else {
        // Complete the progress
        setProgress(100);
        setLoadingMessage('Успешно!');
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    } catch (err) {
      clearInterval(progressInterval);
      clearTimeout(messageTimer1);
      clearTimeout(messageTimer2);
      clearTimeout(messageTimer3);
      setProgress(0);
      setIsLoading(false);
      setError('Произошла ошибка при входе');
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo className="mx-auto h-auto w-48 mb-6" />
          <h1 className="text-3xl font-bold text-brand-blue tracking-tight">Электронный журнал посещаемости</h1>
          {/* <p className="text-muted-foreground mt-2">Войдите в свою учетную запись</p> */}
        </div>

        <Card className="shadow-2xs">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Вход</CardTitle>
            <CardDescription>Введите ваш email и пароль для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@rgsu.net"
                  required
                  disabled={isLoading}
                  className="shadow-2xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pr-10 shadow-2xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword
                      ? <IconEyeOff className="h-4 w-4 text-muted-foreground" />
                      : <IconEye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Загрузка...
                  </>
                ) : 'Войти'}
              </Button>
            </form>

            {/* Progress Bar */}
            {isLoading && (
              <div className="mt-6 space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{loadingMessage}</p>
                  <p className="text-xs text-muted-foreground mt-1">Пожалуйста, подождите...</p>
                </div>

                <div className="space-y-2">
                  <Progress value={Math.min(progress, 100)} className="h-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Прогресс</span>
                    <span className="text-sm font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
                  </div>
                </div>

                <p className="text-[10px] text-center text-muted-foreground italic">
                  При первом входе сервер может просыпаться до 30 секунд
                </p>
              </div>
            )}

            {!isLoading && onNavigateToStudentRequest && (
              <div className="mt-6 text-center border-t pt-6">
                <p className="text-sm text-muted-foreground mb-3">Я студент</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNavigateToStudentRequest}
                  className="w-full shadow-2xs"
                >
                  Подать заявку на отсутствие
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
