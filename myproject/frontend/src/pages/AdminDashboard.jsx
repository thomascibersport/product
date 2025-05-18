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

  useEffect(() => {
    fetchData("users", setUsers);
    fetchData("products", setProducts);
    fetchData("categories", setCategories);
    fetchData("cart-items", setCartItems);
    fetchData("orders", setOrders);
    fetchData("messages", setMessages);
    fetchData("reviews", setReviews);
  }, [token]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEdit = (item, type) => {
    setEditData({ ...item, type });
    setOpenEditDialog(true);
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
      // Get messages from the API - using the messages/chat endpoint instead of a direct URL
      const response = await axios.get(`${API_URL}messages/chat/${senderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Find user details
      const sender = users.find(user => user.id === senderId);
      const recipient = users.find(user => user.id === recipientId);
      
      // Filter messages to only show those between these two users
      const filteredMessages = response.data.filter(
        message => 
          (message.sender.id === senderId && message.recipient.id === recipientId) || 
          (message.sender.id === recipientId && message.recipient.id === senderId)
      );
      
      setChatData({
        messages: filteredMessages,
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
            </Typography>
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
          </div>
          
          <Paper elevation={0} className="overflow-hidden rounded-lg bg-transparent shadow-none" style={{ backgroundColor: 'transparent' }}>
            <Box className="overflow-x-auto bg-transparent">
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
      </div>
    </div>
  );
}

export default AdminDashboard;