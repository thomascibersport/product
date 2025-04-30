import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import InputMask from "react-input-mask";

const cardTypeImages = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png",
  mastercard:
    "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  amex: "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg",
};

const detectCardType = (number) => {
  const cleaned = number.replace(/\D/g, "");
  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard:
      /^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/,
    amex: /^3[47][0-9]{13}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (cleaned.match(pattern)) return type;
  }
  if (/^4/.test(cleaned)) return "visa";
  if (/^(5[1-5]|2)/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";

  return "default";
};

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [paymentType, setPaymentType] = useState("cash");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const navigate = useNavigate();

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardType, setCardType] = useState("default");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const deliveryItems = cartItems.filter(
    (item) => item.product.delivery_available
  );
  const pickupItems = cartItems.filter(
    (item) => !item.product.delivery_available
  );
  // Проверяем, есть ли в корзине хотя бы один товар с доставкой
  const hasDeliveryAvailable = cartItems.some(
    (item) => item.product.delivery_available
  );

  const addToCart = async (productId, quantity) => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/cart/items/",
        { product: productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Обновляем корзину после успешного добавления
      setCartItems((prevItems) => [...prevItems, response.data]);
    } catch (error) {
      if (error.response && error.response.data) {
        alert(
          error.response.data.detail ||
            "Ошибка при добавлении товара в корзину: " +
              JSON.stringify(error.response.data)
        );
      } else {
        alert("Ошибка при добавлении товара в корзину");
      }
    }
  };
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
          { headers: { Authorization: `Bearer ${token}` } }
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

  // Если выбран тип доставки "delivery", но в корзине нет товаров с доставкой, переключаем на самовывоз
  useEffect(() => {
    if (deliveryType === "delivery" && !hasDeliveryAvailable) {
      setDeliveryType("pickup");
    }
  }, [hasDeliveryAvailable, deliveryType]);

  useEffect(() => {
    if (paymentType === "card") {
      setShowCardModal(true);
    }
  }, [paymentType]);

  const updateQuantity = async (itemId, newQuantity) => {
    const token = Cookies.get("token");
    try {
      await axios.put(
        `http://localhost:8000/api/cart/items/${itemId}/`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
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
        headers: { Authorization: `Bearer ${token}` },
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

  const handleCardNumberChange = (e) => {
    const number = e.target.value;
    setCardNumber(number);
    setCardType(detectCardType(number));
  };

  const cardNumberMask =
    cardType === "amex" ? "9999 999999 99999" : "9999 9999 9999 9999";
  const expiryMask = "99/99";
  const cvvMask = cardType === "amex" ? "9999" : "999";

  const validateCardDetails = () => {
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const [month, year] = expiryDate.split("/").map(Number);

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      alert("Неверный формат срока действия карты");
      return false;
    }
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      alert("Срок действия карты истёк");
      return false;
    }
    if (cvv.length !== (cardType === "amex" ? 4 : 3)) {
      alert("Неверный CVV код");
      return false;
    }
    return true;
  };

  // Разделяем товары на две группы: с доставкой и без доставки
  const handleCreateOrder = async () => {
    const token = Cookies.get("token"); // Добавить эту строку
    if (!token) {
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      alert("Корзина пуста!");
      return;
    }

    // Проверка адреса для доставки
    if (deliveryType === "delivery" && !deliveryAddress.trim()) {
      alert("Пожалуйста, укажите адрес доставки");
      return;
    }

    try {
      const orderData = {
        delivery_type: deliveryType,
        payment_method: paymentType,
        delivery_address: deliveryType === "delivery" ? deliveryAddress : null,
        pickup_address:
          deliveryType === "pickup"
            ? "ул. Примерная, 123 (Пункт выдачи)"
            : null,
        items: cartItems.map((item) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
      };

      await axios.post("http://localhost:8000/api/orders/", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Очистка корзины
      await axios.delete("http://localhost:8000/api/cart/clear/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartItems([]);
      alert("Заказ успешно оформлен!");
      navigate("/orders");
    } catch (error) {
      let errorMessage = "Ошибка оформления заказа";
      if (error.response) {
        if (error.response.data.items) {
          errorMessage = error.response.data.items.join("\n");
        } else if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors.join("\n");
        } else {
          errorMessage = error.response.data.detail || errorMessage;
        }
      }
      alert(errorMessage);
      console.error("Детали ошибки:", error.response?.data);
    }
  };

  const handlePaymentTypeChange = (e) => {
    setPaymentType(e.target.value);
    setShowCardModal(e.target.value === "card");
  };

  const handleCancelCard = () => {
    setShowCardModal(false);
    setPaymentType("cash");
  };

  useEffect(() => {
    if (deliveryType === "pickup") {
      setDeliveryAddress("Самовывоз");
    } else {
      setDeliveryAddress("");
    }
  }, [deliveryType]);

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600">Загрузка корзины...</div>
    );
  if (error)
    return (
      <div className="text-center py-10 text-red-500">Ошибка: {error}</div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          🛒 Ваша корзина
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform transition hover:scale-105">
              <div className="text-6xl mb-4">😔</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Корзина пуста
              </p>
              <button
                onClick={() => navigate("/")}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
              >
                Вернуться к покупкам
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row gap-6 transition-transform hover:scale-[1.005]"
              >
                <div className="w-full md:w-1/5 relative">
                  <div className="absolute -inset-2 bg-blue-100 dark:bg-blue-900 blur-lg opacity-30"></div>
                  <img
                    src={item.product.image || "/placeholder-product.jpg"}
                    alt={item.product.name}
                    className="w-full h-40 object-contain rounded-xl transform transition hover:scale-105"
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {item.product.name}{" "}
                    {item.product.delivery_available === false && (
                      <span className="text-sm text-red-500">нет доставки</span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Продавец: {item.product.farmer_name}
                  </p>

                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full text-sm">
                      {item.product.category?.name || "Без категории"}
                    </span>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {item.product.price} ₽
                    </p>
                  </div>

                  <div className="flex items-center max-w-xs">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-10 h-10 text-gray-600 dark:text-gray-400 rounded-l-lg flex items-center justify-center hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      −
                    </button>
                    <span className="w-16 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-center font-medium dark:text-gray-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 text-gray-600 dark:text-gray-400 rounded-r-lg flex items-center justify-center hover:text-blue-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between space-y-4">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors group"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-lg">Удалить</span>
                      <svg
                        className="w-5 h-5 group-hover:rotate-12 transition-transform"
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
                    </span>
                  </button>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {(item.product.price * item.quantity).toFixed(2)} ₽
                  </p>
                </div>
              </div>
            ))}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-800 dark:text-white">
                  Итого:
                </span>
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {calculateTotal()} ₽
                </span>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Способ получения
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        deliveryType === "delivery"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="delivery"
                        checked={deliveryType === "delivery"}
                        onChange={(e) => setDeliveryType(e.target.value)}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <div className="font-medium text-gray-800 dark:text-white">
                          🚚 Доставка
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Курьером по указанному адресу
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        deliveryType === "pickup"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="pickup"
                        checked={deliveryType === "pickup"}
                        onChange={(e) => setDeliveryType(e.target.value)}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <div className="font-medium text-gray-800 dark:text-white">
                          🏪 Самовывоз
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Из нашего магазина
                        </p>
                      </div>
                    </label>
                  </div>

                  {deliveryType === "delivery" ? (
                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder="Введите адрес доставки..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all dark:text-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input
                        type="text"
                        value="Самовывоз"
                        readOnly
                        className="w-full p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 cursor-not-allowed transition-all dark:text-gray-200"
                      />
                    </div>
                  )}
                </div>

                {pickupItems.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">
                      Товары без доставки будут доступны для самовывоза по
                      адресу:
                      <br />
                      <span className="font-medium">
                        ул. Примерная, 123 (Пункт выдачи)
                      </span>
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Способ оплаты
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentType === "card"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentType === "card"}
                        onChange={handlePaymentTypeChange}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <div className="font-medium text-gray-800 dark:text-white">
                          💳 Картой онлайн
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Безопасная оплата картой
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentType === "cash"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cash"
                        checked={paymentType === "cash"}
                        onChange={handlePaymentTypeChange}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <div className="font-medium text-gray-800 dark:text-white">
                          💰 Наличными
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Оплата при получении
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {!showCardModal && (
                <button
                  onClick={handleCreateOrder}
                  className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  ✅ Оформить заказ
                </button>
              )}
            </div>
          </div>
        )}

        {showCardModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    💳 Данные карты
                  </h2>
                  <button
                    onClick={handleCancelCard}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-gray-500 dark:text-gray-400"
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

                <div className="space-y-5">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-14 flex items-center">
                      {cardType !== "default" && (
                        <img
                          src={cardTypeImages[cardType]}
                          alt={cardType}
                          className="h-6 object-contain max-w-[3rem]"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      )}
                    </div>
                    <InputMask
                      mask={cardNumberMask}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      className="w-full pl-24 pr-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Имя владельца"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <InputMask
                      mask={expiryMask}
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="ММ/ГГ"
                      className="px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                    />
                    <InputMask
                      mask={cvvMask}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="CVV"
                      className="px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-4">
                  <button
                    onClick={handleCancelCard}
                    className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
                  >
                    Оплатить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
