import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import Header from "../components/Header";
import "../index.css";

const ChatPage = () => {
  const { id } = useParams(); // ID собеседника из URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [partner, setPartner] = useState(null); // Данные собеседника
  const [currentUserId, setCurrentUserId] = useState(null); // ID текущего пользователя
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null); // ID редактируемого сообщения
  const [editedContent, setEditedContent] = useState(""); // Содержимое редактируемого сообщения
  const messagesEndRef = useRef(null); // Для прокрутки к последнему сообщению
  const fileInputRef = useRef(null); // Для доступа к input type="file"

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Требуется авторизация");
        const response = await axios.get(
          "http://localhost:8000/api/users/me/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCurrentUserId(response.data.id);
      } catch (err) {
        setError(err.message);
      }
    };

    const fetchPartner = async () => {
      try {
        const token = getToken();
        const response = await axios.get(
          `http://localhost:8000/api/users/${id}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPartner(response.data);
      } catch (err) {
        console.error("Ошибка при загрузке данных пользователя:", err);
      }
    };

    const fetchMessages = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Требуется авторизация");
        const response = await axios.get(
          `http://localhost:8000/api/messages/chat/${id}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCurrentUser();
    fetchPartner();
    fetchMessages();

    const intervalId = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        { recipient: id, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...messages, response.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Ошибка при отправке сообщения:", err);
      alert("Не удалось отправить сообщение: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимальный размер: 5MB.");
      return;
    }

    const token = getToken();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadResponse = await axios.post(
        "http://localhost:8000/api/upload/",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const fileUrl = uploadResponse.data.url;

      const messageResponse = await axios.post(
        "http://localhost:8000/api/messages/send/",
        { recipient: id, content: `Файл: ${fileUrl}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages([...messages, messageResponse.data]);
    } catch (err) {
      console.error("Ошибка:", err.response?.data || err.message);
      alert(
        "Не удалось загрузить файл: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const startEditing = (message) => {
    const isImage = message.content.match(/\.(jpeg|jpg|gif|png)$/) != null;
    if (isImage) {
      alert("Изображения нельзя редактировать.");
      return;
    }
    setEditingMessageId(message.id);
    setEditedContent(message.content);
  };

  const saveEditedMessage = async (messageId) => {
    const token = getToken();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      const response = await axios.patch(
        `http://localhost:8000/api/messages/${messageId}/`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(
        messages.map((msg) => (msg.id === messageId ? response.data : msg))
      );
      setEditingMessageId(null);
      setEditedContent("");
    } catch (err) {
      console.error("Ошибка при редактировании сообщения:", err);
      alert("Не удалось отредактировать сообщение: " + err.message);
    }
  };

  const deleteMessage = async (messageId) => {
    const token = getToken();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }

    const isConfirmed = window.confirm(
      "Вы уверены, что хотите удалить это сообщение?"
    );
    if (!isConfirmed) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:8000/api/messages/${messageId}/delete/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(messages.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error("Ошибка при удалении сообщения:", err);
      alert("Не удалось удалить сообщение: " + err.message);
    }
  };

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-10 text-red-500 dark:text-red-400">
        Ошибка: {error}
      </div>
    );
  if (!currentUserId)
    return (
      <div className="text-center py-10">Загрузка данных пользователя...</div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
          <img
            src={partner?.avatar || "/media/default-avatar.png"}
            alt="Avatar"
            className="w-10 h-10 rounded-full mr-3"
          />
          Чат с{" "}
          {partner
            ? `${partner.first_name} ${partner.last_name}`
            : "пользователем"}
        </h1>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwnMessage = Number(msg.sender) === currentUserId;
              const isEditing = editingMessageId === msg.id;
              const isImage =
                msg.content.match(/\.(jpeg|jpg|gif|png)$/) != null;
              const fileUrl = msg.content.startsWith("Файл: ")
                ? msg.content.split("Файл: ")[1]
                : msg.content;

              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`message p-3 rounded-lg max-w-md ${
                      isOwnMessage
                        ? "bg-green-100 dark:bg-green-700"
                        : "bg-blue-100 dark:bg-blue-700"
                    }`}
                  >
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />
                        <div className="mt-2">
                          <button
                            onClick={() => saveEditedMessage(msg.id)}
                            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="ml-2 px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {isImage ? (
                          <img
                            src={fileUrl}
                            alt="uploaded"
                            className="max-w-full h-auto"
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-white">
                            {msg.content}
                          </p>
                        )}
                        {isOwnMessage && !isImage && (
                          <div className="mt-2">
                            <button
                              onClick={() => startEditing(msg)}
                              className="text-sm text-blue-500 hover:underline mr-4"
                            >
                              Редактировать
                            </button>
                          </div>
                        )}
                        {isOwnMessage && (
                          <div className="mt-2">
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="text-sm text-red-500 hover:underline"
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-md"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="p-2 bg-indigo-500 text-white text-lg font-bold rounded-full hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors duration-200"
          >
            📎
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-sm"
            rows="1"
            placeholder="Введите сообщение..."
            required
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors duration-200 shadow-md"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
