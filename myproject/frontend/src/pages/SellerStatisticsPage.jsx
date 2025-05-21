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
    bgcolor: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
    borderRadius: 1,
    '& .MuiInputBase-root': {
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(0, 0, 0, 0.23)',
    },
    '& .MuiSvgIcon-root': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiPickersDay-root': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
  };

  // Define input styles for dark mode
  const inputSx = {
    bgcolor: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
    borderRadius: 1,
    marginBottom: 2,
    '& .MuiInputBase-root': {
      backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(0, 0, 0, 0.23)',
    },
    '& .MuiSelect-icon': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    },
    '& .MuiMenuItem-root': {
      color: theme.palette.mode === 'dark' ? '#000000' : 'inherit',
    }
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
          <Typography
            variant="h6"
            className="text-gray-800 dark:text-white mb-4"
          >
            Покупатели и их покупки
          </Typography>
          
          {/* Enhanced Filter Section */}
          <Grid container spacing={2} className="mb-4">
            {/* Customer search filter */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                label="Поиск покупателя"
                variant="outlined"
                fullWidth
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                sx={inputSx}
              />
            </Grid>
            
            {/* Status filter */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                select
                label="Статус заказа"
                variant="outlined"
                fullWidth
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={inputSx}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'white',
                    }
                  }
                }}
              >
                <MenuItem value="all">Все статусы</MenuItem>
                <MenuItem value="processing">В обработке</MenuItem>
                <MenuItem value="confirmed">Подтвержден</MenuItem>
                <MenuItem value="shipped">Отправлен</MenuItem>
                <MenuItem value="in_transit">В пути</MenuItem>
                <MenuItem value="delivered">Доставлен</MenuItem>
                <MenuItem value="canceled">Отменен</MenuItem>
              </TextField>
            </Grid>
            
            {/* Payment method filter */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                select
                label="Способ оплаты"
                variant="outlined"
                fullWidth
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                sx={inputSx}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'white',
                    }
                  }
                }}
              >
                <MenuItem value="all">Все способы</MenuItem>
                <MenuItem value="card">Картой</MenuItem>
                <MenuItem value="cash">Наличные</MenuItem>
              </TextField>
            </Grid>
            
            {/* Delivery type filter */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                select
                label="Способ доставки"
                variant="outlined"
                fullWidth
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                sx={inputSx}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'white',
                    }
                  }
                }}
              >
                <MenuItem value="all">Все способы</MenuItem>
                <MenuItem value="delivery">Доставка</MenuItem>
                <MenuItem value="pickup">Самовывоз</MenuItem>
              </TextField>
            </Grid>
            
            {/* Price range filters */}
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                label="Мин. сумма (₽)"
                variant="outlined"
                type="number"
                fullWidth
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                inputProps={{ min: 0, step: "100" }}
                sx={inputSx}
              />
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                label="Макс. сумма (₽)"
                variant="outlined"
                type="number"
                fullWidth
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                inputProps={{ min: 0, step: "100" }}
                sx={inputSx}
              />
            </Grid>
            
            {/* Customer-specific date filters */}
            <Grid item xs={12} md={6} lg={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
                <DatePicker
                  label="Дата заказа от"
                  value={customerStartDate}
                  onChange={(newValue) => setCustomerStartDate(newValue)}
                  sx={datePickerSx}
                  slotProps={{
                    textField: {
                      placeholder: "Выберите дату",
                      InputLabelProps: { shrink: true },
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
                <DatePicker
                  label="Дата заказа до"
                  value={customerEndDate}
                  onChange={(newValue) => setCustomerEndDate(newValue)}
                  sx={datePickerSx}
                  slotProps={{
                    textField: {
                      placeholder: "Выберите дату",
                      InputLabelProps: { shrink: true },
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
          
          {/* Reset filters button */}
          <Button 
            variant="outlined" 
            className="mb-4"
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
            sx={{
              backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : null,
              color: theme.palette.mode === 'dark' ? '#000000' : 'primary',
              borderColor: theme.palette.mode === 'dark' ? '#666666' : null,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? '#eeeeee' : null,
                borderColor: theme.palette.mode === 'dark' ? '#444444' : null,
              }
            }}
          >
            Сбросить фильтры
          </Button>
          
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
                <Table className="bg-white dark:bg-gray-800">
                  <TableHead>
                    <TableRow>
                      <TableCell className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700">
                        Причина
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700">
                        Количество
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.cancellation_stats.reasons.map((reason, index) => (
                      <TableRow
                        key={index}
                        className="bg-white dark:bg-gray-800"
                      >
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
                Ваш рейтинг (как продавца)
              </Typography>
              <Typography
                variant="h2"
                className="text-purple-600 dark:text-purple-400 font-bold"
              >
                {stats.review_stats.seller.average_rating.toFixed(1)}/5
              </Typography>
              <Typography
                variant="body1"
                className="text-gray-600 dark:text-gray-300"
              >
                Отзывов: {stats.review_stats.seller.total_reviews}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper className="p-6 text-center bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <Typography
                variant="h6"
                className="text-gray-800 dark:text-white mb-4"
              >
                Средний рейтинг ваших покупателей
              </Typography>
              <Typography
                variant="h2"
                className="text-green-600 dark:text-green-400 font-bold"
              >
                {stats.review_stats.customers.average_rating.toFixed(1)}/5
              </Typography>
              <Typography
                variant="body1"
                className="text-gray-600 dark:text-gray-300"
              >
                Отзывов о покупателях: {stats.review_stats.customers.total_reviews}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default SellerDashboard;