import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ isLoginMode = true }: { isLoginMode?: boolean }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login: ctxLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(false);

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const bodyData = isLoginMode ? { email, password } : { username, email, password };

        try {
            setLoading(true);
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
        <div className="text-white p-6 w-full max-w-md">
            <div className="bg-[#121212]/90 border border-zinc-800 p-8 rounded-xl w-full shadow-2xl backdrop-blur-lg">
                <h2 className="text-3xl font-bold text-center mb-8">
                    {isLoginMode ? 'Увійти в Spotify' : 'Зареєструватися'}
                </h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-md mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLoginMode && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Ім'я користувача</label>
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
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Email</label>
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
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Пароль</label>
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
                        {loading ? 'Завантаження...' : isLoginMode ? 'Увійти' : 'Створити акаунт'}
                    </button>
                </form>

                <p className="text-sm text-zinc-400 text-center mt-6">
                    {isLoginMode ? 'Немає акаунту? ' : 'Вже маєте акаунт? '}
                    <Link to={isLoginMode ? '/register' : '/login'} className="text-white underline hover:text-green-400">
                        {isLoginMode ? 'Зареєструватися' : 'Увійти'}
                    </Link>
                </p>
            </div>
        </div>
    );
}