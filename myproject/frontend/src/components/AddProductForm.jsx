import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { Link } from "react-router-dom";

const AddProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Извлекаем токен из куки
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
    } catch (error) {
      console.error("Ошибка:", error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">
          Добавить продукт
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4"
        >
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
            >
              Название
            </label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Название"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
            >
              Описание
            </label>
            <textarea
              name="description"
              id="description"
              placeholder="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="price"
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
            >
              Цена
            </label>
            <input
              type="number"
              name="price"
              id="price"
              placeholder="Цена"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="category"
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
            >
              Категория
            </label>
            <input
              type="text"
              name="category"
              id="category"
              placeholder="Категория"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="image"
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
            >
              Изображение
            </label>
            <input
              type="file"
              name="image"
              id="image"
              onChange={(e) => setImage(e.target.files[0])}
              className="block w-full text-sm text-gray-700 dark:text-gray-300
                         file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                         file:text-sm file:font-semibold file:bg-gray-200 dark:file:bg-gray-700
                         file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Добавить продукт
            </button>
            <Link
              to="/"
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            >
              На главную
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductForm;
