import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X, Calendar, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pantryApi } from '../services/api.js';

const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Meat', 'Grains', 'Spices', 'Other'];

const Pantry = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expiringItems, setExpiringItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [listRes, expiringRes] = await Promise.all([
                pantryApi.getItems({}),
                pantryApi.getExpiringSoon({ days: 7 }),
            ]);
            setItems(listRes?.items ?? []);
            setExpiringItems(expiringRes?.items ?? []);
        } catch {
            setItems([]);
            setExpiringItems([]);
            toast.error(t('pantry.failedLoad'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterItems();
    }, [items, searchQuery, selectedCategory]);

    const filterItems = () => {
        let filtered = items;

        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        setFilteredItems(filtered);
    };

    const handleDelete = async (id) => {
        if (!confirm(t('pantry.confirmDelete'))) return;
        try {
            await pantryApi.deleteItem(id);
            setItems(items.filter(item => item.id !== id));
            setExpiringItems(expiringItems.filter(item => item.id !== id));
            toast.success(t('pantry.itemDeleted'));
        } catch {
            toast.error(t('pantry.failedDelete'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('pantry.title')}</h1>
                        <p className="text-gray-600 mt-1">{t('pantry.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        {t('pantry.addItem')}
                    </button>
                </div>

                {/* Expiring Soon Alert */}
                {expiringItems.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-amber-900">{t('pantry.expiringSoon')}</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    {t('pantry.expiringWithin', { count: expiringItems.length })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('pantry.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                            <CategoryButton
                                label={t('common.all')}
                                active={selectedCategory === 'All'}
                                onClick={() => setSelectedCategory('All')}
                            />
                            {CATEGORIES.map(category => (
                                <CategoryButton
                                    key={category}
                                    label={category}
                                    active={selectedCategory === category}
                                    onClick={() => setSelectedCategory(category)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Items Grid */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(item => (
                            <PantryItemCard
                                key={item.id}
                                item={item}
                                onDelete={handleDelete}
                                isExpiring={expiringItems.some(exp => exp.id === item.id)}
                                t={t}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <p className="text-gray-500">{t('pantry.noItems')}</p>
                    </div>
                )}
            </div>

            {/* Add Item Modal */}
            {showAddModal && (
                <AddItemModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

const CategoryButton = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${active
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
    >
        {label}
    </button>
);

const PantryItemCard = ({ item, onDelete, isExpiring, t }) => {
    const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();

    return (
        <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${isExpiring ? 'border-amber-300' : 'border-gray-200'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                </div>
                <button
                    onClick={() => onDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('pantry.quantity')}:</span>
                    <span className="font-medium text-gray-900">
                        {item.quantity} {item.unit}
                    </span>
                </div>

                {item.expiry_date && (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`${isExpired ? 'text-red-600 font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>
                            {isExpired ? 'Expired' : 'Expires'}: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                        </span>
                    </div>
                )}

                {item.is_running_low && (
                    <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                        {t('pantry.runningLow')}
                    </span>
                )}
            </div>
        </div>
    );
};

const AddItemModal = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        unit: 'pieces',
        category: 'Other',
        expiry_date: '',
        is_running_low: false
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await pantryApi.addItem({
                name: formData.name,
                quantity: parseFloat(formData.quantity) || 0,
                unit: formData.unit,
                category: formData.category,
                expiry_date: formData.expiry_date || undefined,
                is_running_low: formData.is_running_low,
            });
            toast.success(t('pantry.itemAdded'));
            onSuccess();
            onClose();
        } catch {
            toast.error(t('pantry.failedAdd'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{t('pantry.addItemTitle')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('pantry.name')}</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('pantry.quantity')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('pantry.unit')}</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="pieces">Pieces</option>
                                <option value="kg">Kilograms</option>
                                <option value="g">Grams</option>
                                <option value="l">Liters</option>
                                <option value="ml">Milliliters</option>
                                <option value="cups">Cups</option>
                                <option value="tbsp">Tablespoons</option>
                                <option value="tsp">Teaspoons</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('pantry.category')}</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('pantry.expiryDateOptional')}</label>
                        <input
                            type="date"
                            value={formData.expiry_date}
                            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="running-low"
                            checked={formData.is_running_low}
                            onChange={(e) => setFormData({ ...formData, is_running_low: e.target.checked })}
                            className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="running-low" className="text-sm text-gray-700">
                            Mark as running low
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? t('common.adding') : t('pantry.addItem')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Pantry;
