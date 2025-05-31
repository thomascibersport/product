import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import Header from "../components/Header";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ruLocale from 'date-fns/locale/ru';
import { subDays } from 'date-fns';
import { useTheme } from '@mui/material/styles';

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
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [customerStartDate, setCustomerStartDate] = useState(null);
  const [customerEndDate, setCustomerEndDate] = useState(null);
  const { token, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchStats = useCallback(async () => {
    if (!token || !user) return;

    const formatDate = (date) => {
      if (!date) {
        return null;
      }

      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.error('Invalid date object in formatDate:', date);
        return null;
      }

      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      const year = d.getFullYear();

      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;

      return [year, month, day].join('-');
    };

    console.log('Fetching stats for dates:', startDate, endDate);
    try {
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

      // Prepare params object - only include dates if they are set
      const params = {
        // If both dates are null, API will return all-time stats
      };

      if (formattedStartDate) {
        params.start_date = formattedStartDate;
      }

      if (formattedEndDate) {
        params.end_date = formattedEndDate;
      }

      const response = await axios.get("/api/seller-statistics/", {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });

      console.log('API response:', response.data);
      setStats(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        navigate("/login");
      } else {
        console.error("Ошибка при загрузке статистики:", error);
      }
    }
  }, [token, user, startDate, endDate, navigate]);

  useEffect(() => {
    if (!isLoading && token && user) {
      fetchStats();
    }
  }, [isLoading, token, user, startDate, endDate]);

  useEffect(() => {
    if (!isLoading && (!token || !user)) {
      console.log("SellerDashboard: перенаправление на /login");
      navigate("/login");
    }
  }, [isLoading, token, user, navigate]);

  if (isLoading) {
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка статистики...
      </div>
    );
  }

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

  // Определяем стили для DatePicker
  const datePickerSx = {
    '& .MuiInputBase-root': {
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#f5f5f5',
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? '#f0f0f0 !important' : '#eeeeee',
      },
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.23) !important' : 'rgba(0, 0, 0, 0.23)',
    },
    '& .MuiSvgIcon-root': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiPickersDay-root': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiInputBase-input': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
  };

  // Define input styles for dark mode
  const inputSx = {
    '& .MuiInputBase-root': {
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#f5f5f5',
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? '#f0f0f0 !important' : '#eeeeee',
      },
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.23) !important' : 'rgba(0, 0, 0, 0.23)',
    },
    '& .MuiSelect-icon': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiMenuItem-root': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#ffffff',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? '#f0f0f0 !important' : '#f5f5f5',
      },
    },
    '& .MuiSelect-select': {
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#f5f5f5',
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
    '& .MuiInputBase-input': {
      color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
    },
  };

  // Define menu props for consistent styling
  const menuProps = {
    PaperProps: {
      sx: {
        backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#ffffff',
        '& .MuiMenuItem-root': {
          color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
          backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#ffffff',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? '#f0f0f0 !important' : '#f5f5f5',
          },
        },
      },
    },
  };

  // Добавляем стили для TextField компонентов
  const textFieldProps = {
    sx: inputSx,
    InputProps: {
      sx: {
        backgroundColor: theme.palette.mode === 'dark' ? '#ffffff !important' : '#f5f5f5',
        color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
      },
    },
    InputLabelProps: {
      sx: {
        color: theme.palette.mode === 'dark' ? '#000000 !important' : '#000000',
      },
    },
  };

  // Filter customers based on all filters
  const filteredCustomers = stats?.customer_purchases
    ? stats.customer_purchases.filter(
      (purchase) => {
        // Text search filter
        const nameMatch =
          purchase.first_name.toLowerCase().includes(customerFilter.toLowerCase()) ||
          purchase.last_name.toLowerCase().includes(customerFilter.toLowerCase()) ||
          purchase.email.toLowerCase().includes(customerFilter.toLowerCase());

        // Status filter
        const statusMatch = statusFilter === 'all' || purchase.status === statusFilter;

        // Payment method filter
        const paymentMatch = paymentFilter === 'all' || purchase.payment_method === paymentFilter;

        // Delivery type filter
        const deliveryMatch = deliveryFilter === 'all' || purchase.delivery_type === deliveryFilter;

        // Price range filter
        const minPriceMatch = minPrice === "" || purchase.total_spent >= parseFloat(minPrice);
        const maxPriceMatch = maxPrice === "" || purchase.total_spent <= parseFloat(maxPrice);

        // Order date filter - specific for customer table
        let orderDate = new Date(purchase.order_date);
        const startDateMatch = !customerStartDate || orderDate >= new Date(customerStartDate);
        const endDateMatch = !customerEndDate || orderDate <= new Date(customerEndDate);

        return nameMatch && statusMatch && paymentMatch && deliveryMatch &&
          minPriceMatch && maxPriceMatch && startDateMatch && endDateMatch;
      }
    )
    : [];

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

        {/* Date Filter Section - For overall statistics */}
        <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <Typography
            variant="h6"
            className="text-gray-800 dark:text-white mb-4"
          >
            Фильтр по дате для общей статистики
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="От"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  sx={datePickerSx}
                  slotProps={{
                    textField: {
                      ...textFieldProps,
                      placeholder: "Выберите дату",
                      InputLabelProps: { shrink: true }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="До"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  sx={datePickerSx}
                  slotProps={{
                    textField: {
                      ...textFieldProps,
                      placeholder: "Выберите дату",
                      InputLabelProps: { shrink: true }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </Paper>

        {/* Customers Table - Moved to top */}
        <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <Typography variant="h6" className="text-gray-800 dark:text-white mb-4">
            Покупатели и их покупки
          </Typography>

          {/* Фильтры */}
          <Grid container spacing={2} className="mb-4">
            {/* Поиск покупателя */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <input
                  type="text"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  placeholder="Поиск покупателя"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </Grid>

            {/* Статус заказа */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           appearance-none"
                >
                  <option value="all">Все статусы</option>
                  <option value="processing">В обработке</option>
                  <option value="confirmed">Подтвержден</option>
                  <option value="shipped">Отправлен</option>
                  <option value="in_transit">В пути</option>
                  <option value="delivered">Доставлен</option>
                  <option value="canceled">Отменен</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </Grid>

            {/* Способ оплаты */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           appearance-none"
                >
                  <option value="all">Все способы</option>
                  <option value="card">Картой</option>
                  <option value="cash">Наличные</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </Grid>

            {/* Способ доставки */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           appearance-none"
                >
                  <option value="all">Все способы</option>
                  <option value="delivery">Доставка</option>
                  <option value="pickup">Самовывоз</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </Grid>

            {/* Минимальная сумма */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Мин. сумма (₽)"
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </Grid>

            {/* Максимальная сумма */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Макс. сумма (₽)"
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </Grid>

            {/* Дата заказа от */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <input
                  type="date"
                  value={customerStartDate ? new Date(customerStartDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setCustomerStartDate(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Grid>

            {/* Дата заказа до */}
            <Grid item xs={12} md={6} lg={3}>
              <div className="relative">
                <input
                  type="date"
                  value={customerEndDate ? new Date(customerEndDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setCustomerEndDate(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-white text-gray-900 dark:text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Grid>
          </Grid>

          {/* Кнопка "Сбросить фильтры" */}
          <button
            onClick={() => {
              setCustomerFilter("");
              setStatusFilter("all");
              setPaymentFilter("all");
              setDeliveryFilter("all");
              setMinPrice("");
              setMaxPrice("");
              setCustomerStartDate(null);
              setCustomerEndDate(null);
            }}
            className="px-4 py-2 mb-4 text-sm font-medium text-gray-700 dark:text-gray-200 
                     bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Сбросить фильтры
          </button>

          {/* Display number of results */}
          {filteredCustomers.length > 0 && (
            <Typography className="mb-2 text-gray-600 dark:text-gray-300">
              Найдено записей: {filteredCustomers.length}
            </Typography>
          )}

          <TableContainer
            sx={{
              maxHeight: filteredCustomers.length > 10 ? '600px' : 'auto',
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.mode === 'dark' ? '#888' : '#c1c1c1',
                borderRadius: '10px',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? '#aaa' : '#a1a1a1',
                },
              },
            }}
          >
            <Table className="bg-white dark:bg-gray-800" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Покупатель
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Дата заказа
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Тип оплаты
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Тип доставки
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Сумма
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Товары
                  </TableCell>
                  <TableCell
                    className="text-white bg-gray-100 dark:bg-gray-900"
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#121212 !important' : '#f5f5f5 !important',
                      fontWeight: 'bold',
                      border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
                      color: theme.palette.mode === 'dark' ? '#fff !important' : '#333 !important',
                    }}
                  >
                    Статус заказа
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((purchase, index) => (
                    <TableRow
                      key={index}
                      className="bg-white dark:bg-gray-800"
                    >
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {purchase.first_name} {purchase.last_name} ({purchase.email})
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {new Date(purchase.order_date).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {purchase.payment_method === "card" ? "Картой" : "Наличные"}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {purchase.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {purchase.total_spent.toFixed(2)} ₽
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        <ul>
                          {purchase.items.map((item, idx) => (
                            <li key={idx}>
                              {item.product_name} x{item.quantity} - {item.total.toFixed(2)} ₽
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {statusMap[purchase.status] || purchase.status}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-600 dark:text-gray-300">
                      {customerFilter || statusFilter !== "all" || paymentFilter !== "all" || deliveryFilter !== "all" || minPrice || maxPrice || customerStartDate || customerEndDate
                        ? "Нет заказов, соответствующих фильтрам"
                        : "Нет данных о покупателях"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Stats Summary Section */}
        <Grid container spacing={3} className="mb-8">
          {[
            {
              title: "Всего успешных заказов",
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
                  <div className="text-4xl relative z-10 flex items-center justify-center w-12 h-12">{metric.icon}</div>
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

        {/* Stats Charts Section */}
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
          <Grid item xs={12} md={6}>
            <Paper className="p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Сравнение рейтингов
              </Typography>
              <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "300px" }}>
                  <Grid container spacing={2} sx={{ textAlign: "center" }}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" className="text-gray-700 dark:text-gray-300 mb-2">
                        Ваш рейтинг (как продавца)
                      </Typography>
                      <Typography variant="h3" className="text-purple-600 dark:text-purple-400 font-bold mb-2">
                        {stats.review_stats.seller.average_rating.toFixed(1)}/5
                      </Typography>
                      <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                        Отзывов: {stats.review_stats.seller.total_reviews}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" className="text-gray-700 dark:text-gray-300 mb-2">
                        Рейтинг покупателей
                      </Typography>
                      <Typography variant="h3" className="text-green-600 dark:text-green-400 font-bold mb-2">
                        {stats.review_stats.customers.average_rating.toFixed(1)}/5
                      </Typography>
                      <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                        Отзывов: {stats.review_stats.customers.total_reviews}
                      </Typography>
                    </Grid>
                  </Grid>
                </div>
              </div>
            </Paper>
          </Grid>

        </Grid>
      </Container>
    </div>
  );
};

export default SellerDashboard;