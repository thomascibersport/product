import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import Header from "../components/Header";

const ChatPage = () => {
  const { id } = useParams(); // ID собеседника из URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [partner, setPartner] = useState(null); // Данные собеседника
  const [currentUserId, setCurrentUserId] = useState(null); // ID текущего пользователя
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Функция для получения данных текущего пользователя
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Требуется авторизация");
        }
        const response = await axios.get(
          "http://localhost:8000/api/users/me/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCurrentUserId(response.data.id);
      } catch (err) {
        console.error("Ошибка при загрузке данных текущего пользователя:", err);
        setError(err.message);
      }
    };

    // Функция для получения данных собеседника
    const fetchPartner = async () => {
      try {
        const token = getToken();
        const response = await axios.get(
          `http://localhost:8000/api/users/${id}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setPartner(response.data);
      } catch (err) {
        console.error("Ошибка при загрузке данных пользователя:", err);
      }
    };

    // Функция для получения сообщений
    const fetchMessages = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Требуется авторизация");
        }
        const response = await axios.get(
          `http://localhost:8000/api/messages/chat/${id}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setMessages(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Выполняем первоначальную загрузку
    fetchCurrentUser();
    fetchPartner();
    fetchMessages();

    // Устанавливаем интервал для обновления сообщений
    const intervalId = setInterval(fetchMessages, 5000);

    // Очищаем интервал при размонтировании
    return () => clearInterval(intervalId);
  }, [id]);

  // Отправка нового сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:8000/api/messages/send/",
        {
          recipient: id,
          content: newMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages([...messages, response.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Ошибка при отправке сообщения:", err);
      alert("Не удалось отправить сообщение: " + err.message);
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  if (error)
    return (
      <div className="text-center py-10 text-red-500">Ошибка: {error}</div>
    );
  if (!currentUserId)
    return (
      <div className="text-center py-10">Загрузка данных пользователя...</div>
    );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Чат с{" "}
          {partner
            ? `${partner.first_name} ${partner.last_name}`
            : "пользователем"}
        </h1>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="space-y-4">
            {messages.map((msg) => {
              console.log("currentUserId:", currentUserId);
              console.log("msg.sender:", msg.sender);
              console.log("Comparison:", Number(msg.sender) === currentUserId);
              return (
                <div
                  key={msg.id}
                  data-sender={msg.sender}
                  className={`flex w-full ${
                    Number(msg.sender) === currentUserId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg max-w-md ${
                      Number(msg.sender) === currentUserId
                        ? "bg-green-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={handleSendMessage} className="mt-4">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              rows="3"
              placeholder="Введите сообщение..."
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
