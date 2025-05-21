import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadYandexMapsApi } from "../utils/yandexMaps";

const AddProductModal = React.memo(
  ({
    isOpen,
    onClose,
    onSubmit,
    formState,
    formErrors,
    categories,
    measurementUnits,
    isEditing = false,
    imagePreview,
  }) => {
    const [localState, setLocalState] = useState(formState);
    const [localImagePreview, setLocalImagePreview] = useState(imagePreview);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [localFormErrors, setLocalFormErrors] = useState({});
    const modalRef = useRef(null);
    const addressInputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const [yandexMapsLoaded, setYandexMapsLoaded] = useState(false);

    // Prevent body scrolling when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
      
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, [isOpen]);

    // Load Yandex Maps API using the shared utility
    useEffect(() => {
      if (isOpen) {
        loadYandexMapsApi()
          .then(() => {
            setYandexMapsLoaded(true);
          })
          .catch(error => {
            console.error('Failed to load Yandex Maps API:', error);
          });
      }
    }, [isOpen]);

    useEffect(() => {
      setLocalState(formState);
      setLocalImagePreview(imagePreview);
      setIsAddressSelected(!!formState.id); // If editing, consider address as selected
      setLocalFormErrors(formErrors); // Update local errors when formErrors prop changes
    }, [formState, imagePreview, formErrors]);

    // Close suggestions dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          addressInputRef.current && 
          !addressInputRef.current.contains(event.target) &&
          suggestionsRef.current && 
          !suggestionsRef.current.contains(event.target)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const handleChange = useCallback((field, value) => {
      setLocalState((prev) => ({ ...prev, [field]: value }));
    }, []);

    const fetchAddressSuggestions = useCallback(async (query) => {
      if (!query || query.length < 3 || !yandexMapsLoaded) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await axios.get(
          `https://geocode-maps.yandex.ru/1.x/`, {
            params: {
              apikey: 'f2749db0-14ee-4f82-b043-5bb8082c4aa9',
              format: 'json',
              geocode: query,
              results: 5
            }
          }
        );

        const features = response.data.response.GeoObjectCollection.featureMember;
        const suggestions = features.map(feature => feature.GeoObject.metaDataProperty.GeocoderMetaData.text);
        
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      }
    }, [yandexMapsLoaded]);

    const handleAddressChange = useCallback((e) => {
      const value = e.target.value;
      handleChange("seller_address", value);
      fetchAddressSuggestions(value);
      setIsAddressSelected(false); // Reset flag when user types
    }, [handleChange, fetchAddressSuggestions]);

    const selectAddress = useCallback((address) => {
      handleChange("seller_address", address);
      setShowSuggestions(false);
      setIsAddressSelected(true); // Set flag when address is selected from dropdown
    }, [handleChange]);

    const handleFileChange = useCallback(
      (e) => {
        const file = e.target.files[0];
        if (file) {
          handleChange("image", file);
          setLocalImagePreview(URL.createObjectURL(file));
        }
      },
      [handleChange]
    );

    const handleSubmitForm = useCallback(
      (e) => {
        e.preventDefault();
        
        // Validate that address was selected from dropdown
        if (!isAddressSelected && localState.seller_address.trim() !== '') {
          setLocalFormErrors(prev => ({
            ...prev, 
            seller_address: "Пожалуйста, выберите адрес из выпадающего списка"
          }));
          return;
        }
        
        onSubmit(localState);
      },
      [localState, onSubmit, isAddressSelected]
    );

    const handleOverlayClick = useCallback(
      (e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      [onClose]
    );

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto"
        onClick={handleOverlayClick}
        style={{ minHeight: '100vh' }}
      >
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8"
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
        >
          <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {isEditing
                  ? "✏️ Редактировать продукт"
                  : "📦 Добавить новый продукт"}
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

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
                    Название продукта
                  </label>
                  <input
                    type="text"
                    value={localState.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Введите название"
                    required
                    autoFocus
                    className={`w-full px-3 py-2 rounded-lg border-2 text-gray-900 dark:text-gray-200 ${
                      localFormErrors.name
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                  />
                  {localFormErrors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {localFormErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Цена за единицу
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={localState.price}
                      onChange={(e) => {
                        if (/^\d*\.?\d*$/.test(e.target.value))
                          handleChange("price", e.target.value);
                      }}
                      placeholder="0.00"
                      required
                      className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                        localFormErrors.price
                          ? "border-red-500"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                      } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-16`}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      ₽ / {localState.unit || "ед."}
                    </span>
                  </div>
                  {localFormErrors.price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {localFormErrors.price}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  Описание
                </label>
                <textarea
                  value={localState.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Детальное описание продукта"
                  rows="2"
                  required
                  className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                    localFormErrors.description
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                  } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                />
                {localFormErrors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    ⚠️ {localFormErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Количество на складе
                  </label>
                  <input
                    type="text"
                    value={localState.quantity}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value))
                        handleChange("quantity", e.target.value);
                    }}
                    placeholder="Введите количество"
                    required
                    className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                      localFormErrors.quantity
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                  />
                  {localFormErrors.quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {localFormErrors.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Единица измерения
                  </label>
                  <select
                    value={localState.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                      localFormErrors.unit
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800`}
                  >
                    <option value="" disabled>
                      Выберите единицу
                    </option>
                    {measurementUnits.map((unitOption, idx) => (
                      <option key={idx} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Категория
                  </label>
                  <select
                    value={localState.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                      localFormErrors.category
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                    } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all bg-white dark:bg-gray-800`}
                  >
                    <option value="" disabled>
                      Выберите категорию
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Адрес продавца
                  </label>
                  <div className="relative">
                    <input
                      ref={addressInputRef}
                      type="text"
                      value={localState.seller_address}
                      onChange={handleAddressChange}
                      onFocus={() => localState.seller_address.length >= 3 && setShowSuggestions(true)}
                      placeholder="Введите адрес пункта выдачи"
                      className={`w-full px-3 py-2 rounded-lg border-2 text-gray-800 dark:text-gray-200 ${
                        localFormErrors.seller_address || (!isAddressSelected && localState.seller_address.trim() !== '')
                          ? "border-red-500"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-500"
                      } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all`}
                    />
                    {!isAddressSelected && localState.seller_address.trim() !== '' && (
                      <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Выберите адрес из предложенных вариантов
                      </p>
                    )}
                    {localFormErrors.seller_address && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        ⚠️ {localFormErrors.seller_address}
                      </p>
                    )}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div 
                        ref={suggestionsRef}
                        className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 max-h-60 overflow-auto"
                      >
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                            onClick={() => selectAddress(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formErrors.seller_address && !localFormErrors.seller_address && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      ⚠️ {formErrors.seller_address}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  Изображение продукта
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    className={`flex flex-col w-full rounded-lg border-2 border-dashed ${
                      localFormErrors.image
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-500"
                    } transition-all cursor-pointer`}
                  >
                    <div className="p-4 text-center">
                      {localImagePreview ? (
                        <img
                          src={localImagePreview}
                          alt="Preview"
                          className="mx-auto h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <svg
                            className="mx-auto h-10 w-10 text-gray-400"
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
                            Перетащите или выберите файл
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
                {localFormErrors.image && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    ⚠️ {localFormErrors.image}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localState.delivery_available}
                  onChange={(e) =>
                    handleChange("delivery_available", e.target.checked)
                  }
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 transition-all"
                  id="deliveryCheckbox"
                />
                <label
                  htmlFor="deliveryCheckbox"
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Доступна доставка
                </label>
              </div>
              {!localState.delivery_available && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  При отключенной доставке покупатели будут забирать товар по
                  указанному адресу
                </p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all transform hover:scale-[1.02] shadow-lg"
              >
                {isEditing ? "💾 Сохранить изменения" : "➕ Добавить продукт"}
              </button>
            </form>
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
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    unit: "",
    category: "",
    image: null,
    delivery_available: false,
    seller_address: "",
    delivery_days: 1,
  });

  const [categories, setCategories] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  const measurementUnits = [
    "шт",
    "кг",
    "литр",
    "грамм",
    "упаковка",
    "бутылка",
    "ящик",
    "метр",
    "пучок",
    "банка",
  ];

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

  const resetFormState = useCallback(() => {
    setFormState({
      name: "",
      description: "",
      price: "",
      quantity: "",
      unit: measurementUnits[0],
      category: categories[0]?.id.toString() || "",
      image: null,
      delivery_available: false,
      seller_address: "",
      delivery_days: 1,
    });
    setImagePreview(null);
  }, [categories, measurementUnits]);

  const handleEdit = useCallback(
    (product) => {
      setFormState({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        unit: product.unit,
        category: product.category?.id.toString() || "",
        image: null,
        delivery_available: product.delivery_available,
        seller_address: product.seller_address,
      });
      setImagePreview(product.image);
      setIsModalOpen(true);
    },
    [setFormState, setImagePreview, setIsModalOpen]
  );

  const handleSubmit = useCallback(
    async (formData) => {
      if (!formData.category || formData.category === "") {
        setFormErrors({ category: "Категория обязательна" });
        return;
      }

      setFormErrors({});
      const token = Cookies.get("token");
      if (!token) {
        toast.error("Требуется авторизация");
        return;
      }

      try {
        const data = new FormData();
        data.append("seller_address", formData.seller_address);
        data.append("name", formData.name);
        data.append("description", formData.description);
        data.append("delivery_available", formData.delivery_available);
        data.append("category_id", Number(formData.category));
        data.append("price", parseFloat(formData.price));
        data.append("quantity", parseInt(formData.quantity, 10));
        data.append("unit", formData.unit);
        if (formData.image) {
          data.append("image", formData.image);
        }

        let response;
        if (formData.id) {
          response = await axios.put(
            `http://localhost:8000/api/products/${formData.id}/`,
            data,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } else {
          response = await axios.post(
            "http://localhost:8000/api/products/create/",
            data,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }

        const productsResponse = await axios.get(
          "http://localhost:8000/api/my-products/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProducts(productsResponse.data);

        setFormState({
          name: "",
          description: "",
          price: "",
          quantity: "",
          unit: measurementUnits[0],
          category: categories[0]?.id.toString() || "",
          image: null,
          delivery_available: false,
          seller_address: "",
        });
        setImagePreview(null);
        setIsModalOpen(false);
        toast.success(
          formData.id
            ? "Продукт успешно обновлен!"
            : "Продукт успешно добавлен!"
        );
      } catch (error) {
        if (error.response) {
          if (error.response.data?.errors) {
            setFormErrors(
              Object.fromEntries(
                Object.entries(error.response.data.errors).map(
                  ([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join(" ") : value,
                  ]
                )
              )
            );
          } else {
            toast.error(error.response.data?.detail || "Произошла ошибка");
          }
        } else {
          toast.error("Ошибка сети");
        }
      }
    },
    [categories, measurementUnits]
  );

  const deleteProduct = useCallback(
    (productId) => {
      const token = Cookies.get("token");
      axios
        .delete(`http://localhost:8000/api/products/${productId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRFToken": Cookies.get("csrftoken"),
          },
        })
        .then(() => {
          setProducts((prev) => prev.filter((p) => p.id !== productId));
          toast.success("Товар успешно удален");
        })
        .catch((error) => {
          console.error("Ошибка удаления:", error);
          toast.error(
            error.response?.data?.error || "Ошибка при удалении товара"
          );
        });
    },
    [setProducts]
  );

  const confirmDelete = useCallback(
    (productId) => {
      toast(
        <div>
          <p>Вы уверены, что хотите удалить этот продукт?</p>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                deleteProduct(productId);
                toast.dismiss();
              }}
              className="px-3 py-1 bg-red-600 text-white rounded mr-2"
            >
              Да
            </button>
            <button
              onClick={() => toast.dismiss()}
              className="px-3 py-1 bg-gray-300 text-gray-800 rounded"
            >
              Нет
            </button>
          </div>
        </div>,
        {
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          draggable: false,
        }
      );
    },
    [deleteProduct]
  );

  const handleDelete = useCallback(
    (productId) => {
      confirmDelete(productId);
    },
    [confirmDelete]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-200 dark:[color-scheme:dark]">
      <Header />
      <ToastContainer />
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
                      onClick={() => handleEdit(product)}
                      className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Редактировать
                    </button>
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
          onClose={() => {
            setIsModalOpen(false);
            resetFormState();
          }}
          onSubmit={handleSubmit}
          formState={formState}
          formErrors={formErrors}
          categories={categories}
          measurementUnits={measurementUnits}
          isEditing={!!formState.id}
          imagePreview={imagePreview}
        />
      </div>
    </div>
  );
};

export default MyProductsPage;
