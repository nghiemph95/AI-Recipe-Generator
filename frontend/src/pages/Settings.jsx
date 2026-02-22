import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, Trash2, Save } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api.js';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'];
const CUISINES = ['Any', 'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Thai', 'French', 'Mediterranean', 'American'];

const Settings = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);

    const [profile, setProfile] = useState({ name: '', email: '' });
    const [preferences, setPreferences] = useState({
        dietary_restrictions: [],
        allergies: [],
        preferred_cuisines: [],
        default_servings: 4,
        measurement_unit: 'metric'
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        Promise.all([
            usersApi.getProfile(),
            usersApi.getPreferences().catch(() => null),
        ]).then(([profileRes, prefsRes]) => {
            const p = profileRes || {};
            setProfile({
                name: p.name ?? user?.name ?? '',
                email: p.email ?? user?.email ?? ''
            });
            if (prefsRes) {
                setPreferences({
                    dietary_restrictions: prefsRes.dietary_restrictions || [],
                    allergies: prefsRes.allergies || [],
                    preferred_cuisines: prefsRes.preferred_cuisines || [],
                    default_servings: prefsRes.default_servings ?? 4,
                    measurement_unit: prefsRes.measurement_unit || 'metric'
                });
            }
        }).catch(() => toast.error(t('settings.failedLoad'))).finally(() => setProfileLoading(false));
    }, [user?.name, user?.email]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await usersApi.updateProfile({ name: profile.name });
            toast.success(t('settings.profileUpdated'));
        } catch (err) {
            toast.error(err.response?.data?.error || t('settings.failedUpdateProfile'));
        } finally {
            setSaving(false);
        }
    };

    const handlePreferencesUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await usersApi.updatePreferences(preferences);
            toast.success(t('settings.preferencesUpdated'));
        } catch {
            toast.error(t('settings.failedUpdatePreferences'));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error(t('settings.passwordsNoMatch'));
            return;
        }
        if (passwordData.newPassword.length < 8) {
            toast.error(t('settings.passwordMinLength'));
            return;
        }
        setSaving(true);
        try {
            await usersApi.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success(t('settings.passwordChanged'));
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || t('settings.failedChangePassword'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t('settings.confirmDeleteAccount'))) return;
        const confirmation = prompt(t('settings.typeDeleteToConfirm'));
        if (confirmation !== 'DELETE') {
            toast.error(t('settings.deletionCancelled'));
            return;
        }
        try {
            await usersApi.deleteAccount();
            toast.success(t('settings.accountDeleted'));
            logout();
            navigate('/login');
        } catch {
            toast.error(t('settings.failedDeleteAccount'));
        }
    };

    const toggleDietary = (option) => {
        setPreferences(prev => ({
            ...prev,
            dietary_restrictions: prev.dietary_restrictions.includes(option)
                ? prev.dietary_restrictions.filter(d => d !== option)
                : [...prev.dietary_restrictions, option]
        }));
    };

    const toggleCuisine = (cuisine) => {
        setPreferences(prev => ({
            ...prev,
            preferred_cuisines: prev.preferred_cuisines.includes(cuisine)
                ? prev.preferred_cuisines.filter(c => c !== cuisine)
                : [...prev.preferred_cuisines, cuisine]
        }));
    };

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
                    <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{t('settings.profile')}</h2>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.name')}</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.email')}</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? t('common.loading') : t('settings.saveProfile')}
                            </button>
                        </form>
                    </div>


                    {/* Change Password Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Lock className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{t('settings.changePassword')}</h2>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.currentPassword')}</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword')}</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Lock className="w-4 h-4" />
                                {saving ? t('settings.changing') : t('settings.changePasswordButton')}
                            </button>
                        </form>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.dietaryPreferences')}</h2>

                        <form onSubmit={handlePreferencesUpdate} className="space-y-6">
                            {/* Dietary Restrictions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings.dietaryRestrictions')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleDietary(option)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preferences.dietary_restrictions.includes(option)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.allergies')}</label>
                                <input
                                    type="text"
                                    value={preferences.allergies.join(', ')}
                                    onChange={(e) => setPreferences({
                                        ...preferences,
                                        allergies: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                                    })}
                                    placeholder={t('settings.allergiesPlaceholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Preferred Cuisines */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings.preferredCuisines')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {CUISINES.map(cuisine => (
                                        <button
                                            key={cuisine}
                                            type="button"
                                            onClick={() => toggleCuisine(cuisine)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preferences.preferred_cuisines.includes(cuisine)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {cuisine}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Default Servings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('settings.defaultServings', { count: preferences.default_servings })}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="12"
                                    value={preferences.default_servings}
                                    onChange={(e) => setPreferences({ ...preferences, default_servings: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1</span>
                                    <span>12</span>
                                </div>
                            </div>

                            {/* Measurement Unit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.measurementUnit')}</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPreferences({ ...preferences, measurement_unit: 'metric' })}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${preferences.measurement_unit === 'metric'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {t('settings.metric')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreferences({ ...preferences, measurement_unit: 'imperial' })}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${preferences.measurement_unit === 'imperial'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {t('settings.imperial')}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? t('common.loading') : t('settings.savePreferences')}
                            </button>
                        </form>
                    </div>


                    {/* Danger Zone */}
                    <div className="bg-white rounded-xl border border-red-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{t('settings.dangerZone')}</h2>
                        </div>

                        <p className="text-gray-600 mb-4">{t('settings.dangerZoneDesc')}</p>

                        <button
                            onClick={handleDeleteAccount}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('settings.deleteAccount')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
