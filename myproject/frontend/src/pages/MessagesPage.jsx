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
        if (!token) {
          throw new Error("Требуется авторизация");
        }
        const response = await axios.get("http://localhost:8000/api/messages/chats/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Мои чаты</h1>
        {chats.length > 0 ? (
          <ul className="space-y-4">
            {chats.map((chat) => (
              <li key={chat.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <Link
                  to={`/chat/${chat.id}`}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {chat.first_name} {chat.last_name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">У вас пока нет чатов.</p>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;