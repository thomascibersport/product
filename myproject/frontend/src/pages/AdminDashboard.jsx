import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import {
  Container,
  Tabs,
  Tab,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Typography,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Fab,
  Divider,
  Card,
  CardContent,
  TextareaAutosize,
  Grid,
} from "@mui/material";
import { TableContainer } from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";
import "../index.css";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { alpha } from "@mui/material/styles";

const API_URL = "http://127.0.0.1:8000/api/";

function AdminDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editData, setEditData] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addData, setAddData] = useState({});
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [chatData, setChatData] = useState({ messages: [], sender: null, recipient: null });
  const { token } = useContext(AuthContext);
  
  // Seller applications state
  const [sellerApplications, setSellerApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [openApplicationDialog, setOpenApplicationDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("pending");

  const statusTranslations = {
    processing: "В обработке",
    confirmed: "Подтвержден",
    shipped: "Отправлен",
    in_transit: "В пути",
    delivered: "Доставлен",
    canceled: "Отменен",
  };

  const deliveryTypeTranslations = {
    delivery: "Доставка",
    pickup: "Самовывоз",
  };

  const paymentMethodTranslations = {
    card: "Картой",
    cash: "Наличные",
  };
  
  const sellerStatusTranslations = {
    not_applied: "Не подавал заявку",
    pending: "На рассмотрении",
    approved: "Подтверждён",
    rejected: "Отклонён"
  };

  const fetchData = async (endpoint, setter) => {
    try {
      const response = await axios.get(`${API_URL}admin/${endpoint}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setter(response.data);
    } catch (error) {
      console.error(`Ошибка при загрузке ${endpoint}:`, error);
    }
  };
  
  const fetchSellerApplications = async () => {
    try {
      const response = await axios.get(`${API_URL}authentication/admin/seller-applications/?status=${applicationStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Seller applications response:", response.data);
      
      // If the data is empty or not in expected format, log an error
      if (!response.data || !Array.isArray(response.data)) {
        console.error("Invalid seller applications data format:", response.data);
        toast.error("Неверный формат данных заявок продавцов");
        return;
      }
      
      // Map the data to ensure all required fields are present
      const formattedApplications = response.data.map(app => ({
        ...app,
        first_name: app.first_name || '',
        last_name: app.last_name || '',
        email: app.email || 'Нет данных',
        seller_status: app.seller_status || 'not_applied',
        seller_application_date: app.seller_application_date || null
      }));
      
      setSellerApplications(formattedApplications);
    } catch (error) {
      console.error("Ошибка при загрузке заявок продавцов:", error);
      toast.error("Не удалось загрузить заявки продавцов");
    }
  };

  useEffect(() => {
    fetchData("users", setUsers);
    fetchData("products", setProducts);
    fetchData("categories", setCategories);
    fetchData("cart-items", setCartItems);
    fetchData("orders", setOrders);
    fetchData("messages", setMessages);
    fetchData("reviews", setReviews);
    fetchSellerApplications();
  }, [token, applicationStatusFilter]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEdit = (item, type) => {
    setEditData({ ...item, type });
    setOpenEditDialog(true);
  };

  const viewSellerApplication = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}authentication/admin/seller-applications/${userId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("Seller application details:", response.data);
      
      // Ensure we have all required fields with default values if missing
      const applicationData = {
        ...response.data,
        username: response.data.username || 'Нет данных',
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        middle_name: response.data.middle_name || '',
        email: response.data.email || 'Нет данных',
        phone: response.data.phone || 'Не указан',
        seller_description: response.data.seller_description || '',
        seller_status: response.data.seller_status || 'not_applied',
        seller_application_date: response.data.seller_application_date || null,
        seller_reject_reason: response.data.seller_reject_reason || '',
        images: response.data.images || []
      };
      
      setSelectedApplication(applicationData);
      setOpenApplicationDialog(true);
    } catch (error) {
      console.error("Ошибка при загрузке заявки:", error);
      toast.error("Не удалось загрузить данные заявки");
    }
  };
  
  const confirmDelete = (id, type) => {
    toast(
      <div>
        <p>Вы уверены, что хотите удалить этот элемент?</p>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              handleDelete(id, type);
              toast.dismiss();
            }}
            className="px-3 py-1 bg-red-500 text-white rounded mr-2"
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

  const handleDelete = async (id, endpoint) => {
    try {
      await axios.delete(`${API_URL}admin/${endpoint}/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData(endpoint, {
        users: setUsers,
        products: setProducts,
        reviews: setReviews,
        categories: setCategories,
        orders: setOrders,
        "cart-items": setCartItems,
        messages: setMessages,
      }[endpoint]);
      toast.success("Элемент успешно удален");
    } catch (error) {
      console.error(`Ошибка при удалении ${endpoint}:`, error);
      toast.error("Ошибка при удалении элемента");
    }
  };
  
  const handleApplicationAction = async (userId, action) => {
    try {
      const data = { action };
      
      if (action === 'reject' && !rejectReason.trim()) {
        toast.error("Укажите причину отклонения заявки");
        return;
      }
      
      if (action === 'reject') {
        data.reason = rejectReason;
      }
      
      console.log(`Processing application action: ${action} for user ${userId}`, data);
      
      const response = await axios.put(`${API_URL}authentication/admin/seller-applications/${userId}/`, 
        data,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update the selected application with the new data
      if (selectedApplication && selectedApplication.id === userId) {
        setSelectedApplication({
          ...selectedApplication,
          ...response.data,
          seller_status: response.data.seller_status,
          seller_reject_reason: response.data.seller_reject_reason,
          is_seller: response.data.is_seller
        });
      }
      
      // Reset rejection reason
      setRejectReason("");
      
      // Refresh the applications list
      await fetchSellerApplications();
      
      // Send notification message to the user about their application status
      try {
        // Get the user's username for the notification message
        const username = selectedApplication?.username || 
                         sellerApplications.find(app => app.id === userId)?.username ||
                         "пользователя";
        
        // Create a message to notify the user about their application status
        const notificationMessage = {
          recipient_id: userId,
          content: action === 'approve' 
            ? `Ваша заявка на статус продавца была одобрена! Теперь вы можете размещать товары на платформе.`
            : `Ваша заявка на статус продавца была отклонена. Причина: ${rejectReason}`
        };
        
        // Send the notification message
        await axios.post(`${API_URL}messages/send/`, notificationMessage, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`Notification sent to user ${userId} about ${action} status`);
      } catch (notifyError) {
        console.error("Ошибка при отправке уведомления пользователю:", notifyError);
        // Don't show an error toast for this - the main action was successful
      }
      
      toast.success(action === 'approve' 
        ? "Заявка успешно подтверждена" 
        : "Заявка отклонена"
      );
    } catch (error) {
      console.error("Ошибка при обработке заявки:", error.response?.data || error);
      toast.error("Ошибка при обработке заявки: " + (error.response?.data?.error || error.message));
    }
  };

  const handleSave = async () => {
    const { id, type } = editData;
    const formData = new FormData();

    const fields = {
      users: [
        "username",
        "email",
        "first_name",
        "last_name",
        "middle_name",
        "phone",
        "show_phone",
        "is_staff",
        "agree_to_terms",
      ],
      products: [
        "name",
        "description",
        "price",
        "quantity",
        "unit",
        "delivery_available",
        "seller_address",
      ],
      categories: ["name", "slug"],
      reviews: ["content", "rating"],
      orders: [
        "status",
        "delivery_type",
        "payment_method",
        "delivery_address",
        "pickup_address",
        "cancel_reason",
      ],
      "cart-items": ["quantity"],
      messages: ["content"],
    }[type];

    fields.forEach((field) => {
      if (editData[field] !== undefined) {
        formData.append(field, editData[field]);
      }
    });

    if (type === "products") {
      if (editData.category?.id) {
        formData.append("category_id", editData.category.id);
      } else {
        console.error("Category ID is missing");
        toast.error("Не указан ID категории");
        return;
      }
      if (editData.image && editData.image instanceof File) {
        formData.append("image", editData.image);
      }
    }

    if (type === "users" && editData.avatar && editData.avatar instanceof File) {
      formData.append("avatar", editData.avatar);
    }

    try {
      await axios.put(`${API_URL}admin/${type}/${id}/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      fetchData(type, {
        users: setUsers,
        products: setProducts,
        reviews: setReviews,
        categories: setCategories,
        orders: setOrders,
        "cart-items": setCartItems,
        messages: setMessages,
      }[type]);
      setOpenEditDialog(false);
      toast.success("Данные успешно обновлены");
    } catch (error) {
      console.error(`Ошибка при обновлении ${type}:`, error.response?.data || error);
      toast.error("Ошибка при обновлении данных");
    }
  };

  const handleAdd = (type) => {
    const initialData = {
      type,
      // Set default values based on type
      ...(type === "users" && { show_phone: false, is_staff: false }),
      ...(type === "products" && { delivery_available: false }),
      ...(type === "orders" && { status: "processing", delivery_type: "delivery", payment_method: "card" }),
    };
    setAddData(initialData);
    setOpenAddDialog(true);
  };

  const handleAddSave = async () => {
    const { type } = addData;
    const formData = new FormData();

    // Add fields based on entity type
    const fields = {
      users: [
        "username",
        "email",
        "password",
        "first_name",
        "last_name",
        "middle_name",
        "phone",
        "show_phone",
        "is_staff",
        "agree_to_terms",
      ],
      products: [
        "name",
        "description",
        "price",
        "quantity",
        "unit",
        "delivery_available",
        "seller_address",
      ],
      categories: ["name", "slug"],
      reviews: ["content", "rating", "author", "recipient"],
      orders: [
        "user",
        "status",
        "delivery_type",
        "payment_method",
        "delivery_address",
        "pickup_address",
        "total_amount",
      ],
      "cart-items": ["user", "product", "quantity"],
      messages: ["sender", "recipient", "content"],
    }[type];

    fields.forEach((field) => {
      if (addData[field] !== undefined) {
        formData.append(field, addData[field]);
      }
    });

    if (type === "products" && addData.category_id) {
      formData.append("category_id", addData.category_id);
    }

    if (type === "products" && addData.image && addData.image instanceof File) {
      formData.append("image", addData.image);
    }

    if (type === "users" && addData.avatar && addData.avatar instanceof File) {
      formData.append("avatar", addData.avatar);
    }

    try {
      await axios.post(`${API_URL}admin/${type}/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      fetchData(type, {
        users: setUsers,
        products: setProducts,
        reviews: setReviews,
        categories: setCategories,
        orders: setOrders,
        "cart-items": setCartItems,
        messages: setMessages,
      }[type]);
      setOpenAddDialog(false);
      toast.success("Запись успешно добавлена");
    } catch (error) {
      console.error(`Ошибка при добавлении ${type}:`, error.response?.data || error);
      toast.error("Ошибка при добавлении данных");
    }
  };

  const openChatView = async (senderId, recipientId) => {
    try {
      // Get messages from the API using the correct endpoint
      const response = await axios.get(`${API_URL}messages/chat/${senderId}/${recipientId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Find user details
      const sender = users.find(user => user.id === senderId);
      const recipient = users.find(user => user.id === recipientId);
      
      setChatData({
        messages: response.data,
        sender,
        recipient
      });
      
      setOpenChatDialog(true);
    } catch (error) {
      console.error("Ошибка при получении сообщений:", error);
      toast.error("Не удалось загрузить переписку");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <ToastContainer />
      <div className="container mx-auto px-4 py-8 max-w-8xl">
        <Paper 
          elevation={0} 
          className="p-6 mb-8 rounded-lg bg-transparent dark:bg-transparent shadow-none"
        >
          <Typography 
            variant="h4" 
            className="text-center text-gray-900 dark:text-white mb-4 font-bold"
          >
            Панель администратора
          </Typography>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            className="bg-transparent dark:bg-transparent rounded-lg mb-6"
            TabIndicatorProps={{ style: { backgroundColor: '#3B82F6' } }}
          >
            <Tab label="Пользователи" className="text-gray-900 dark:text-white" />
            <Tab label="Продукты" className="text-gray-900 dark:text-white" />
            <Tab label="Категории" className="text-gray-900 dark:text-white" />
            <Tab label="Элементы корзины" className="text-gray-900 dark:text-white" />
            <Tab label="Заказы" className="text-gray-900 dark:text-white" />
            <Tab label="Сообщения" className="text-gray-900 dark:text-white" />
            <Tab label="Отзывы" className="text-gray-900 dark:text-white" />
            <Tab label="Заявки продавцов" className="text-gray-900 dark:text-white" />
          </Tabs>
          
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6" className="text-gray-900 dark:text-white">
              {tabValue === 0 && "Управление пользователями"}
              {tabValue === 1 && "Управление продуктами"}
              {tabValue === 2 && "Управление категориями"}
              {tabValue === 3 && "Управление элементами корзины"}
              {tabValue === 4 && "Управление заказами"}
              {tabValue === 5 && "Управление сообщениями"}
              {tabValue === 6 && "Управление отзывами"}
              {tabValue === 7 && "Управление заявками продавцов"}
            </Typography>
            {tabValue < 7 && (
            <Tooltip title={`Добавить ${
              tabValue === 0 ? "пользователя" : 
              tabValue === 1 ? "продукт" : 
              tabValue === 2 ? "категорию" : 
              tabValue === 3 ? "элемент корзины" : 
              tabValue === 4 ? "заказ" : 
              tabValue === 5 ? "сообщение" : 
              "отзыв"}`}
            >
              <Fab 
                size="medium" 
                color="primary" 
                onClick={() => handleAdd(
                  tabValue === 0 ? "users" : 
                  tabValue === 1 ? "products" : 
                  tabValue === 2 ? "categories" : 
                  tabValue === 3 ? "cart-items" : 
                  tabValue === 4 ? "orders" : 
                  tabValue === 5 ? "messages" : 
                  "reviews"
                )}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <AddIcon />
              </Fab>
            </Tooltip>
            )}
            {tabValue === 7 && (
              <FormControl variant="outlined" className="min-w-[200px]">
                <InputLabel id="application-status-label">Статус</InputLabel>
                <Select
                  labelId="application-status-label"
                  value={applicationStatusFilter}
                  onChange={(e) => setApplicationStatusFilter(e.target.value)}
                  label="Статус"
                >
                  <MenuItem value="all">Все заявки</MenuItem>
                  <MenuItem value="pending">На рассмотрении</MenuItem>
                  <MenuItem value="approved">Подтверждённые</MenuItem>
                  <MenuItem value="rejected">Отклонённые</MenuItem>
                </Select>
              </FormControl>
            )}
          </div>
          
          <Paper elevation={0} className="overflow-hidden rounded-lg bg-transparent shadow-none" style={{ backgroundColor: 'transparent' }}>
            <Box className="overflow-x-auto bg-transparent">
              {/* Seller Applications Tab */}
              {tabValue === 7 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {[
                          "ID", "Пользователь", "Email", "Телефон", "Статус", "Дата подачи", "Действия"
                        ].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {sellerApplications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" className="text-gray-500 dark:text-gray-400 py-8">
                            {applicationStatusFilter === 'pending' 
                              ? "Нет заявок на рассмотрении" 
                              : applicationStatusFilter === 'approved'
                              ? "Нет подтверждённых заявок"
                              : applicationStatusFilter === 'rejected'
                              ? "Нет отклонённых заявок"
                              : "Нет заявок"
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        sellerApplications.map((application) => (
                          <TableRow key={application.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                            <TableCell className="text-black dark:text-white bg-transparent">{application.id}</TableCell>
                            <TableCell className="text-black dark:text-white bg-transparent">
                              {application.first_name || application.last_name 
                                ? `${application.first_name || ''} ${application.last_name || ''}`
                                : application.username || 'Нет данных'}
                            </TableCell>
                            <TableCell className="text-black dark:text-white bg-transparent">{application.email || 'Нет данных'}</TableCell>
                            <TableCell className="text-black dark:text-white bg-transparent">{application.phone || 'Не указан'}</TableCell>
                            <TableCell className="text-black dark:text-white bg-transparent">
                              <Chip 
                                label={sellerStatusTranslations[application.seller_status] || 'Неизвестно'} 
                                color={
                                  application.seller_status === 'approved' ? 'success' :
                                  application.seller_status === 'pending' ? 'warning' : 
                                  application.seller_status === 'rejected' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell className="text-black dark:text-white bg-transparent">
                              {application.seller_application_date 
                                ? new Date(application.seller_application_date).toLocaleString() 
                                : 'Н/Д'}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Просмотреть заявку">
                                <IconButton
                                  onClick={() => viewSellerApplication(application.id)}
                                  className="mr-1 text-blue-500 hover:text-blue-700"
                                  size="small"
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              
                              {application.seller_status === 'pending' && (
                                <>
                                  <Tooltip title="Подтвердить">
                                    <IconButton
                                      onClick={() => {
                                        setSelectedApplication(application);
                                        handleApplicationAction(application.id, 'approve');
                                      }}
                                      className="mr-1 text-green-500 hover:text-green-700"
                                      size="small"
                                    >
                                      <CheckCircleIcon />
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title="Отклонить">
                                    <IconButton
                                      onClick={() => {
                                        setSelectedApplication(application);
                                        setOpenApplicationDialog(true);
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                      size="small"
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Other tabs */}
              {tabValue === 0 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {[
                          "ID", "Имя пользователя", "Электронная почта", "Имя", "Фамилия", "Отчество", "Телефон", 
                          "Показывать телефон", "Администратор", "Аватар", "Действия"
                        ].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {users.map((user) => (
                        <TableRow key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.username}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.email}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.first_name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.last_name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.middle_name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.phone}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.show_phone ? 
                              <Chip label="Да" color="success" size="small" /> : 
                              <Chip label="Нет" color="default" size="small" />
                            }
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.is_staff ? 
                              <Chip label="Да" color="primary" size="small" /> : 
                              <Chip label="Нет" color="default" size="small" />
                            }
                          </TableCell>
                          <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.avatar ? (
                              <Avatar src={user.avatar} alt="аватар" className="w-10 h-10 rounded-full border-2 border-blue-200" />
                            ) : (
                              <Avatar className="bg-blue-500">{user.first_name?.charAt(0) || user.username?.charAt(0) || "U"}</Avatar>
                            )}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(user, "users")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(user.id, "users")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 1 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {[
                          "ID", "Название", "Описание", "Цена", "Количество", "Единица", "Категория", 
                          "Фермер", "Создано", "Доставка доступна", "Адрес продавца", "Изображение", "Действия"
                        ].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {products.map((product) => (
                        <TableRow key={product.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.description}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.price}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.quantity}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.unit}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.category ? product.category.name : "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.farmer ? `${product.farmer.first_name} ${product.farmer.last_name}` : "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(product.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.delivery_available ? "Да" : "Нет"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.seller_address}
                          </TableCell>
                          <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-full" />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">Нет изображения</span>
                            )}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(product, "products")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(product.id, "products")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 2 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {["ID", "Название", "Slug", "Создано", "Действия"].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {categories.map((category) => (
                        <TableRow key={category.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {category.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {category.name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {category.slug}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(category.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(category, "categories")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(category.id, "categories")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 3 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {["ID", "Пользователь", "Продукт", "Количество", "Создано", "Действия"].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {cartItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.user ? item.user.username : "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product ? item.product.name : "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(item.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(item, "cart-items")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(item.id, "cart-items")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 4 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {[
                          "ID", "Статус", "Тип доставки", "Способ оплаты", "Адрес доставки", 
                          "Адрес самовывоза", "Создано", "Действия"
                        ].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {statusTranslations[order.status] || order.status}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {deliveryTypeTranslations[order.delivery_type] || order.delivery_type}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {paymentMethodTranslations[order.payment_method] || order.payment_method}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.delivery_address}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.pickup_address}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(order.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(order, "orders")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(order.id, "orders")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 5 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {["ID", "Автор", "Получатель", "Содержание", "Время отправки", "Удалено", "Действия"].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {messages.map((message) => (
                        <TableRow key={message.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {message.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {message.sender?.username || "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {message.recipient?.username || "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {message.content}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(message.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {message.is_deleted ? 
                              <Chip label="Да" color="error" size="small" /> : 
                              <Chip label="Нет" color="success" size="small" />
                            }
                          </TableCell>
                          <TableCell style={{ minWidth: '280px', whiteSpace: 'normal' }}>
                            <Tooltip title="Просмотреть переписку">
                              <IconButton
                                onClick={() => openChatView(message.sender?.id, message.recipient?.id)}
                                className="mr-1 text-blue-500 hover:text-blue-700"
                                size="small"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(message, "messages")}
                                className="mr-1 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(message.id, "messages")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {tabValue === 6 && (
                <TableContainer className="rounded-lg bg-transparent" style={{ width: '100%' }}>
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead className="bg-transparent">
                      <TableRow className="bg-transparent">
                        {["ID", "Автор", "Получатель", "Содержание", "Оценка", "Создано", "Действия"].map((header, index) => (
                          <TableCell 
                            key={index} 
                            className="text-black dark:text-white font-semibold bg-transparent" 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody className="bg-transparent">
                      {reviews.map((review) => (
                        <TableRow key={review.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors bg-transparent">
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {review.id}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {review.author_name}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {users.find((user) => user.id === review.recipient)?.username || "N/A"}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {review.content}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {review.rating}
                          </TableCell>
                          <TableCell className="text-black dark:text-white bg-transparent" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {new Date(review.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                            <Tooltip title="Редактировать">
                              <IconButton
                                onClick={() => handleEdit(review, "reviews")}
                                className="mr-2 text-yellow-500 hover:text-yellow-700"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                onClick={() => confirmDelete(review.id, "reviews")}
                                className="text-red-500 hover:text-red-700"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Paper>
        </Paper>

        <Dialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          PaperProps={{ className: "bg-white dark:bg-gray-800 rounded-lg" }}
        >
          <DialogTitle className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-t-lg">
            Редактировать{" "}
            {editData?.type === "users"
              ? "пользователя"
              : editData?.type === "products"
              ? "продукт"
              : editData?.type === "categories"
              ? "категорию"
              : editData?.type === "reviews"
              ? "отзыв"
              : editData?.type === "cart-items"
              ? "элемент корзины"
              : editData?.type === "orders"
              ? "заказ"
              : "сообщение"}
          </DialogTitle>
          <DialogContent className="p-4">
            {editData?.type === "users" && (
              <>
                <TextField
                  label="Имя пользователя"
                  value={editData?.username || ""}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Электронная почта"
                  value={editData?.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Имя"
                  value={editData?.first_name || ""}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Фамилия"
                  value={editData?.last_name || ""}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Отчество"
                  value={editData?.middle_name || ""}
                  onChange={(e) => setEditData({ ...editData, middle_name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Телефон"
                  value={editData?.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Показывать телефон</InputLabel>
                  <Select
                    value={editData?.show_phone ? "Да" : "Нет"}
                    onChange={(e) => setEditData({ ...editData, show_phone: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                  <FormHelperText className="text-gray-600 dark:text-gray-400">
                    Показывать телефон другим пользователям
                  </FormHelperText>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Статус администратора</InputLabel>
                  <Select
                    value={editData?.is_staff ? "Да" : "Нет"}
                    onChange={(e) => setEditData({ ...editData, is_staff: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                  <FormHelperText className="text-gray-600 dark:text-gray-400">
                    Является ли пользователь администратором
                  </FormHelperText>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Согласие с условиями</InputLabel>
                  <Select
                    value={editData?.agree_to_terms ? "Да" : "Нет"}
                    onChange={(e) => setEditData({ ...editData, agree_to_terms: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                  <FormHelperText className="text-gray-600 dark:text-gray-400">
                    Согласен ли пользователь с условиями
                  </FormHelperText>
                </FormControl>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditData({ ...editData, avatar: e.target.files[0] })}
                  className="mt-2 text-gray-800 dark:text-white"
                />
              </>
            )}
            {editData?.type === "products" && (
              <>
                <TextField
                  label="Название"
                  value={editData?.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Описание"
                  value={editData?.description || ""}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Цена"
                  value={editData?.price || ""}
                  onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Количество"
                  value={editData?.quantity || ""}
                  onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Единица"
                  value={editData?.unit || ""}
                  onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Категория</InputLabel>
                  <Select
                    value={editData?.category?.id || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, category: { ...editData.category, id: e.target.value } })
                    }
                    className="text-gray-800 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Доставка доступна</InputLabel>
                  <Select
                    value={editData?.delivery_available ? "Да" : "Нет"}
                    onChange={(e) => setEditData({ ...editData, delivery_available: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Адрес продавца"
                  value={editData?.seller_address || ""}
                  onChange={(e) => setEditData({ ...editData, seller_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditData({ ...editData, image: e.target.files[0] })}
                  className="mt-2 text-gray-800 dark:text-white"
                />
              </>
            )}
            {editData?.type === "categories" && (
              <>
                <TextField
                  label="Название"
                  value={editData?.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Slug"
                  value={editData?.slug || ""}
                  onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
              </>
            )}
            {editData?.type === "cart-items" && (
              <TextField
                label="Количество"
                value={editData?.quantity || ""}
                onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                fullWidth
                margin="dense"
                className="dark:text-white"
                InputProps={{ className: "text-gray-800 dark:text-white" }}
                InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
              />
            )}
            {editData?.type === "orders" && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Статус</InputLabel>
                  <Select
                    value={editData?.status || ""}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="processing">В обработке</MenuItem>
                    <MenuItem value="confirmed">Подтвержден</MenuItem>
                    <MenuItem value="shipped">Отправлен</MenuItem>
                    <MenuItem value="in_transit">В пути</MenuItem>
                    <MenuItem value="delivered">Доставлен</MenuItem>
                    <MenuItem value="canceled">Отменен</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Тип доставки</InputLabel>
                  <Select
                    value={editData?.delivery_type || ""}
                    onChange={(e) => setEditData({ ...editData, delivery_type: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="delivery">Доставка</MenuItem>
                    <MenuItem value="pickup">Самовывоз</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Способ оплаты</InputLabel>
                  <Select
                    value={editData?.payment_method || ""}
                    onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="card">Картой</MenuItem>
                    <MenuItem value="cash">Наличные</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Адрес доставки"
                  value={editData?.delivery_address || ""}
                  onChange={(e) => setEditData({ ...editData, delivery_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Адрес самовывоза"
                  value={editData?.pickup_address || ""}
                  onChange={(e) => setEditData({ ...editData, pickup_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Причина отмены"
                  value={editData?.cancel_reason || ""}
                  onChange={(e) => setEditData({ ...editData, cancel_reason: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
              </>
            )}
            {editData?.type === "messages" && (
              <TextField
                label="Содержание"
                value={editData?.content || ""}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                fullWidth
                margin="dense"
                className="dark:text-white"
                InputProps={{ className: "text-gray-800 dark:text-white" }}
                InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
              />
            )}
            {editData?.type === "reviews" && (
              <>
                <TextField
                  label="Содержание"
                  value={editData?.content || ""}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Оценка"
                  value={editData?.rating || ""}
                  onChange={(e) => setEditData({ ...editData, rating: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions className="bg-gray-100 dark:bg-gray-700 rounded-b-lg">
            <Button
              onClick={() => setOpenEditDialog(false)}
              className="text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openChatDialog}
          onClose={() => setOpenChatDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ 
            className: "bg-white dark:bg-gray-800 rounded-lg",
            style: { minHeight: '70vh' }
          }}
        >
          <DialogTitle className="bg-blue-100 dark:bg-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <Typography variant="h6" className="text-gray-800 dark:text-white">
                Переписка между пользователями
              </Typography>
            </div>
            <IconButton onClick={() => setOpenChatDialog(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className="p-0">
            <div className="flex h-full">
              {/* Chat info sidebar */}
              <div className="w-1/4 border-r dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                  <Typography variant="subtitle1" className="text-gray-800 dark:text-white font-bold mb-2">
                    Отправитель
                  </Typography>
                  <Card className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardContent>
                      <div className="flex items-center">
                        {chatData.sender?.avatar ? (
                          <Avatar src={chatData.sender.avatar} alt={chatData.sender.username} />
                        ) : (
                          <Avatar>{chatData.sender?.username?.charAt(0) || "?"}</Avatar>
                        )}
                        <div className="ml-3">
                          <Typography variant="body1" className="text-gray-800 dark:text-white font-medium">
                            {chatData.sender?.username || "Неизвестно"}
                          </Typography>
                          <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                            {chatData.sender?.email || ""}
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Typography variant="subtitle1" className="text-gray-800 dark:text-white font-bold mb-2">
                    Получатель
                  </Typography>
                  <Card className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardContent>
                      <div className="flex items-center">
                        {chatData.recipient?.avatar ? (
                          <Avatar src={chatData.recipient.avatar} alt={chatData.recipient.username} />
                        ) : (
                          <Avatar>{chatData.recipient?.username?.charAt(0) || "?"}</Avatar>
                        )}
                        <div className="ml-3">
                          <Typography variant="body1" className="text-gray-800 dark:text-white font-medium">
                            {chatData.recipient?.username || "Неизвестно"}
                          </Typography>
                          <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                            {chatData.recipient?.email || ""}
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Messages area */}
              <div className="w-3/4 flex flex-col h-[60vh]">
                <div className="flex-grow overflow-y-auto p-4">
                  {chatData.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
                        Нет сообщений между этими пользователями
                      </Typography>
                    </div>
                  ) : (
                    chatData.messages.map((msg) => (
                      <div key={msg.id} className={`mb-4 flex ${msg.sender.id === chatData.sender?.id ? "justify-start" : "justify-end"}`}>
                        <div 
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender.id === chatData.sender?.id 
                              ? "bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-white" 
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                          } ${msg.is_deleted ? "opacity-50" : ""}`}
                        >
                          <div className="text-sm mb-1">
                            <strong>{msg.sender.username}</strong> • {new Date(msg.timestamp).toLocaleString()}
                            {msg.is_deleted && <span className="ml-2 text-red-500 dark:text-red-400">(Удалено)</span>}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          PaperProps={{ className: "bg-white dark:bg-gray-800 rounded-lg" }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-t-lg flex justify-between items-center">
            <div>
              Добавить{" "}
              {addData?.type === "users"
                ? "пользователя"
                : addData?.type === "products"
                ? "продукт"
                : addData?.type === "categories"
                ? "категорию"
                : addData?.type === "reviews"
                ? "отзыв"
                : addData?.type === "cart-items"
                ? "элемент корзины"
                : addData?.type === "orders"
                ? "заказ"
                : "сообщение"}
            </div>
            <IconButton onClick={() => setOpenAddDialog(false)}>
              <CloseIcon className="text-gray-600 dark:text-gray-300" />
            </IconButton>
          </DialogTitle>
          <DialogContent className="p-4">
            {/* Users form */}
            {addData?.type === "users" && (
              <>
                <TextField
                  label="Имя пользователя"
                  value={addData?.username || ""}
                  onChange={(e) => setAddData({ ...addData, username: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Электронная почта"
                  value={addData?.email || ""}
                  onChange={(e) => setAddData({ ...addData, email: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Пароль"
                  type="password"
                  value={addData?.password || ""}
                  onChange={(e) => setAddData({ ...addData, password: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Имя"
                  value={addData?.first_name || ""}
                  onChange={(e) => setAddData({ ...addData, first_name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Фамилия"
                  value={addData?.last_name || ""}
                  onChange={(e) => setAddData({ ...addData, last_name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Статус администратора</InputLabel>
                  <Select
                    value={addData?.is_staff ? "Да" : "Нет"}
                    onChange={(e) => setAddData({ ...addData, is_staff: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {/* Products form */}
            {addData?.type === "products" && (
              <>
                <TextField
                  label="Название"
                  value={addData?.name || ""}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Описание"
                  value={addData?.description || ""}
                  onChange={(e) => setAddData({ ...addData, description: e.target.value })}
                  fullWidth
                  margin="dense"
                  multiline
                  rows={3}
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Цена"
                  type="number"
                  value={addData?.price || ""}
                  onChange={(e) => setAddData({ ...addData, price: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Количество"
                  type="number"
                  value={addData?.quantity || ""}
                  onChange={(e) => setAddData({ ...addData, quantity: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Единица измерения"
                  value={addData?.unit || ""}
                  onChange={(e) => setAddData({ ...addData, unit: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Категория</InputLabel>
                  <Select
                    value={addData?.category_id || ""}
                    onChange={(e) => setAddData({ ...addData, category_id: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="text-gray-600 dark:text-gray-300">Доставка доступна</InputLabel>
                  <Select
                    value={addData?.delivery_available ? "Да" : "Нет"}
                    onChange={(e) => setAddData({ ...addData, delivery_available: e.target.value === "Да" })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="Да">Да</MenuItem>
                    <MenuItem value="Нет">Нет</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Адрес продавца"
                  value={addData?.seller_address || ""}
                  onChange={(e) => setAddData({ ...addData, seller_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <div className="mt-3">
                  <Typography className="text-gray-800 dark:text-white mb-1">Изображение товара</Typography>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAddData({ ...addData, image: e.target.files[0] })}
                    className="text-gray-800 dark:text-white"
                  />
                </div>
              </>
            )}

            {/* Categories form */}
            {addData?.type === "categories" && (
              <>
                <TextField
                  label="Название категории"
                  value={addData?.name || ""}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Slug (необязательно, генерируется автоматически)"
                  value={addData?.slug || ""}
                  onChange={(e) => setAddData({ ...addData, slug: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
              </>
            )}

            {/* Cart Items form */}
            {addData?.type === "cart-items" && (
              <>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Пользователь</InputLabel>
                  <Select
                    value={addData?.user || ""}
                    onChange={(e) => setAddData({ ...addData, user: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Продукт</InputLabel>
                  <Select
                    value={addData?.product || ""}
                    onChange={(e) => setAddData({ ...addData, product: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Количество"
                  type="number"
                  value={addData?.quantity || "1"}
                  onChange={(e) => setAddData({ ...addData, quantity: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
              </>
            )}

            {/* Orders form */}
            {addData?.type === "orders" && (
              <>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Пользователь</InputLabel>
                  <Select
                    value={addData?.user || ""}
                    onChange={(e) => setAddData({ ...addData, user: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Статус</InputLabel>
                  <Select
                    value={addData?.status || "processing"}
                    onChange={(e) => setAddData({ ...addData, status: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="processing">В обработке</MenuItem>
                    <MenuItem value="confirmed">Подтвержден</MenuItem>
                    <MenuItem value="shipped">Отправлен</MenuItem>
                    <MenuItem value="in_transit">В пути</MenuItem>
                    <MenuItem value="delivered">Доставлен</MenuItem>
                    <MenuItem value="canceled">Отменен</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Тип доставки</InputLabel>
                  <Select
                    value={addData?.delivery_type || "delivery"}
                    onChange={(e) => setAddData({ ...addData, delivery_type: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="delivery">Доставка</MenuItem>
                    <MenuItem value="pickup">Самовывоз</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Способ оплаты</InputLabel>
                  <Select
                    value={addData?.payment_method || "card"}
                    onChange={(e) => setAddData({ ...addData, payment_method: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    <MenuItem value="card">Картой</MenuItem>
                    <MenuItem value="cash">Наличные</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Адрес доставки"
                  value={addData?.delivery_address || ""}
                  onChange={(e) => setAddData({ ...addData, delivery_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Адрес самовывоза"
                  value={addData?.pickup_address || ""}
                  onChange={(e) => setAddData({ ...addData, pickup_address: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
                <TextField
                  label="Сумма заказа"
                  type="number"
                  value={addData?.total_amount || ""}
                  onChange={(e) => setAddData({ ...addData, total_amount: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <TextField
                  label="Причина отмены (если отменен)"
                  value={addData?.cancel_reason || ""}
                  onChange={(e) => setAddData({ ...addData, cancel_reason: e.target.value })}
                  fullWidth
                  margin="dense"
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                />
              </>
            )}

            {/* Messages form */}
            {addData?.type === "messages" && (
              <>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Отправитель</InputLabel>
                  <Select
                    value={addData?.sender || ""}
                    onChange={(e) => setAddData({ ...addData, sender: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Получатель</InputLabel>
                  <Select
                    value={addData?.recipient || ""}
                    onChange={(e) => setAddData({ ...addData, recipient: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Содержание сообщения"
                  value={addData?.content || ""}
                  onChange={(e) => setAddData({ ...addData, content: e.target.value })}
                  fullWidth
                  margin="dense"
                  multiline
                  rows={3}
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
              </>
            )}

            {/* Reviews form */}
            {addData?.type === "reviews" && (
              <>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Автор</InputLabel>
                  <Select
                    value={addData?.author || ""}
                    onChange={(e) => setAddData({ ...addData, author: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Получатель</InputLabel>
                  <Select
                    value={addData?.recipient || ""}
                    onChange={(e) => setAddData({ ...addData, recipient: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Содержание отзыва"
                  value={addData?.content || ""}
                  onChange={(e) => setAddData({ ...addData, content: e.target.value })}
                  fullWidth
                  margin="dense"
                  multiline
                  rows={3}
                  className="dark:text-white"
                  InputProps={{ className: "text-gray-800 dark:text-white" }}
                  InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                  required
                />
                <FormControl fullWidth margin="dense" required>
                  <InputLabel className="text-gray-600 dark:text-gray-300">Оценка</InputLabel>
                  <Select
                    value={addData?.rating || ""}
                    onChange={(e) => setAddData({ ...addData, rating: e.target.value })}
                    className="text-gray-800 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </DialogContent>
          <DialogActions className="bg-gray-100 dark:bg-gray-700 rounded-b-lg">
            <Button
              onClick={() => setOpenAddDialog(false)}
              className="text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddSave}
              variant="contained"
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Добавить
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openApplicationDialog}
          onClose={() => setOpenApplicationDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ 
            className: "bg-white dark:bg-gray-800 rounded-lg",
            style: { minHeight: '60vh' }
          }}
        >
          <DialogTitle className="bg-blue-100 dark:bg-gray-700 flex justify-between items-center">
            <Typography variant="h6" className="text-gray-800 dark:text-white">
              Заявка на статус продавца
            </Typography>
            <IconButton onClick={() => setOpenApplicationDialog(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          {selectedApplication && (
            <DialogContent className="p-6">
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Card className="mb-6">
                    <CardContent>
                      <Typography variant="h6" className="mb-4 text-gray-800 dark:text-white font-bold">
                        Информация о пользователе
                      </Typography>
                      
                      <div className="space-y-3">
                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            Имя пользователя:
                          </Typography>
                          <Typography variant="body1" className="text-gray-800 dark:text-white">
                            {selectedApplication.username || 'Не указано'}
                          </Typography>
                        </div>
                        
                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            ФИО:
                          </Typography>
                          <Typography variant="body1" className="text-gray-800 dark:text-white">
                            {`${selectedApplication.first_name || ''} ${selectedApplication.last_name || ''} ${selectedApplication.middle_name || ''}`}
                          </Typography>
                        </div>
                        
                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            Email:
                          </Typography>
                          <Typography variant="body1" className="text-gray-800 dark:text-white">
                            {selectedApplication.email || 'Не указано'}
                          </Typography>
                        </div>
                        
                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            Телефон:
                          </Typography>
                          <Typography variant="body1" className="text-gray-800 dark:text-white">
                            {selectedApplication.phone || 'Не указан'}
                          </Typography>
                        </div>
                        
                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            Дата подачи заявки:
                          </Typography>
                          <Typography variant="body1" className="text-gray-800 dark:text-white">
                            {selectedApplication.seller_application_date 
                              ? new Date(selectedApplication.seller_application_date).toLocaleString() 
                              : 'Не указано'}
                          </Typography>
                        </div>

                        <div>
                          <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400">
                            Текущий статус:
                          </Typography>
                          <Chip 
                            label={sellerStatusTranslations[selectedApplication.seller_status] || 'Неизвестно'} 
                            color={
                              selectedApplication.seller_status === 'approved' ? 'success' :
                              selectedApplication.seller_status === 'pending' ? 'warning' : 
                              selectedApplication.seller_status === 'rejected' ? 'error' : 'default'
                            }
                            size="small"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent>
                      <Typography variant="h6" className="mb-4 text-gray-800 dark:text-white font-bold">
                        Описание деятельности
                      </Typography>
                      <Typography variant="body1" className="text-gray-800 dark:text-white whitespace-pre-wrap">
                        {selectedApplication.seller_description || 'Описание не предоставлено'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" className="mb-4 text-gray-800 dark:text-white font-bold">
                        Подтверждающие изображения
                      </Typography>
                      
                      {selectedApplication.images && selectedApplication.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedApplication.images.map((image) => (
                            <div key={image.id} className="relative">
                              <img 
                                src={image.image_url || image.image} 
                                alt="Подтверждающее изображение"
                                className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
                          Изображения не загружены
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  {selectedApplication.seller_status === 'rejected' && (
                    <Card className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <CardContent>
                        <Typography variant="h6" className="text-red-800 dark:text-red-400 font-bold">
                          Заявка отклонена
                        </Typography>
                        <Typography variant="subtitle2" className="text-gray-600 dark:text-gray-400 mt-2">
                          Причина отклонения:
                        </Typography>
                        <Typography variant="body1" className="text-gray-800 dark:text-white mt-1 whitespace-pre-wrap">
                          {selectedApplication.seller_reject_reason || 'Причина не указана'}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedApplication.seller_status === 'approved' && (
                    <Card className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <CardContent>
                        <Typography variant="h6" className="text-green-800 dark:text-green-400 font-bold">
                          Заявка подтверждена
                        </Typography>
                        <Typography variant="body1" className="text-gray-800 dark:text-white mt-1">
                          Пользователь имеет статус продавца и может размещать товары на платформе.
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Grid>
              </Grid>
              
              {/* Actions section - only show for pending applications or when admin wants to change status */}
              <div className="mt-8 space-y-4">
                {/* Status change controls */}
                {(selectedApplication.seller_status === 'pending' || applicationStatusFilter !== 'pending') && (
                  <Card className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                    <CardContent>
                      <Typography variant="h6" className="mb-4 text-gray-800 dark:text-white font-bold">
                        Управление статусом заявки
                      </Typography>
                      
                      <div className="flex flex-wrap gap-4 mb-4">
                        <Button
                          onClick={() => handleApplicationAction(selectedApplication.id, 'approve')}
                          variant="contained"
                          className={`bg-green-500 hover:bg-green-600 text-white ${selectedApplication.seller_status === 'approved' ? 'opacity-50' : ''}`}
                          startIcon={<CheckCircleIcon />}
                          disabled={selectedApplication.seller_status === 'approved'}
                        >
                          {selectedApplication.seller_status === 'approved' ? 'Уже подтверждена' : 'Подтвердить заявку'}
                        </Button>
                      </div>
                      
                      {/* Rejection reason input - only show when not already rejected or when admin wants to update rejection reason */}
                      {(selectedApplication.seller_status !== 'rejected' || !selectedApplication.seller_reject_reason) && (
                        <>
                          <TextField
                            label="Причина отклонения"
                            variant="outlined"
                            fullWidth
                            multiline
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="mt-4"
                            placeholder="Укажите причину отклонения заявки"
                            InputProps={{ className: "text-gray-800 dark:text-white" }}
                            InputLabelProps={{ className: "text-gray-600 dark:text-gray-300" }}
                          />
                          
                          <Button
                            variant="contained"
                            className="bg-red-500 hover:bg-red-600 text-white mt-4"
                            disabled={!rejectReason.trim()}
                            onClick={() => handleApplicationAction(selectedApplication.id, 'reject')}
                            startIcon={<CancelIcon />}
                          >
                            Отклонить заявку
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          )}
          
          <DialogActions className="bg-gray-100 dark:bg-gray-700 p-4">
            <Button
              onClick={() => setOpenApplicationDialog(false)}
              className="text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}

export default AdminDashboard;