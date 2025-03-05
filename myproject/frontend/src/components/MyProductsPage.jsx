import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

const AddProductModal = React.memo(
  ({
    isOpen,
    onClose,
    onSubmit,
    formState,
    formErrors,
    successMessage,
    formError,
    categories,
    measurementUnits,
  }) => {
    const [localState, setLocalState] = useState(formState);
    const [imagePreview, setImagePreview] = useState(null);
    const modalRef = useRef(null);

    // Все хуки вызываются в начале
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, onClose]);

    useEffect(() => {
      setLocalState(formState);
    }, [formState]);

    const handleChange = useCallback((field, value) => {
      setLocalState((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleFileChange = useCallback(
      (e) => {
        const file = e.target.files[0];
        if (file) {
          handleChange("image", file);
          setImagePreview(URL.createObjectURL(file));
        }
      },
      [handleChange]
    );

    const handleSubmitForm = useCallback(
      (e) => {
        e.preventDefault();
        onSubmit(localState);
      },
      [localState, onSubmit]
    );

    // Условный рендеринг после ВСЕХ хуков
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  📦 Добавить новый продукт
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

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

              <form onSubmit={handleSubmitForm} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:!text-gray-300 mb-2">
                    Название продукта
                  </label>
                  <input
                    type="text"
                    value={localState.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Введите название"
                    required
                    autoFocus
                    className={`w-full px-4 py-3 rounded-lg border-2 text-gray-900 dark:text-gray-200 ${
                      formErrors.name
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                  />
                  {formErrors.name && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={localState.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    placeholder="Детальное описание продукта"
                    rows="3"
                    required
                    className={`w-full px-4 py-3 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                      formErrors.description
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                  />
                  {formErrors.description && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {formErrors.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Цена за единицу
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={localState.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d*$/.test(value))
                            handleChange("price", value);
                        }}
                        placeholder="0.00"
                        required
                        className={`w-full px-4 py-3 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                          formErrors.price
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                        } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-24`}
                      />
                      <span className="absolute right-4 top-3.5 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span>₽</span>
                        <span className="text-gray-400">/</span>
                        <span>{localState.unit || "ед."}</span>
                      </span>
                    </div>
                    {formErrors.price && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        ⚠️ {formErrors.price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Количество на складе
                    </label>
                    <input
                      type="text"
                      value={localState.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value))
                          handleChange("quantity", value);
                      }}
                      placeholder="Введите количество"
                      required
                      className={`w-full px-4 py-3 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                        formErrors.quantity
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                      } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                    />
                    {formErrors.quantity && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        ⚠️ {formErrors.quantity}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Единица измерения
                    </label>
                    <select
                      value={localState.unit}
                      onChange={(e) => handleChange("unit", e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                        formErrors.unit
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                      } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800`}
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
                          className="dark:bg-gray-800 dark:text-gray-200"
                        >
                          {unitOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Категория
                    </label>
                    <select
                      value={localState.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                        formErrors.category
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                      } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800`}
                    >
                      {categories.map((cat) => (
                        <option
                          key={cat.id}
                          value={cat.id}
                          className="dark:bg-gray-800 dark:text-gray-200"
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Изображение продукта
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label
                      className={`flex flex-col w-full rounded-lg border-2 border-dashed ${
                        formErrors.image
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-500"
                      } transition-all cursor-pointer`}
                    >
                      <div className="p-6 text-center">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mx-auto h-48 object-cover rounded-lg"
                          />
                        ) : (
                          <>
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                            >
                              <path
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              />
                            </svg>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {localState.image
                                ? localState.image.name
                                : "Перетащите или выберите файл"}
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                      />
                    </label>
                  </div>
                  {formErrors.image && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {formErrors.image}
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
      </div>
    );
  }
);

const MyProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    unit: "",
    category: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");

  const measurementUnits = ["шт", "кг", "литр"];

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get("http://localhost:8000/api/my-products/", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setProducts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    axios
      .get("http://localhost:8000/api/categories/")
      .then((response) => {
        setCategories(response.data);
        if (response.data.length > 0) {
          setFormState((prev) => ({ ...prev, category: response.data[0].id }));
        }
      })
      .catch(console.error);
  }, [navigate]);

  const handleSubmit = useCallback(
    async (formData) => {
      setFormErrors({});
      setFormError("");
      setSuccessMessage("");

      const token = Cookies.get("token");
      if (!token) {
        setFormError("Требуется авторизация");
        return;
      }

      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          data.append(key, value);
        }
      });

      try {
        await axios.post("http://localhost:8000/api/products/create/", data, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await axios.get(
          "http://localhost:8000/api/my-products/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProducts(response.data);

        setFormState({
          name: "",
          description: "",
          price: "",
          quantity: "",
          unit: "",
          category: categories[0]?.id || "",
          image: null,
        });
        setIsModalOpen(false);
        setSuccessMessage("Продукт успешно добавлен!");
      } catch (error) {
        if (error.response?.data?.errors) {
          setFormErrors(error.response.data.errors);
        } else {
          setFormError(
            error.response?.data?.detail || "Ошибка при создании продукта"
          );
        }
      }
    },
    [categories]
  );

  const handleDelete = useCallback((productId) => {
    const token = Cookies.get("token");
    axios
      .delete(`http://localhost:8000/api/products/${productId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-200 dark:[color-scheme:dark]">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            🛒 Мои объявления
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            + Добавить товар
          </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    У вас пока нет объявлений
                  </p>
                </div>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-xl">
                        <span className="text-gray-400">
                          🖼️ Нет изображения
                        </span>
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {product.name}
                  </h2>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm line-clamp-3">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full text-sm">
                      {product.category?.name || "Без категории"}
                    </span>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {product.price} ₽
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        В наличии: {product.quantity} {product.unit}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <AddProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          formState={formState}
          formErrors={formErrors}
          successMessage={successMessage}
          formError={formError}
          categories={categories}
          measurementUnits={measurementUnits}
        />
      </div>
    </div>
  );
};

export default MyProductsPage;
