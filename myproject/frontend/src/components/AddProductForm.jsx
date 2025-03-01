import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const AddProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(""); // Количество товара
  const [unit, setUnit] = useState("");         // Единица измерения
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [categories, setCategories] = useState([]);

  // Предопределённые единицы измерения
  const measurementUnits = ["шт", "кг", "л"];

  // Получаем категории из базы данных
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
        console.error("Ошибка загрузки категорий:", error);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("quantity", quantity); // Передаём количество товара
    formData.append("unit", unit);         // Передаём единицу измерения
    formData.append("category", category);
    if (image) {
      formData.append("image", image);
    }

    const token = Cookies.get("token");
    if (!token) {
      console.error("Токен отсутствует, авторизуйтесь");
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
      console.log("Продукт создан:", response.data);
      // Здесь можно добавить уведомление или сброс формы после успешной отправки
    } catch (error) {
      console.error("Ошибка:", error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-10">
      <Header />
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded mt-6 mb-32">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Добавить продукт
        </h1>
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
              name="name"
              id="name"
              placeholder="Введите название продукта"
              value={name}
              onChange={(e) => setName(e.target.value)}
              pattern="[A-Za-zА-Яа-яЁё\s]+"
              title="Название может содержать только буквы и пробелы"
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline"
            />
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
              name="description"
              id="description"
              placeholder="Введите описание продукта"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Цена */}
          <div className="mb-4">
            <label
              htmlFor="price"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Цена
            </label>
            <input
              type="number"
              name="price"
              id="price"
              placeholder="Введите цену продукта"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Количество */}
          <div className="mb-4">
            <label
              htmlFor="quantity"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Количество товара
            </label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              placeholder="Введите количество"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline"
            />
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
              name="unit"
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline bg-white"
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
              name="category"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:shadow-outline bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
              name="image"
              id="image"
              onChange={(e) => setImage(e.target.files[0])}
              className="w-full text-gray-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Добавить продукт
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProductForm;
