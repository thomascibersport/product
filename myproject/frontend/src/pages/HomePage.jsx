import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState(""); // Added for sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12);
  const [categories, setCategories] = useState([]);

  // Function to truncate text to a specific length
  const truncateText = (text, maxLength = 18) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    // Fetch categories
    axios
      .get("http://localhost:8000/api/categories/", config)
      .then((response) => {
        setCategories(response.data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки категорий:", err);
      });

    // Fetch products
    axios
      .get("http://localhost:8000/api/products/", config)
      .then((response) => {
        setProducts(response.data);
        setFilteredProducts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(
        (product) => product.category?.id === parseInt(categoryFilter)
      );
    }

    // Filter by delivery
    if (deliveryFilter) {
      filtered = filtered.filter((product) => product.delivery_available);
    }

    // Filter by minimum rating
    if (minRating > 0) {
      filtered = filtered.filter(
        (product) => (product.farmer?.average_rating ?? 0) >= minRating
      );
    }

    // Filter by price range
    if (minPrice) {
      filtered = filtered.filter(
        (product) => product.price >= parseFloat(minPrice)
      );
    }
    if (maxPrice) {
      filtered = filtered.filter(
        (product) => product.price <= parseFloat(maxPrice)
      );
    }

    // Sorting
    if (sortOption === "priceAsc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "priceDesc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "ratingDesc") {
      filtered.sort(
        (a, b) =>
          (b.farmer?.average_rating ?? 0) - (a.farmer?.average_rating ?? 0)
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [
    searchTerm,
    categoryFilter,
    deliveryFilter,
    minRating,
    minPrice,
    maxPrice,
    sortOption,
    products,
  ]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          🛍️ Все товары
        </h1>

        {/* Filters and Search */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Поле поиска */}
            <input
              type="text"
              placeholder="Поиск по названию"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
            />
            {/* Выбор категории */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {/* Чекбокс доставки */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-gray-700 dark:text-white">
                Только с доставкой
              </span>
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Минимальная цена */}
            <input
              type="number"
              placeholder="Мин. цена"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
            />
            {/* Максимальная цена */}
            <input
              type="number"
              placeholder="Макс. цена"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
            />
            {/* Минимальный рейтинг */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseInt(e.target.value))}
              className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            >
              <option value="0">Любой рейтинг</option>
              <option value="1">1+ звезда</option>
              <option value="2">2+ звезды</option>
              <option value="3">3+ звезды</option>
              <option value="4">4+ звезды</option>
              <option value="5">5 звезд</option>
            </select>
            {/* Сортировка */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            >
              <option value="">Сортировка</option>
              <option value="priceAsc">Цена: по возрастанию</option>
              <option value="priceDesc">Цена: по убыванию</option>
              <option value="ratingDesc">Рейтинг: по убыванию</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="inline-block bg-red-100 dark:bg-red-900/20 p-8 rounded-2xl shadow-xl">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-xl text-red-600 dark:text-red-400">
                Ошибка загрузки: {error}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-contain transform transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-xl">
                        <span className="text-gray-400">
                          🖼️ Нет изображения
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 truncate">
                    {product.name}
                  </h2>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full text-sm">
                        {product.category
                          ? product.category.name
                          : "Без категории"}
                      </span>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {product.price} ₽
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                        {truncateText(product.farmer_name || "Неизвестный продавец")}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Рейтинг:{" "}
                        {(product.farmer?.average_rating || 0).toFixed(1)} ⭐
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              {Array.from(
                {
                  length: Math.ceil(filteredProducts.length / productsPerPage),
                },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
