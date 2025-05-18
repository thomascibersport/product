import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const AssistantPage = () => {
  // Состояние для всех чатов
  const [chats, setChats] = useState([]);
  // Активный чат ID
  const [activeChat, setActiveChat] = useState(null);
  // Текущие сообщения в активном чате
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [showChatList, setShowChatList] = useState(false);

  // Загрузка чатов из localStorage при первом рендере
  useEffect(() => {
    const savedChats = localStorage.getItem("assistantChats");
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        
        // Восстановление последнего активного чата или выбор первого доступного
        const lastActiveChat = localStorage.getItem("lastActiveChat");
        if (lastActiveChat && parsedChats.some(chat => chat.id === lastActiveChat)) {
          setActiveChat(lastActiveChat);
          const chat = parsedChats.find(c => c.id === lastActiveChat);
          setMessages(chat.messages || []);
        } else if (parsedChats.length > 0) {
          setActiveChat(parsedChats[0].id);
          setMessages(parsedChats[0].messages || []);
        }
      } catch (error) {
        console.error("Ошибка при загрузке сохраненных чатов:", error);
        // Создаем новый чат при ошибке
        createNewChat("Новый чат");
      }
    } else {
      // Если нет сохраненных чатов, создаем новый
      createNewChat("Новый чат");
    }
  }, []);

  // Сохранение чатов в localStorage при их изменении
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("assistantChats", JSON.stringify(chats));
    }
    
    // Сохраняем ID активного чата
    if (activeChat) {
      localStorage.setItem("lastActiveChat", activeChat);
    }
  }, [chats, activeChat]);

  // Обновление сообщений активного чата при их изменении
  useEffect(() => {
    if (activeChat) {
      updateChatMessages(activeChat, messages);
    }
  }, [messages]);

  // Функция для обновления сообщений в конкретном чате
  const updateChatMessages = (chatId, newMessages) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, messages: newMessages } : chat
      )
    );
  };

  // Функция для создания нового чата
  const createNewChat = (name = "Новый чат") => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      name: name,
      messages: []
    };
    
    setChats(prevChats => [...prevChats, newChat]);
    setActiveChat(newChatId);
    setMessages([]);
    setNewChatName("");
    setShowNewChatDialog(false);
  };

  // Функция для переключения на другой чат
  const switchChat = (chatId) => {
    if (chatId === activeChat) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chatId);
      setMessages(chat.messages || []);
      setShowChatList(false);
    }
  };

  // Функция для удаления чата
  const deleteChat = (chatId, event) => {
    event.stopPropagation();
    
    if (chats.length === 1) {
      // Если это единственный чат, создаем новый пустой чат
      createNewChat("Новый чат");
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    } else {
      setChats(prevChats => {
        const filteredChats = prevChats.filter(chat => chat.id !== chatId);
        
        // Если удаляемый чат был активным, переключаемся на первый доступный
        if (chatId === activeChat && filteredChats.length > 0) {
          setActiveChat(filteredChats[0].id);
          setMessages(filteredChats[0].messages || []);
        }
        
        return filteredChats;
      });
    }
  };

  // Функция для переименования чата
  const renameChat = (chatId, newName, event) => {
    event.stopPropagation();
    
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, name: newName } : chat
      )
    );
  };

  // Отправка сообщения в чат
  const sendMessage = async (type = "question") => {
    if (!input.trim() && type === "question") return;
    if (!activeChat) return;

    setLoading(true);
    setError(null);
    const token = Cookies.get("token");

    let data;
    if (type === "question") {
      const conversation = messages.map((msg) => ({
        role: msg.sender,
        text: msg.text,
      }));
      conversation.push({ role: "user", text: input });
      data = { messages: conversation, type: type };
    } else {
      data = { type: type };
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/assistant/",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedMessages = [
        ...messages,
        { text: type === "question" ? input : "Запросить рецепт на основе моих заказов", sender: "user" },
        { text: response.data.response, sender: "assistant", isRecipe: type === "recipe" },
      ];
      
      setMessages(updatedMessages);
      
      // Если это первое сообщение в чате без названия, используем часть сообщения как название
      if (messages.length === 0) {
        const activeChateObj = chats.find(chat => chat.id === activeChat);
        if (activeChateObj && activeChateObj.name === "Новый чат") {
          const newName = input.length > 20 ? input.substring(0, 20) + "..." : input;
          renameChat(activeChat, newName, { stopPropagation: () => {} });
        }
      }
      
      if (type === "question") {
        setInput("");
      }
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      setError("Не удалось отправить запрос. Проверьте подключение или токен.");
    } finally {
      setLoading(false);
    }
  };

  const requestRecipe = async () => {
    setLoading(true);
    setError(null);
    const token = Cookies.get("token");

    // Запрашиваем рецепт на основе заказов за последние 3 дня
    const data = { 
      type: "recipe",
      days: 3 // Указываем период в 3 дня для получения данных заказов
    };

    try {
      const response = await axios.post(
        "http://localhost:8000/api/assistant/recipe",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedMessages = [
        ...messages,
        { text: "Запросить рецепт на основе моих заказов за последние 3 дня", sender: "user" },
        { text: response.data.response, sender: "assistant", isRecipe: true },
      ];
      
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Ошибка при запросе рецепта:", error);
      setError("Не удалось запросить рецепт. Проверьте подключение или токен.");
    } finally {
      setLoading(false);
    }
  };

  // Функция для очистки истории текущего чата
  const clearChatHistory = () => {
    setMessages([]);
    updateChatMessages(activeChat, []);
  };

  // Функция для форматирования текста рецепта
  const formatRecipeText = (text) => {
    if (!text) return "";

    // Разделяем на параграфы
    const paragraphs = text.split("\n\n");
    
    return (
      <div className="recipe-container">
        {paragraphs.map((paragraph, index) => {
          // Определяем, является ли параграф заголовком
          const isTitle = index === 0 || paragraph.length < 50 && !paragraph.includes(":");
          
          // Проверяем, является ли параграф списком ингредиентов
          const isIngredientsList = paragraph.includes("Ингредиенты") || 
                                   (paragraph.includes(":") && paragraph.split("\n").some(line => line.match(/[-•*]\s/)));
          
          // Проверяем, является ли параграф шагами приготовления
          const isSteps = paragraph.includes("Приготовление") || 
                          paragraph.includes("Шаги") || 
                          paragraph.includes("Инструкция");

          if (isTitle) {
            return (
              <h3 key={index} className="font-bold text-lg mb-2">
                {paragraph}
              </h3>
            );
          } else if (isIngredientsList) {
            // Форматируем список ингредиентов
            const lines = paragraph.split("\n");
            const title = lines[0];
            const ingredients = lines.slice(1);
            
            return (
              <div key={index} className="mb-3">
                <h4 className="font-medium text-md mb-2">{title}</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {ingredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient.replace(/^[-•*]\s/, "")}</li>
                  ))}
                </ul>
              </div>
            );
          } else if (isSteps) {
            // Форматируем шаги приготовления
            const lines = paragraph.split("\n");
            const title = lines[0];
            const steps = lines.slice(1);
            
            return (
              <div key={index} className="mb-3">
                <h4 className="font-medium text-md mb-2">{title}</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {steps.map((step, idx) => {
                    // Удаляем номера, если они есть
                    const cleanStep = step.replace(/^\d+\.\s*/, "");
                    return cleanStep.trim() ? <li key={idx}>{cleanStep}</li> : null;
                  })}
                </ol>
              </div>
            );
          } else {
            // Обычный параграф
            return <p key={index} className="mb-2">{paragraph}</p>;
          }
        })}
      </div>
    );
  };

  // Получаем имя активного чата
  const activeChatName = activeChat ? chats.find(chat => chat.id === activeChat)?.name || "Чат" : "Чат";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Панель инструментов с выбором чата */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="relative">
              <button 
                onClick={() => setShowChatList(!showChatList)}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 mr-2"
              >
                <span className="mr-2 font-medium truncate max-w-xs">{activeChatName}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Выпадающий список чатов */}
              {showChatList && (
                <div className="absolute mt-1 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                  <div className="py-2">
                    {chats.map(chat => (
                      <div 
                        key={chat.id} 
                        onClick={() => switchChat(chat.id)}
                        className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer ${chat.id === activeChat ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                      >
                        <span className="truncate max-w-xs">{chat.name}</span>
                        <div className="flex space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const newName = prompt("Введите новое название чата:", chat.name);
                              if (newName) renameChat(chat.id, newName, e);
                            }}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div 
                      onClick={() => setShowNewChatDialog(true)}
                      className="flex items-center px-4 py-2 text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Новый чат</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowNewChatDialog(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              + Новый чат
            </button>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Очистить чат
            </button>
          )}
        </div>

        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        
        {/* Основной блок сообщений */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-400 text-center py-10">
              <p>Чат пуст. Начните общение с ИИ-помощником!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 p-3 rounded ${
                  msg.sender === "user"
                    ? "bg-blue-100 dark:bg-blue-900 text-right"
                    : msg.isRecipe 
                      ? "bg-green-50 dark:bg-green-900 text-left border-l-4 border-green-400"
                      : "bg-gray-100 dark:bg-gray-700 text-left"
                }`}
              >
                {msg.sender === "user" || !msg.isRecipe 
                  ? msg.text 
                  : formatRecipeText(msg.text)}
              </div>
            ))
          )}
        </div>
        
        {/* Форма ввода сообщения */}
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите ваш вопрос или запрос..."
            className="flex-1 p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage("question")}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Отправить вопрос
          </button>
          <button
            onClick={requestRecipe}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Запросить рецепт
          </button>
        </div>
      </div>
      
      {/* Модальное окно создания нового чата */}
      {showNewChatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Создать новый чат</h3>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Название чата"
              className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewChatDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={() => createNewChat(newChatName || "Новый чат")}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantPage;