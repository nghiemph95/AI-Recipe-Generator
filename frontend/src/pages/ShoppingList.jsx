import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Plus, X, Check, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { shoppingListApi } from '../services/api.js';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Grains', 'Spices', 'Beverages', 'Other'];

const ShoppingList = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [groupedItems, setGroupedItems] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadShoppingList = async () => {
        setLoading(true);
        try {
            const res = await shoppingListApi.getList({ grouped: true });
            const grouped = res?.items ?? [];
            const flat = Array.isArray(grouped)
                ? grouped.flatMap((g) => (g.items || []).map((it) => ({ ...it, category: g.category || it.category || 'Other' })))
                : [];
            setItems(flat);
            const byCat = {};
            (grouped || []).forEach((g) => {
                const cat = g.category || 'Other';
                byCat[cat] = g.items || [];
            });
            setGroupedItems(byCat);
        } catch {
            setItems([]);
            setGroupedItems({});
            toast.error(t('shoppingList.failedLoad'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShoppingList();
    }, []);

    const organizeByCategory = (itemsList) => {
        const grouped = {};
        (itemsList || []).forEach((item) => {
            const category = item.category || 'Other';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(item);
        });
        setGroupedItems(grouped);
        setItems(itemsList || []);
    };

    const handleToggleChecked = async (id) => {
        try {
            const updated = await shoppingListApi.toggleChecked(id);
            const item = updated?.item;
            const next = items.map((i) => (i.id === id ? { ...i, is_checked: item?.is_checked ?? !i.is_checked } : i));
            setItems(next);
            organizeByCategory(next);
        } catch {
            toast.error(t('shoppingList.failedRemove'));
        }
    };

    const handleDeleteItem = async (id) => {
        try {
            await shoppingListApi.deleteItem(id);
            const updatedItems = items.filter((i) => i.id !== id);
            setItems(updatedItems);
            organizeByCategory(updatedItems);
            toast.success(t('shoppingList.itemRemoved'));
        } catch {
            toast.error(t('shoppingList.failedRemove'));
        }
    };

    const handleClearChecked = async () => {
        if (!confirm(t('shoppingList.confirmClearChecked'))) return;
        try {
            await shoppingListApi.clearChecked();
            const updatedItems = items.filter((i) => !i.is_checked);
            setItems(updatedItems);
            organizeByCategory(updatedItems);
            toast.success(t('shoppingList.checkedCleared'));
        } catch {
            toast.error(t('shoppingList.failedClearChecked'));
        }
    };

    const handleAddToPantry = async () => {
        const checkedCount = items.filter((i) => i.is_checked).length;
        if (checkedCount === 0) {
            toast.error(t('shoppingList.noItemsChecked'));
            return;
        }
        if (!confirm(t('shoppingList.confirmAddToPantry', { count: checkedCount }))) return;
        try {
            await shoppingListApi.addCheckedToPantry();
            await loadShoppingList();
            toast.success(t('shoppingList.itemsAddedToPantry'));
        } catch {
            toast.error(t('shoppingList.failedAddToPantry'));
        }
    };

    const handleGenerateFromMealPlan = async () => {
        const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
        const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');
        try {
            await shoppingListApi.generateFromMealPlan({ startDate: start, endDate: end });
            await loadShoppingList();
            toast.success(t('shoppingList.generatedFromMealPlan'));
        } catch {
            toast.error(t('shoppingList.failedGenerate'));
        }
    };

    const checkedCount = items.filter((i) => i.is_checked).length;
    const totalCount = items.length;

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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">{t('shoppingList.title')}</h1>
                    <p className="text-gray-600 mt-1">
                        {totalCount > 0 ? t('shoppingList.subtitle', { checked: checkedCount, total: totalCount }) : t('shoppingList.subtitleEmpty')}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            {t('shoppingList.addItem')}
                        </button>
                    <button
                        onClick={handleGenerateFromMealPlan}
                        className="flex items-center gap-2 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        {t('shoppingList.generateFromMealPlan')}
                    </button>
                        {checkedCount > 0 && (
                            <>
                                <button
                                    onClick={handleAddToPantry}
                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {t('shoppingList.addToPantry', { count: checkedCount })}
                                </button>
                                <button
                                    onClick={handleClearChecked}
                                    className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    {t('shoppingList.clearChecked')}
                                </button>
                            </>
                        )}
                    </div>

                {/* Shopping List */}
                {totalCount > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedItems || {}).map(([category, categoryItems]) => (
                            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <h2 className="font-semibold text-gray-900">{category}</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {categoryItems.map(item => (
                                        <ShoppingListItem
                                            key={item.id}
                                            item={item}
                                            onToggle={handleToggleChecked}
                                            onDelete={handleDeleteItem}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">{t('shoppingList.empty')}</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            {t('shoppingList.addFirstItem')}
                        </button>
                    </div>
                )}
            </div>

            {/* Add Item Modal */}
            {showAddModal && (
                <AddItemModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        loadShoppingList();
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
};

const ShoppingListItem = ({ item, onToggle, onDelete }) => {
    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
            <button
                onClick={() => onToggle(item.id)}
                className="shrink-0"
            >
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${item.is_checked
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-300 hover:border-emerald-500'
                    }`}>
                    {item.is_checked && <Check className="w-4 h-4 text-white" />}
                </div>
            </button>

            <div className="flex-1 min-w-0">
                <p className={`font-medium ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {item.ingredient_name}
                </p>
                <p className={`text-sm ${item.is_checked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.quantity} {item.unit}
                    {item.from_meal_plan && (
                        <span className="ml-2 text-xs text-emerald-600">• From meal plan</span>
                    )}
                </p>
            </div>

            <button
                onClick={() => onDelete(item.id)}
                className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

const AddItemModal = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        ingredient_name: '',
        quantity: '',
        unit: 'pieces',
        category: 'Other'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await shoppingListApi.addItem({
                ingredient_name: formData.ingredient_name,
                quantity: parseFloat(formData.quantity) || 0,
                unit: formData.unit,
                category: formData.category,
            });
            toast.success(t('shoppingList.itemAdded'));
            onSuccess();
            onClose();
        } catch {
            toast.error(t('shoppingList.failedAdd'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{t('shoppingList.addItemTitle')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('shoppingList.itemName')}</label>
                        <input
                            type="text"
                            value={formData.ingredient_name}
                            onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('shoppingList.quantity')}</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('shoppingList.unit')}</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('shoppingList.category')}</label>
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
                            {loading ? t('common.adding') : t('shoppingList.addItem')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShoppingList;
