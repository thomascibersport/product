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
} from "@mui/material";
import { TableContainer } from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";
import "../index.css";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <ToastContainer />
      <div className="container mx-auto px-4 py-8 max-w-8xl">
        <Typography variant="h4" className="text-center text-gray-800 dark:text-white mb-8 font-bold">
          Панель администратора
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          className="bg-gray-100 dark:bg-gray-700 rounded-lg mb-6"
        >
          <Tab label="Пользователи" className="text-gray-800 dark:text-white" />
          <Tab label="Продукты" className="text-gray-800 dark:text-white" />
          <Tab label="Категории" className="text-gray-800 dark:text-white" />
          <Tab label="Элементы корзины" className="text-gray-800 dark:text-white" />
          <Tab label="Заказы" className="text-gray-800 dark:text-white" />
          <Tab label="Сообщения" className="text-gray-800 dark:text-white" />
          <Tab label="Отзывы" className="text-gray-800 dark:text-white" />
        </Tabs>
        <Box>
          {tabValue === 0 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {[
                      "ID", "Имя пользователя", "Электронная почта", "Имя", "Фамилия", "Отчество", "Телефон", 
                      "Показывать телефон", "Администратор", "Аватар", "Действия"
                    ].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.username}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.first_name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.last_name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.middle_name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.phone}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.show_phone ? "Да" : "Нет"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.is_staff ? "Да" : "Нет"}
                      </TableCell>
                      <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.avatar ? (
                          <img src={user.avatar} alt="аватар" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">Нет аватара</span>
                        )}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(user, "users")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(user.id, "users")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 1 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {[
                      "ID", "Название", "Описание", "Цена", "Количество", "Единица", "Категория", 
                      "Фермер", "Создано", "Доставка доступна", "Адрес продавца", "Изображение", "Действия"
                    ].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.description}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.price}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.unit}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.category ? product.category.name : "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.farmer ? `${product.farmer.first_name} ${product.farmer.last_name}` : "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(product.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.delivery_available ? "Да" : "Нет"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                        <Button
                          onClick={() => handleEdit(product, "products")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(product.id, "products")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 2 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {["ID", "Название", "Slug", "Создано", "Действия"].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {category.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {category.name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {category.slug}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(category.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(category, "categories")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(category.id, "categories")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 3 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {["ID", "Пользователь", "Продукт", "Количество", "Создано", "Действия"].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.user ? item.user.username : "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product ? item.product.name : "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(item, "cart-items")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(item.id, "cart-items")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 4 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {[
                      "ID", "Статус", "Тип доставки", "Способ оплаты", "Адрес доставки", 
                      "Адрес самовывоза", "Создано", "Действия"
                    ].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {statusTranslations[order.status] || order.status}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deliveryTypeTranslations[order.delivery_type] || order.delivery_type}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {paymentMethodTranslations[order.payment_method] || order.payment_method}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.delivery_address}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.pickup_address}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(order, "orders")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(order.id, "orders")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 5 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {["ID", "Автор", "Получатель", "Содержание", "Время отправки", "Удалено", "Действия"].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.sender?.username || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.recipient?.username || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.content}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(message.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.is_deleted ? "Да" : "Нет"}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(message, "messages")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(message.id, "messages")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {tabValue === 6 && (
            <TableContainer className="rounded-lg" style={{ width: '100%' }}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow className="bg-transparent">
                    {["ID", "Автор", "Получатель", "Содержание", "Оценка", "Создано", "Действия"].map((header, index) => (
                      <TableCell 
                        key={index} 
                        className="text-gray-800 dark:text-white font-semibold" 
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} className="transition-colors" style={{ backgroundColor: "transparent" }}>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.id}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.author_name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {users.find((user) => user.id === review.recipient)?.username || "N/A"}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.content}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.rating}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(review.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell style={{ minWidth: '200px', whiteSpace: 'normal' }}>
                        <Button
                          onClick={() => handleEdit(review, "reviews")}
                          variant="contained"
                          className="bg-blue-500 text-white hover:bg-blue-600 mr-2"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button
                          onClick={() => confirmDelete(review.id, "reviews")}
                          variant="contained"
                          className="bg-red-500 text-white hover:bg-red-600"
                          size="small"
                          color="error"
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

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
      </div>
    </div>
  );
}

export default AdminDashboard;