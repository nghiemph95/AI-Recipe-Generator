import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { ChefHat, UtensilsCrossed, Calendar, Clock } from "lucide-react";
import { recipesApi, pantryApi, mealPlansApi } from "../services/api.js";

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalRecipes: 0,
    pantryItems: 0,
    mealsThisWeek: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [upcomingMeals, setUpcomingMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [recipeRes, pantryRes, mealRes, recentRes, upcomingRes] = await Promise.all([
          recipesApi.getStats(),
          pantryApi.getStats(),
          mealPlansApi.getStats(),
          recipesApi.getRecent({ limit: 5 }),
          mealPlansApi.getUpcoming({ limit: 5 }),
        ]);
        if (cancelled) return;
        setStats({
          totalRecipes: recipeRes?.stats?.total_recipes ?? 0,
          pantryItems: pantryRes?.stats?.total_items ?? 0,
          mealsThisWeek: mealRes?.stats?.this_week_count ?? 0,
        });
        setRecentRecipes(recentRes?.recipes ?? []);
        setUpcomingMeals(upcomingRes?.meals ?? []);
      } catch {
        if (!cancelled) {
          setRecentRecipes([]);
          setUpcomingMeals([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<ChefHat className="w-6 h-6" />}
            label={t('dashboard.totalRecipes')}
            value={stats.totalRecipes}
            color="emerald"
          />
          <StatCard
            icon={<UtensilsCrossed className="w-6 h-6" />}
            label={t('dashboard.pantryItems')}
            value={stats.pantryItems}
            color="blue"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            label={t('dashboard.mealsThisWeek')}
            value={stats.mealsThisWeek}
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/generate"
            className="bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-500 p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('dashboard.generateRecipe')}</h3>
                <p className="text-emerald-800 text-sm">{t('dashboard.generateRecipeDesc')}</p>
              </div>
            </div>
          </Link>

          <Link
            to="/pantry"
            className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{t('dashboard.managePantry')}</h3>
                <p className="text-gray-600 text-sm">{t('dashboard.managePantryDesc')}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Recipes & Upcoming Meals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Recipes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentRecipes')}</h2>
              <Link
                to="/recipes"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {t('common.viewAll')}
              </Link>
            </div>

            {recentRecipes.length > 0 ? (
              <div className="space-y-3">
                {recentRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {recipe.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.cook_time} mins
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('dashboard.noRecipesYet')}</p>
            )}
          </div>

          {/* Upcoming Meals */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.upcomingMeals')}</h2>
              <Link
                to="/meal-plan"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {t('dashboard.viewCalendar')}
              </Link>
            </div>

            {upcomingMeals.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {meal.recipe_name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {meal.meal_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('dashboard.noMealsPlanned')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
