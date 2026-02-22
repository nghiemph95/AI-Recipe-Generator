import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Home, UtensilsCrossed, Calendar, ShoppingCart, Settings, LogOut } from 'lucide-react';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en');
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-gray-900 shrink-0">
                        <ChefHat className="w-7 h-7 text-emerald-500" />
                        <span className="whitespace-nowrap">{t('common.appName')}</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1 flex-nowrap">
                        <NavLink to="/dashboard" icon={<Home className="w-4 h-4" />} label={t('nav.dashboard')} />
                        <NavLink to="/pantry" icon={<UtensilsCrossed className="w-4 h-4" />} label={t('nav.pantry')} />
                        <NavLink to="/generate" icon={<ChefHat className="w-4 h-4" />} label={t('nav.generate')} />
                        <NavLink to="/recipes" icon={<UtensilsCrossed className="w-4 h-4" />} label={t('nav.recipes')} />
                        <NavLink to="/meal-plan" icon={<Calendar className="w-4 h-4" />} label={t('nav.mealPlan')} />
                        <NavLink to="/shopping-list" icon={<ShoppingCart className="w-4 h-4" />} label={t('nav.shopping')} />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className="px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t('common.language')}
                        >
                            {i18n.language === 'en' ? 'EN' : 'VI'}
                        </button>
                        <Link
                            to="/settings"
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">{t('common.logout')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ to, icon, label }) => {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
        >
            {icon}
            <span className="whitespace-nowrap">{label}</span>
        </Link>
    );
};

export default Navbar;
