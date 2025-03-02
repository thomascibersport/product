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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-10">
      <Header />
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded mt-6 mb-32">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Добавить продукт
        </h1>

        {/* Уведомления */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Название */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Название
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название продукта"
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.name ? "border-red-500" : "focus:border-blue-500"
              }`}
            />
            {errors.name && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.name}
              </span>
            )}
          </div>

          {/* Описание */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Описание
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание продукта"
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.description ? "border-red-500" : "focus:border-blue-500"
              }`}
            />
            {errors.description && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.description}
              </span>
            )}
          </div>

          {/* Цена */}
          <div className="mb-4">
            <label
              htmlFor="price"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Цена за 1 {unit ? unit : "..."}
            </label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Введите цену"
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.price ? "border-red-500" : "focus:border-blue-500"
              }`}
            />
            {errors.price && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.price}
              </span>
            )}
          </div>

          {/* Количество */}
          <div className="mb-4">
            <label
              htmlFor="quantity"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Количество
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Введите количество"
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.quantity ? "border-red-500" : "focus:border-blue-500"
              }`}
            />
            {errors.quantity && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.quantity}
              </span>
            )}
          </div>

          {/* Единица измерения */}
          <div className="mb-4">
            <label
              htmlFor="unit"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Единица измерения
            </label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.unit ? "border-red-500" : "focus:border-blue-500"
              }`}
            >
              <option value="" disabled>
                Выберите единицу измерения
              </option>
              {measurementUnits.map((unitOption, idx) => (
                <option key={idx} value={unitOption}>
                  {unitOption}
                </option>
              ))}
            </select>
            {errors.unit && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.unit}
              </span>
            )}
          </div>

          {/* Категория */}
          <div className="mb-4">
            <label
              htmlFor="category"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Категория
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none ${
                errors.category ? "border-red-500" : "focus:border-blue-500"
              }`}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.category}
              </span>
            )}
          </div>

          {/* Изображение */}
          <div className="mb-6">
            <label
              htmlFor="image"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Изображение
            </label>
            <input
              type="file"
              id="image"
              onChange={(e) => setImage(e.target.files[0])}
              className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {errors.image && (
              <span className="text-red-500 text-sm mt-1 block">
                {errors.image}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:shadow-outline"
          >
            Добавить продукт
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProductForm;
