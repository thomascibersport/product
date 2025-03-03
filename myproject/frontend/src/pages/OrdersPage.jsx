import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      const token = Cookies.get("token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      try {
        const response = await axios.get(
          "http://localhost:8000/api/orders/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [navigate]);

  const formatDate = (dateString) => {
    return moment(dateString).format("LLL");
  };

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка заказов...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-10 text-red-500 dark:text-red-400">
        Ошибка: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          📦 История заказов
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform transition hover:scale-105">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                У вас пока нет заказов
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
              >
                Вернуться к покупкам
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-transform hover:scale-[1.005]"
              >
                <div className="flex flex-col md:flex-row justify-between mb-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      Заказ #{order.id}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="space-y-2 mt-4 md:mt-0">
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-sm">
                      {order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}
                    </span>
                    <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full text-sm ml-2">
                      {order.payment_method === 'card' ? 'Оплата картой' : 'Наличные'}
                    </span>
                  </div>
                </div>

                {order.address && (
                  <div className="mb-4">
                    <p className="text-gray-600 dark:text-gray-400">
                      Адрес: {order.address}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Товары:
                  </h3>
                  <div className="space-y-4">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.quantity} x {item.price} ₽
                          </p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200">
                          {(item.quantity * item.price).toFixed(2)} ₽
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                      Итого:
                    </span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {order.total_amount} ₽
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;