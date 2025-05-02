import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate, Link } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import "../index.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
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
      case "processing":
        return "border-gray-500";
      case "confirmed":
        return "border-yellow-500";
      case "shipped":
        return "border-blue-500";
      case "in_transit":
        return "border-purple-500";
      case "delivered":
        return "border-green-500";
      case "canceled":
        return "border-red-500";
      default:
        return "border-gray-500";
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      const token = Cookies.get("token");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const response = await axios.get("http://localhost:8000/api/orders/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
        setFilteredOrders(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm.length >= 3) {
      filtered = filtered.filter(
        (order) =>
          order.id.toString().includes(searchTerm) ||
          order.items.some((item) =>
            item.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (startDate) {
      filtered = filtered.filter((order) =>
        moment(order.created_at).isSameOrAfter(moment(startDate))
      );
    }

    if (endDate) {
      filtered = filtered.filter((order) =>
        moment(order.created_at).isSameOrBefore(moment(endDate))
      );
    }

    if (minAmount) {
      filtered = filtered.filter(
        (order) => order.total_amount >= parseFloat(minAmount)
      );
    }

    if (maxAmount) {
      filtered = filtered.filter(
        (order) => order.total_amount <= parseFloat(maxAmount)
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, minAmount, maxAmount, orders]);

  const formatDate = (dateString) =>
    moment(dateString).format("DD.MM.YYYY HH:mm");

  const cancelOrder = async (orderId) => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const reason = "Вы отменили заказ";
    try {
      await axios.post(
        `http://localhost:8000/api/orders/${orderId}/cancel/`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedOrders = orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "canceled", cancel_reason: reason }
          : order
      );
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);
      toast.success("Заказ успешно отменен");
    } catch (error) {
      toast.error("Ошибка при отмене заказа");
      console.error("Ошибка отмены заказа:", error);
    }
  };

  const confirmCancelOrder = (orderId) => {
    toast(
      <div>
        <p>Вы уверены, что хотите отменить заказ?</p>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              cancelOrder(orderId);
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
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
      <style>{waveAnimation}</style>
      <Header />
      <ToastContainer />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          📦 История заказов
        </h1>
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Поиск по номеру заказа или товару (мин. 3 символа)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Все статусы</option>
              <option value="processing">В обработке</option>
              <option value="confirmed">Подтвержден</option>
              <option value="shipped">Отправлен</option>
              <option value="in_transit">В пути</option>
              <option value="delivered">Доставлен</option>
              <option value="canceled">Отменен</option>
            </select>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border rounded"
              placeholder="Начальная дата"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border rounded"
              placeholder="Конечная дата"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="number"
              placeholder="Мин. сумма (₽)"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Макс. сумма (₽)"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="p-2 border rounded"
            />
          </div>
        </div>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform transition hover:scale-105">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                У вас пока нет заказов
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
          <div className="space-y-6">
            {currentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-transform hover:scale-[1.005] relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(
                    order.status
                  ).replace("border", "bg")}`}
                />
                <div className="flex flex-col md:flex-row justify-between mb-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      Заказ #{order.id}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(order.created_at)}
                    </p>
                    {order.delivery_type === "delivery" && (
                      <div className="mt-2">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          Адрес доставки:
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {order.delivery_address || "Не указан"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mt-4 md:mt-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {order.delivery_type === "delivery"
                          ? "🚚 Доставка"
                          : "🏪 Самовывоз"}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {order.payment_method === "card"
                          ? "💳 Карта"
                          : "💵 Наличные"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <div
                          className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(
                            order.status
                          )} animate-wave-1 opacity-0`}
                        />
                        <div
                          className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(
                            order.status
                          )} animate-wave-2 opacity-0`}
                        />
                        <div
                          className={`absolute w-full h-full rounded-full border-2 ${getStatusColor(
                            order.status
                          )} animate-wave-3 opacity-0`}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {order.status === "confirmed" ? "Подтверждено" : ""}
                        {[
                          "processing",
                          "confirmed",
                          "shipped",
                          "in_transit",
                          "delivered",
                          "canceled",
                        ].includes(order.status) &&
                          {
                            processing: "В обработке",
                            confirmed: "",
                            shipped: "Отправлен",
                            in_transit: "В пути",
                            delivered: "Доставлен",
                            canceled: "Отменен",
                          }[order.status]}
                      </span>
                    </div>
                    {order.status === "canceled" && order.cancel_reason && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Причина отмены: {order.cancel_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Товары:
                  </h3>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          item.product && !item.product.delivery_available
                            ? "bg-rose-100 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800"
                            : "bg-gray-50 dark:bg-gray-700"
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                            {item.product?.name || "Товар удален"}
                            {item.product &&
                              !item.product.delivery_available && (
                                <span className="ml-2 text-sm text-rose-600 dark:text-rose-300">
                                  (Самовывоз)
                                </span>
                              )}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Продавец:{" "}
                            {item.product?.farmer?.id ? (
                              <Link
                                to={`/users/${item.product.farmer.id}/`}
                                className="font-medium text-gray-800 dark:text-gray-200 hover:underline"
                              >
                                {`${item.product.farmer.first_name} ${item.product.farmer.last_name}`.trim()}
                              </Link>
                            ) : (
                              "Неизвестен"
                            )}
                          </p>
                          {order.delivery_type === "delivery" &&
                            item.product &&
                            !item.product.delivery_available && (
                              <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                                <p>
                                  Адрес самовывоза для этого товара:{" "}
                                  {item.product.seller_address || "Не указан"}
                                </p>
                                <p>
                                  Контакты:{" "}
                                  {item.product.farmer?.phone || "Не указаны"}
                                </p>
                              </div>
                            )}
                          {order.delivery_type === "pickup" && item.product && (
                            <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                              <p>
                                Адрес самовывоза:{" "}
                                {item.product.seller_address || "Не указан"}
                              </p>
                              <p>
                                Контакты:{" "}
                                {item.product.farmer?.phone || "Не указаны"}
                              </p>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Цена: {item.price} ₽
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Количество: {item.quantity}
                              </p>
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
                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                      Итого:
                    </span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {order.total_amount} ₽
                    </span>
                  </div>
                  {order.status === "processing" && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => confirmCancelOrder(order.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Отменить заказ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-8">
              {Array.from(
                { length: Math.ceil(filteredOrders.length / ordersPerPage) },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;