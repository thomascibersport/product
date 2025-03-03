import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const AddProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const measurementUnits = ["шт", "кг", "литр"];

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/categories/")
      .then((response) => {
        setCategories(response.data);
        if (response.data.length > 0) {
          setCategory(response.data[0].id);
        }
      })
      .catch((error) => {
        setFormError("Ошибка загрузки категорий");
        console.error("Ошибка загрузки категорий:", error);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("quantity", quantity);
    formData.append("unit", unit);
    formData.append("category_id", category);
    if (image) formData.append("image", image);

    const token = Cookies.get("token");
    if (!token) {
      setFormError("Требуется авторизация");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/products/create/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Сброс формы
      setName("");
      setDescription("");
      setPrice("");
      setQuantity("");
      setUnit("");
      setCategory(categories[0]?.id || "");
      setImage(null);

      setSuccessMessage("Продукт успешно добавлен!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      if (error.response) {
        if (error.response.data) {
          // Обработка ошибок валидации
          if (error.response.data.errors) {
            setErrors(error.response.data.errors);
          } else {
            setFormError(
              error.response.data.detail || "Ошибка при создании продукта"
            );
          }
        }
      } else {
        setFormError("Ошибка соединения с сервером");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pb-10">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            📦 Добавить новый продукт
          </h1>

          {/* Уведомления */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl animate-fade-in">
              ✅ {successMessage}
            </div>
          )}

          {formError && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl animate-fade-in">
              ❌ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название продукта
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название"
                required
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.name
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  ⚠️ {errors.name}
                </p>
              )}
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Детальное описание продукта"
                rows="3"
                required
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.description
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  ⚠️ {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цена за единицу
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.price
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-20`} // Увеличиваем padding-right
                  />
                  <span className="absolute right-4 top-3.5 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span>₽</span>
                    <span className="text-gray-400">/</span>
                    <span>{unit || "ед."}</span>
                  </span>
                </div>
                {errors.price && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    ⚠️ {errors.price}
                  </p>
                )}
              </div>

              {/* Количество */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Количество на складе
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Введите количество"
                  required
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.quantity
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                  } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                />
                {errors.quantity && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    ⚠️ {errors.quantity}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Единица измерения */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Единица измерения
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.unit
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                  } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800 dark:text-gray-200`} // Добавлен dark:text-gray-200
                >
                  <option
                    value=""
                    disabled
                    className="dark:bg-gray-800 dark:text-gray-200"
                  >
                    Выберите единицу
                  </option>
                  {measurementUnits.map((unitOption, idx) => (
                    <option
                      key={idx}
                      value={unitOption}
                      className="dark:bg-gray-800 dark:text-gray-200" // Добавлен цвет текста
                    >
                      {unitOption}
                    </option>
                  ))}
                </select>
                {/* ... */}
              </div>

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.category
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                  } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800 dark:text-gray-200`} // Добавлен dark:text-gray-200
                >
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      className="dark:bg-gray-800 dark:text-gray-200" // Добавлен цвет текста
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
                {/* ... */}
              </div>
            </div>

            {/* Изображение */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Изображение продукта
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  className={`flex flex-col w-full rounded-lg border-2 border-dashed ${
                    errors.image
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-500"
                  } transition-all cursor-pointer`}
                >
                  <div className="p-6 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {image ? image.name : "Перетащите или выберите файл"}
                    </p>
                  </div>
                  <input
                    type="file"
                    onChange={(e) => setImage(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
              {errors.image && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  ⚠️ {errors.image}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              ➕ Добавить продукт
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductForm;
