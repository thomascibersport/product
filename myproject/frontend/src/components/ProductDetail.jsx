import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prevProduct, setPrevProduct] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState(null);

  useEffect(() => {
    const token = Cookies.get("token");

    axios
      .get(`http://localhost:8000/api/products/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setProduct(response.data);
        setPrevProduct(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-10 text-red-500 dark:text-red-400">
        Ошибка: {error}
      </div>
    );

  const displayProduct = product || prevProduct;
  if (!displayProduct)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Продукт не найден
      </div>
    );
  const handleAddToCart = async () => {
    const token = Cookies.get("token");
    if (!token) {
      alert("Пожалуйста, войдите в систему, чтобы добавить товар в корзину");
      return;
    }

    setIsAddingToCart(true);
    setCartMessage(null);

    try {
      const response = await axios.post(
        `http://localhost:8000/api/cart/items/`,
        {
          product: displayProduct.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setCartMessage({
          type: "success",
          text: "Товар успешно добавлен в корзину!",
        });
      }
    } catch (error) {
      console.error("Ошибка при добавлении в корзину:", error);
      let errorMessage = "Произошла ошибка при добавлении в корзину";

      if (error.response) {
        if (error.response.data?.product) {
          errorMessage = error.response.data.product;
        } else if (error.response.data?.quantity) {
          errorMessage = error.response.data.quantity;
        }
      }

      setCartMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsAddingToCart(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Изображение продукта */}
            <div className="w-full md:w-1/2">
              {displayProduct.image ? (
                <img
                  src={displayProduct.image}
                  alt={displayProduct.name}
                  className="w-full h-auto object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md">
                  <span className="text-gray-500 dark:text-gray-400">
                    Нет изображения
                  </span>
                </div>
              )}
            </div>

            {/* Детали продукта */}
            <div className="w-full md:w-1/2">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                {displayProduct.name}
              </h1>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {displayProduct.description}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                Цена: {displayProduct.price}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Категория: {displayProduct.category}
              </p>
              {/* Выбор количества */}
              <div className="mt-4 flex items-center">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded-l transition duration-200"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value)))
                  }
                  className="w-16 text-center bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 focus:outline-none py-1"
                  min="1"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded-r transition duration-200"
                >
                  +
                </button>
              </div>
              {/* Кнопка "Добавить в корзину" */}-
              <div className="mt-6">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out ${
                    isAddingToCart ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isAddingToCart ? "Добавление..." : "Добавить в корзину"}
                </button>

                {cartMessage && (
                  <div
                    className={`mt-4 p-3 rounded-lg ${
                      cartMessage.type === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {cartMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
