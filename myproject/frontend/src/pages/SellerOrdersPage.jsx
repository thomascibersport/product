import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import "../index.css";

const SellerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const waveAnimation = `
    @keyframes wave-group {
      0% { transform: scale(0.3); opacity: 1; }
      90% { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .animate-wave-1 { animation: wave-group 2s ease-out infinite; }
    .animate-wave-2 { animation: wave-group 2s ease-out infinite 0.3s; }
    .animate-wave-3 { animation: wave-group 2s ease-out infinite 0.6s; }
  `;

  const getStatusColor = (status) => {
    switch (status) {
      case "processing": return "border-yellow-500";
      case "confirmed": return "border-green-500";
      case "shipped": return "border-blue-500";
      case "in_transit": return "border-purple-500";
      case "delivered": return "border-green-500";
      case "canceled": return "border-red-500";
      default: return "border-gray-500";
    }
  };

  useEffect(() => {
    const fetchSellerOrders = async () => {
      const token = Cookies.get("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get("http://localhost:8000/api/orders/seller/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerOrders();
  }, [navigate]);

  const confirmOrder = async (orderId) => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!window.confirm("Вы уверены, что хотите подтвердить заказ?")) return;

    try {
      await axios.post(
        `http://localhost:8000/api/orders/${orderId}/confirm/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, status: "confirmed" } : order
      );
      setOrders(updatedOrders);
      alert("Заказ успешно подтвержден");
    } catch (error) {
      alert("Ошибка при подтверждении заказа");
      console.error("Ошибка:", error);
    }
  };

  const formatDate = (dateString) => moment(dateString).format("DD.MM.YYYY HH:mm");

  if (loading) return <div className="text-center py-10 text-gray-600 dark:text-gray-400">Загрузка заказов...</div>;
  if (error) return <div className="text-center py-10 text-red-500 dark:text-red-400">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <style>{waveAnimation}</style>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          📦 Заказы на мои товары
        </h1>
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform transition hover:scale-105">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">Пока нет заказов на ваши товары</p>
              <button
                onClick={() => navigate("/my-products")}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
              >
                К моим объявлениям
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-transform hover:scale-[1.005] relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(order.status).replace("border", "bg")}`} />
                <div className="flex flex-col md:flex-row justify-between mb-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Заказ #{order.id}</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Оформлен: {order.user.username} ({order.user.email})
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="space-y-2 mt-4 md:mt-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {order.delivery_type === "delivery" ? "🚚 Доставка" : "🏪 Самовывоз"}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {order.payment_method === "card" ? "💳 Карта" : "💵 Наличные"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <div className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(order.status)} animate-wave-1 opacity-0`} />
                        <div className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(order.status)} animate-wave-2 opacity-0`} />
                        <div className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(order.status)} animate-wave-3 opacity-0`} />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {order.status_display}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  {order.delivery_type === "delivery" ? (
                    <p className="text-gray-600 dark:text-gray-400">Адрес доставки: {order.delivery_address}</p>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">Пункт самовывоза: {order.pickup_address}</p>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Товары:</h3>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{item.product.name}</p>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Цена: {item.price} ₽</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Количество: {item.quantity}</p>
                            </div>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-4">
                              {(item.quantity * item.price).toFixed(2)} ₽
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">Итого:</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{order.total_amount} ₽</span>
                  </div>
                  {order.status === "processing" && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => confirmOrder(order.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Подтвердить заказ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOrdersPage;