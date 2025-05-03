import React, { useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import axios from "axios";
import { useAuth } from "../AuthContext";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import Header from "../components/Header";

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const SellerDashboard = () => {
  const [stats, setStats] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("/api/seller-statistics/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setStats(response.data);
      } catch (error) {
        console.error("Ошибка при загрузке статистики:", error);
      }
    };
    fetchStats();
  }, [token]);

  if (!stats)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    );

  const formatNumber = (num) =>
    num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const statusMap = {
    processing: "В обработке",
    confirmed: "Подтвержден",
    shipped: "Отправлен",
    in_transit: "В пути",
    delivered: "Доставлен",
    canceled: "Отменен",
  };

  const categorySalesData = {
    labels: stats.category_sales.map((c) => c.name),
    datasets: [
      {
        label: "Выручка по категориям",
        data: stats.category_sales.map((c) => c.total_revenue),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
        ],
      },
    ],
  };

  const salesByDayOfWeekData = {
    labels: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    datasets: [
      {
        label: "Количество заказов",
        data: stats.sales_by_day_of_week.map((d) => d.order_count),
        backgroundColor: "#2196F3",
      },
    ],
  };

  const orderStatusesData = {
    labels: stats.order_statuses.map((s) => statusMap[s.status] || s.status),
    datasets: [
      {
        label: "Статусы заказов",
        data: stats.order_statuses.map((s) => s.count),
        backgroundColor: [
          "#4CAF50",
          "#FFC107",
          "#FF5722",
          "#9C27B0",
          "#2196F3",
        ],
      },
    ],
  };

  const deliveryPickupData = {
    labels: stats.delivery_pickup_stats.map((d) =>
      d.delivery_type === "delivery" ? "Доставка" : "Самовывоз"
    ),
    datasets: [
      {
        label: "Доставка и самовывоз",
        data: stats.delivery_pickup_stats.map((d) => d.count),
        backgroundColor: ["#FF9800", "#8BC34A"],
      },
    ],
  };

  const paymentMethodsData = {
    labels: stats.payment_method_stats.map((p) =>
      p.payment_method === "card" ? "Картой" : "Наличные"
    ),
    datasets: [
      {
        label: "Способы оплаты",
        data: stats.payment_method_stats.map((p) => p.count),
        backgroundColor: ["#9C27B0", "#3F51B5"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <style>{`
        @keyframes wave-group {
          0% { transform: scale(0.3); opacity: 1; }
          90% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-wave-1 { animation: wave-group 2s ease-out infinite; }
        .animate-wave-2 { animation: wave-group 2s ease-out infinite 0.3s; }
        .animate-wave-3 { animation: wave-group 2s ease-out infinite 0.6s; }
      `}</style>
      <Header />
      <Container maxWidth="lg" className="py-8">
        <Typography
          variant="h4"
          className="text-center text-gray-800 dark:text-white mb-8"
        >
          📊 Статистика продавца
        </Typography>

        {/* Основные метрики */}
        <Grid container spacing={3} className="mb-8">
          {[
            {
              title: "Всего заказов",
              value: formatNumber(stats.orders.total_orders),
              icon: "📦",
              color: "blue",
            },
            {
              title: "Общий доход",
              value: `${formatNumber(stats.orders.total_revenue.toFixed(2))} ₽`,
              icon: "💰",
              color: "green",
            },
            {
              title: "Продано товаров",
              value: formatNumber(stats.orders.total_quantity),
              icon: "🛒",
              color: "purple",
            },
          ].map((metric, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Paper className="p-6 text-center bg-white dark:bg-gray-800 shadow-md rounded-lg transform transition hover:scale-105">
                <div className="relative inline-block mb-4">
                  <div
                    className={`absolute w-12 h-12 rounded-full border-2 border-${metric.color}-500 animate-wave-1 opacity-0 z-0`}
                  />
                  <div
                    className={`absolute w-12 h-12 rounded-full border-2 border-${metric.color}-500 animate-wave-2 opacity-0 z-0`}
                  />
                  <div
                    className={`absolute w-12 h-12 rounded-full border-2 border-${metric.color}-500 animate-wave-3 opacity-0 z-0`}
                  />
                  <div className="text-4xl relative z-10">{metric.icon}</div>
                </div>
                <Typography
                  variant="h6"
                  className="text-gray-600 dark:text-gray-300"
                >
                  {metric.title}
                </Typography>
                <Typography
                  variant="h3"
                  className={`font-bold text-${metric.color}-600 dark:text-${metric.color}-400`}
                >
                  {metric.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Графики и таблицы */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Ежемесячные продажи
              </Typography>
              <div style={{ height: "300px" }}>
                <Line
                  data={{
                    labels: stats.monthly_stats.map((m) =>
                      new Date(m.month).toLocaleString("ru-RU", {
                        month: "short",
                      })
                    ),
                    datasets: [
                      {
                        label: "Доход (руб)",
                        data: stats.monthly_stats.map((m) => m.revenue),
                        borderColor: "#4CAF50",
                        borderWidth: 2,
                        fill: false,
                      },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Топ товаров
              </Typography>
              <div style={{ height: "300px" }}>
                <Bar
                  data={{
                    labels: stats.products.map((p) => p.product__name),
                    datasets: [
                      {
                        label: "Продано единиц",
                        data: stats.products.map((p) => p.total_sold),
                        backgroundColor: "#2196F3",
                      },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Пиковые часы заказов
              </Typography>
              <div style={{ height: "300px" }}>
                <Bar
                  data={{
                    labels: stats.peak_hours.map((h) => `${h.hour}:00`),
                    datasets: [
                      {
                        label: "Количество заказов",
                        data: stats.peak_hours.map((h) => h.order_count),
                        backgroundColor: "#FF9800",
                      },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Продажи по категориям
              </Typography>
              <div style={{ height: "300px" }}>
                <Pie
                  data={categorySalesData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Заказы по дням недели
              </Typography>
              <div style={{ height: "300px" }}>
                <Bar
                  data={salesByDayOfWeekData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Статусы заказов
              </Typography>
              <div style={{ height: "300px" }}>
                <Pie
                  data={orderStatusesData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Доставка и самовывоз
              </Typography>
              <div style={{ height: "300px" }}>
                <Pie
                  data={deliveryPickupData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Способы оплаты
              </Typography>
              <div style={{ height: "300px" }}>
                <Pie
                  data={paymentMethodsData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Отмены заказов
              </Typography>
              <Typography
                variant="body1"
                className="text-gray-600 dark:text-gray-300 mb-4"
              >
                Всего отмен: {stats.cancellation_stats.total_cancellations}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-gray-800 dark:text-white">
                        Причина
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Количество
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.cancellation_stats.reasons.map((reason, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-gray-600 dark:text-gray-300">
                          {reason.cancel_reason || "Не указана"}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-300">
                          {reason.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="p-6 text-center bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Средний рейтинг
              </Typography>
              <Typography
                variant="h2"
                className="text-purple-600 dark:text-purple-400 font-bold"
              >
                {stats.review_stats.average_rating.toFixed(1)}/5
              </Typography>
              <Typography
                variant="body1"
                className="text-gray-600 dark:text-gray-300"
              >
                Отзывов: {stats.review_stats.total_reviews}
              </Typography>
            </Paper>
          </Grid>

          {/* Обновленная секция: Покупатели и их покупки */}
          <Grid item xs={12}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Покупатели и их покупки
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-gray-800 dark:text-white">
                        Покупатель
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Дата заказа
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Тип оплаты
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Тип доставки
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Сумма
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Товары
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white">
                        Статус заказа
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.customer_purchases &&
                      stats.customer_purchases.map((purchase, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {purchase.first_name} {purchase.last_name} (
                            {purchase.email})
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {new Date(purchase.order_date).toLocaleString(
                              "ru-RU"
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {purchase.payment_method === "card"
                              ? "Картой"
                              : "Наличные"}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {purchase.delivery_type === "delivery"
                              ? "Доставка"
                              : "Самовывоз"}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {purchase.total_spent.toFixed(2)} ₽
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            <ul>
                              {purchase.items.map((item, idx) => (
                                <li key={idx}>
                                  {item.product_name} x{item.quantity} -{" "}
                                  {item.total.toFixed(2)} ₽
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-300">
                            {statusMap[purchase.status] || purchase.status}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default SellerDashboard;
