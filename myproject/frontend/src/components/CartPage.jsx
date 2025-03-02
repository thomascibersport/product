import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [paymentType, setPaymentType] = useState("card");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCartItems = async () => {
      const token = Cookies.get("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(
          "http://localhost:8000/api/cart/items/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCartItems(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
  }, [navigate]);

  const updateQuantity = async (itemId, newQuantity) => {
    const token = Cookies.get("token");
    try {
      await axios.put(
        `http://localhost:8000/api/cart/items/${itemId}/`,
        { quantity: newQuantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCartItems((items) =>
        items.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error("Ошибка обновления количества:", error);
    }
  };

  const removeItem = async (itemId) => {
    const token = Cookies.get("token");
    try {
      await axios.delete(`http://localhost:8000/api/cart/items/${itemId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCartItems((items) => items.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Ошибка удаления товара:", error);
    }
  };

  const calculateTotal = () => {
    return cartItems
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      .toFixed(2);
  };

  const handleCreateOrder = async () => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (deliveryType === "delivery" && !deliveryAddress) {
      alert("Пожалуйста, укажите адрес доставки");
      return;
    }

    const orderData = {
      items: cartItems.map((item) => ({
        product: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      delivery_type: deliveryType,
      payment_method: paymentType,
      total_amount: calculateTotal(),
      address: deliveryType === "delivery" ? deliveryAddress : null,
    };

    try {
      await axios.post("http://localhost:8000/api/orders/", orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Очистка корзины
      await axios.delete("http://localhost:8000/api/cart/clear/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCartItems([]);

      alert("Заказ успешно оформлен!");
      navigate("/orders");
    } catch (error) {
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        console.error("Ошибка оформления заказа:", error);
        alert("Произошла ошибка при оформлении заказа");
      }
    }
  };

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600">Загрузка корзины...</div>
    );

  if (error)
    return (
      <div className="text-center py-10 text-red-500">Ошибка: {error}</div>
    );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Ваша корзина
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-10 text-gray-600 dark:text-gray-400">
            Корзина пуста
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Список товаров */}
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col md:flex-row gap-6"
              >
                {/* Изображение товара */}
                <div className="w-full md:w-1/5">
                  <img
                    src={item.product.image || "/placeholder-product.jpg"}
                    alt={item.product.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>

                {/* Информация о товаре */}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {item.product.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {item.product.category}
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-2">
                    {item.product.price} ₽
                  </p>

                  {/* Управление количеством */}
                  <div className="flex items-center mt-4">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-l disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="px-4 bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-r"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Удаление и общая цена */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {(item.product.price * item.quantity).toFixed(2)} ₽
                  </p>
                </div>
              </div>
            ))}

            {/* Итого */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Итого:
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {calculateTotal()} ₽
                </span>
              </div>

              {/* Выбор способа доставки */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Способ получения</h3>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="delivery"
                      value="delivery"
                      checked={deliveryType === "delivery"}
                      onChange={(e) => setDeliveryType(e.target.value)}
                      className="mr-2"
                    />
                    Доставка
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="delivery"
                      value="pickup"
                      checked={deliveryType === "pickup"}
                      onChange={(e) => setDeliveryType(e.target.value)}
                      className="mr-2"
                    />
                    Самовывоз
                  </label>
                </div>

                {deliveryType === "delivery" && (
                  <div className="mt-4">
                    <input
                      type="text"
                      placeholder="Введите адрес доставки"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Выбор способа оплаты */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Способ оплаты</h3>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentType === "card"}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="mr-2"
                    />
                    Картой онлайн
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentType === "cash"}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="mr-2"
                    />
                    Наличными
                  </label>
                </div>
              </div>

              {/* Кнопка оформления заказа */}
              <button
                onClick={handleCreateOrder}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Оформить заказ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
