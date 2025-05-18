import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getToken } from "../utils/auth";
import Header from "../components/Header";
import { useAuth } from "../AuthContext";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const MessagesPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch chats with all details in a single API call
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("Требуется авторизация");
      
      // Use the new endpoint that returns all chat details in one request
      const response = await axios.get(
        "http://localhost:8000/api/messages/chats-with-details/", 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setChats(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching chats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Function to format message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'd MMM', { locale: ru });
    }
  };

  // Function to truncate long messages
  const truncateMessage = (content, maxLength = 30) => {
    if (!content) return "";
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;
  };

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
            {chats.map((chat) => {
              // Check if last_message exists
              const hasLastMessage = chat.last_message && 
                typeof chat.last_message === 'object' && 
                Object.keys(chat.last_message).length > 0;
              
              // Check if current user sent the last message
              const currentUserSent = hasLastMessage 
                ? chat.last_message.sender.id === user?.id 
                : false;
              
              return (
                <Link
                  key={chat.id}
                  to={`/chat/${chat.id}`}
                  className={`block p-4 rounded-lg shadow-md transition-shadow ${
                    chat.unread_count > 0 
                      ? 'bg-blue-50 dark:bg-blue-900 hover:shadow-lg' 
                      : 'bg-white dark:bg-gray-800 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={chat.avatar || "/media/default-avatar.png"}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {chat.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {chat.unread_count > 9 ? '9+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                          {chat.first_name} {chat.last_name}
                        </h2>
                        
                        {hasLastMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                            {formatMessageTime(chat.last_message.timestamp)}
                          </span>
                        )}
                      </div>
                      
                      {hasLastMessage ? (
                        <div className="mt-1">
                          <p className={`text-sm truncate ${
                            chat.unread_count > 0 && !currentUserSent
                              ? 'font-medium text-gray-900 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {currentUserSent && (
                              <span className="text-blue-500 dark:text-blue-400">Вы: </span>
                            )}
                            {!currentUserSent && (
                              <span className="text-gray-600 dark:text-gray-400">{chat.first_name}: </span>
                            )}
                            {chat.last_message.content.startsWith("Файл: ") 
                              ? "📎 Медиафайл" 
                              : truncateMessage(chat.last_message.content)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Нет сообщений
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
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