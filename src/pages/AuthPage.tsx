import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Декларация типов для глобального объекта window (для Facebook SDK)
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export default function AuthPage({ isLoginMode = true }: { isLoginMode?: boolean }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login: ctxLogin } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Инициализация Facebook SDK при монтировании
    useEffect(() => {
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
                cookie: true,
                xfbml: true,
                version: 'v16.0' // Вместо v25.0 поставь v16.0 или v12.0
            });
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0] as any;
            if (d.getElementById(id)) return;
            js = d.createElement(s) as any; js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }, []);

    // Обработчик успешного ответа от Google
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message || 'Google authentication failed');

            const token = resData.token || resData.data?.token;
            const user = resData.user || resData.data?.user;

            if (token && user) {
                ctxLogin(token, user);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Помилка авторизації через Google');
        } finally {
            setLoading(false);
        }
    };

    // Логика вызова окна Facebook Login
    const handleFacebookLogin = () => {
        if (!window.FB) {
            console.error("Facebook SDK не загружен");
            return;
        }

        window.FB.login((response: any) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;

                // Отправляем токен на бэкенд
                sendFacebookTokenToBackend(accessToken);
            } else {
                console.log('Пользователь отменил авторизацию или не дал прав.');
            }
        }, {
            scope: 'email,public_profile', // СТРОГО ТАК: свойство scope, строка через запятую
            auth_type: 'rerequest' // Позволяет запросить email повторно, если юзер его убрал
        });
    };

    // Отправка токена Facebook на бэкенд
    const sendFacebookTokenToBackend = async (accessToken: string) => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken }),
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message || 'Facebook authentication failed');

            const token = resData.token || resData.data?.token;
            const user = resData.user || resData.data?.user;

            if (token && user) {
                ctxLogin(token, user);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Помилка авторизації через Facebook');
        } finally {
            setLoading(false);
        }
    };

    // Твой стандартный метод отправки формы (Email + Password)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const bodyData = isLoginMode ? { email, password } : { username, email, password };

        try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
            });

            const resData = await response.json();

            if (!response.ok) {
                throw new Error(resData.message || 'Щось пішло не так');
            }

            const token = resData.token || resData.data?.token;
            const user = resData.user || resData.data?.user;

            if (token && user) {
                ctxLogin(token, user);
                navigate('/');
            } else {
                throw new Error('Бекенд не повернув токен або дані користувача');
            }
        } catch (err: any) {
            setError(err.message || 'Помилка з\'єднання з сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Вставь свой реальный Google Client ID вместо заглушки ниже
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <div className="text-white p-6 w-full max-w-md">
                <div className="bg-[#121212]/90 border border-zinc-800 p-8 rounded-xl w-full shadow-2xl backdrop-blur-lg">
                    <h2 className="text-3xl font-bold text-center mb-8">
                        {isLoginMode ? t('loginToSpotify') : t('register')}
                    </h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {!isLoginMode && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{t('username')}</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#242424] border border-zinc-700 rounded-md p-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                    placeholder="Введіть ваше ім'я"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{t('email')}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#242424] border border-zinc-700 rounded-md p-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                placeholder="name@domain.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{t('password')}</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#242424] border border-zinc-700 rounded-md p-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-500 text-black font-bold p-3 rounded-full hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 mt-4 cursor-pointer"
                        >
                            {loading ? t('loading') : isLoginMode ? t('login') : t('createAccount')}
                        </button>
                    </form>

                    {/* Разделительная линия */}
                    <div className="flex items-center my-6 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                        <div className="flex-1 h-px bg-zinc-800"></div>
                        <span className="px-3">або</span>
                        <div className="flex-1 h-px bg-zinc-800"></div>
                    </div>

                    {/* Блок социальных сетей */}
                    <div className="flex flex-col gap-3 items-center w-full">
                        <div className="w-full flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Помилка ініціалізації Google')}
                                theme="filled_black"
                                shape="circle"
                                width="384px" // Соответствует ширине w-full внутри контейнера
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleFacebookLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-[#1877f2] text-white font-bold p-2.5 rounded-full hover:opacity-90 active:scale-98 transition-all text-sm cursor-pointer"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Продовжити з Facebook
                        </button>
                    </div>

                    <p className="text-sm text-zinc-400 text-center mt-6">
                        {isLoginMode ? t('noAccount') + ' ' : t('haveAccount') + ' '}
                        <Link to={isLoginMode ? '/register' : '/login'} className="text-white underline hover:text-green-400">
                            {isLoginMode ? t('register') : t('login')}
                        </Link>
                    </p>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
}