import { useState, useRef, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Search,
    User,
    LogOut,
    Settings,
} from "lucide-react";

// TODO: заменить на реального пользователя из AuthContext, когда бэкенд будет готов
interface CurrentUser {
    name: string;
    avatarUrl?: string | null;
}

const mockUser: CurrentUser = {
    name: "Alex",
    avatarUrl: null,
};

export interface NavbarProps {
    onBack?: () => void;
    onForward?: () => void;
    onSearch?: (query: string) => void;
    user?: CurrentUser | null;
    isAuthenticated?: boolean;
    onLoginClick?: () => void;
    onLogoutClick?: () => void;
}

export default function Navbar({
    onBack = () => { },
    onForward = () => { },
    onSearch = () => { },
    user = mockUser,
    isAuthenticated = true,
    onLoginClick = () => { },
    onLogoutClick = () => { },
}: NavbarProps) {
    const [query, setQuery] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // закрытие меню по клику вне его
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    }

    const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-black/80 backdrop-blur-md">
            {/* Left: back/forward */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={onForward}
                    aria-label="Go forward"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Center: search */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={handleSearchChange}
                        placeholder="What do you want to play?"
                        className="w-full bg-neutral-900 text-sm text-white placeholder-neutral-500 rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 transition-shadow"
                    />
                </div>
            </div>

            {/* Right: user */}
            <div className="shrink-0">
                {isAuthenticated ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 transition-colors"
                        >
                            {user?.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-7 h-7 rounded-full object-cover"
                                />
                            ) : (
                                <span className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white">
                                    {initial}
                                </span>
                            )}
                            <span className="hidden sm:block text-sm font-medium text-white truncate max-w-[100px]">
                                {user?.name}
                            </span>
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-md shadow-xl py-1 overflow-hidden">
                                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors text-left">
                                    <User className="w-4 h-4" />
                                    Profile
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors text-left">
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </button>
                                <div className="h-px bg-neutral-700 my-1" />
                                <button
                                    onClick={onLogoutClick}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
                    >
                        Log in
                    </button>
                )}
            </div>
        </header>
    );
}