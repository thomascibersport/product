import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getToken } from "../utils/auth";
import Header from "../components/Header";

const MessagesPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Требуется авторизация");
        const response = await axios.get("http://localhost:8000/api/messages/chats/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-600 dark:text-gray-400">Загрузка...</div>;
  if (error) return <div className="text-center py-10 text-red-500 dark:text-red-400">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          💬 Мои чаты
        </h1>
        {chats.length > 0 ? (
          <div className="space-y-4">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="block bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={chat.avatar || "/media/default-avatar.png"}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {chat.first_name} {chat.last_name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {chat.last_message ? chat.last_message.content : "Нет сообщений"}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">
                    {chat.last_message ? new Date(chat.last_message.timestamp).toLocaleTimeString() : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform transition hover:scale-105">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                У вас пока нет чатов
              </p>
              <button
                onClick={() => window.location.href = "/"}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
              >
                Вернуться к покупкам
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;