import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { Link } from "react-router-dom";

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
  // Ref для отслеживания кликов вне выпадающего списка
  const chatListRef = useRef(null);
  // Ref для автоматической прокрутки сообщений вниз
  const messagesEndRef = useRef(null);

  const [chatMode, setChatMode] = useState("chat"); // 'chat', 'dishRecipe', 'myOrdersRecipe'

  // Функция для прокрутки чата вниз
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  
  // Автоматическая прокрутка при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Обработчик кликов вне выпадающего списка
  useEffect(() => {
    function handleClickOutside(event) {
      if (chatListRef.current && !chatListRef.current.contains(event.target)) {
        setShowChatList(false);
      }
    }

    // Добавляем слушатель событий только когда список открыт
    if (showChatList) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Очистка слушателя при размонтировании
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showChatList]);

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

  const handleSendMessage = async () => {
    if (!activeChat) return;

    setError(null);

    if (chatMode === "chat") {
      if (!input.trim()) return;
      setLoading(true);
      const token = Cookies.get("token");
      const conversation = messages.map((msg) => ({
        role: msg.sender,
        text: msg.text,
      }));
      conversation.push({ role: "user", text: input });
      const data = { messages: conversation, type: "question" };

      try {
        const response = await axios.post("http://localhost:8000/api/assistant/", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const updatedMessages = [
          ...messages,
          { text: input, sender: "user" },
          { text: response.data.response, sender: "assistant" },
        ];
        setMessages(updatedMessages);
        if (messages.length === 0) {
          const activeChatObj = chats.find(chat => chat.id === activeChat);
          if (activeChatObj && activeChatObj.name === "Новый чат") {
            const newName = input.length > 20 ? input.substring(0, 20) + "..." : input;
            renameChat(activeChat, newName, { stopPropagation: () => {} });
          }
        }
        setInput("");
      } catch (error) {
        console.error("Ошибка при отправке сообщения:", error);
        setError("Не удалось отправить запрос. Проверьте подключение или токен.");
      } finally {
        setLoading(false);
      }
    } else if (chatMode === "dishRecipe") {
      requestDishRecipe(input);
    } else if (chatMode === "myOrdersRecipe") {
      requestMyOrdersRecipe();
    }
  };
  
  const requestDishRecipe = async (dishNameParam) => {
    if (!dishNameParam.trim()) {
      setError("Введите название блюда");
      return;
    }
    setLoading(true);
    setError(null);
    const token = Cookies.get("token");
    const data = { type: "dish_recipe", dish_name: dishNameParam };

    try {
      const response = await axios.post("http://localhost:8000/api/assistant/dish-recipe", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedMessages = [
        ...messages,
        { text: `Запросить рецепт для блюда: ${dishNameParam}`, sender: "user" },
        { 
          text: response.data.response, 
          sender: "assistant", 
          isRecipe: true,
          products: response.data.products || [],
          ingredients: response.data.ingredients || []
        },
      ];
      setMessages(updatedMessages);
      setInput(""); // Clear input after successful request
    } catch (error) {
      console.error("Ошибка при запросе рецепта для блюда:", error);
      setError("Не удалось запросить рецепт. Проверьте подключение или токен.");
    } finally {
      setLoading(false);
    }
  };

  const requestMyOrdersRecipe = async () => {
    setLoading(true);
    setError(null);
    const token = Cookies.get("token");
    const data = { type: "recipe", days: 3 }; // 'recipe' type triggers order-based recipe

    try {
      const response = await axios.post("http://localhost:8000/api/assistant/recipe", data, { // Ensure this URL is correct
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedMessages = [
        ...messages,
        { text: "Запросить рецепт на основе моих заказов за последние 3 дня", sender: "user" },
        { 
          text: response.data.response, 
          sender: "assistant", 
          isRecipe: true,
          products: response.data.products || [] 
        },
      ];
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Ошибка при запросе рецепта по заказам:", error);
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
  const formatRecipeText = (text, products, ingredients) => {
    if (!text) return "";

    // Разделяем на параграфы
    const paragraphs = text.split("\n\n");
    
    return (
      <div className="recipe-container">
        {/* Отображаем список продуктов если есть */}
        {products && products.length > 0 && (
          <div className="mb-6 bg-blue-50 dark:bg-slate-800 p-5 rounded-xl shadow-sm">
            <h4 className="font-semibold text-lg mb-3 text-blue-700 dark:text-blue-400">
              <span className="inline-block mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              Доступные продукты для этого рецепта
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product, idx) => (
                <Link 
                  to={`/product/${product.id}`} 
                  key={idx} 
                  className="flex flex-col bg-white dark:bg-slate-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1 hover:scale-102"
                >
                  <div className="p-3 flex items-start h-full">
                    <div className="w-16 h-16 flex-shrink-0 mr-3 bg-gray-100 dark:bg-slate-600 rounded-md overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-gray-800 dark:text-slate-200 mb-1 text-sm">{product.name}</h5>
                      <div className="text-xs text-gray-600 dark:text-slate-400">
                        <span className="font-medium text-blue-600 dark:text-blue-500">{product.price} ₽</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
          {paragraphs.map((paragraph, index) => {
            // Определяем, является ли параграф заголовком
            const isTitle = index === 0 || paragraph.length < 50 && !paragraph.includes(":");
            
            // Проверяем, является ли параграф списком ингредиентов
            const isIngredientsList = 
              paragraph.includes("Ингредиенты") || 
              paragraph.includes("Состав") || 
              (paragraph.includes(":") && paragraph.split("\n").some(line => line.match(/[-•*]\s/) || line.match(/^\d+\.\s/)));
            
            // Проверяем, является ли параграф шагами приготовления
            const isSteps = 
              paragraph.includes("Приготовление") || 
              paragraph.includes("Шаги") || 
              paragraph.includes("Инструкция") ||
              paragraph.includes("Способ приготовления");

            // Пропускаем параграф "Доступные продукты", так как мы уже отображаем их выше
            if (paragraph.trim().startsWith("Доступные продукты:")) {
              return null;
            }

            if (isTitle) {
              return (
                <h3 key={index} className="font-bold text-xl mb-4 text-blue-700 dark:text-blue-400">
                  {paragraph}
                </h3>
              );
            } else if (isIngredientsList) {
              // Форматируем список ингредиентов
              const lines = paragraph.split("\n");
              const title = lines[0];
              const ingredientLines = lines.slice(1);
              
              return (
                <div key={index} className="mb-6 bg-blue-50 dark:bg-slate-700 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3 flex items-center text-gray-700 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {title}
                  </h4>
                  <ul className="list-none pl-2 space-y-2">
                    {ingredientLines.map((line, idx) => {
                      // Очищаем строку от маркеров списка
                      const cleanLine = line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
                      if (!cleanLine) return null;
                      
                      // Ищем соответствующий ингредиент в списке ингредиентов
                      let matchFound = false;
                      let matchedIngredient = null;
                      let matchedProducts = [];
                      
                      if (ingredients && ingredients.length > 0) {
                        // Пытаемся найти ингредиент в строке
                        for (const ingredient of ingredients) {
                          if (cleanLine.toLowerCase().includes(ingredient.name.toLowerCase()) ||
                              (ingredient.original && cleanLine.toLowerCase().includes(ingredient.original.toLowerCase()))) {
                            matchFound = true;
                            matchedIngredient = ingredient;
                            
                            // Находим соответствующие продукты для этого ингредиента
                            if (products && products.length > 0) {
                              matchedProducts = products.filter(p => 
                                p.ingredient && p.ingredient.toLowerCase() === ingredient.name.toLowerCase()
                              );
                            }
                            break;
                          }
                        }
                      }
                      
                      return (
                        <li key={idx} className="flex flex-col">
                          <div className="flex items-center text-gray-700 dark:text-slate-300">
                            <span className={`w-4 h-4 mr-2 rounded-full flex-shrink-0 ${matchFound && matchedProducts.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            <span>{cleanLine}</span>
                          </div>
                          
                          {/* Показываем миниатюрные карточки товаров, если есть совпадения */}
                          {matchFound && matchedProducts.length > 0 && (
                            <div className="ml-6 mt-1 flex flex-wrap gap-2">
                              {matchedProducts.slice(0, 2).map((product, prodIdx) => (
                                <Link 
                                  key={prodIdx}
                                  to={`/product/${product.id}`}
                                  className="flex items-center px-2 py-1 bg-white dark:bg-slate-600 rounded-md shadow-sm hover:shadow text-xs text-gray-700 dark:text-slate-300"
                                >
                                  {product.image && (
                                    <img src={product.image} alt={product.name} className="w-4 h-4 mr-1 rounded-full object-cover" />
                                  )}
                                  <span className="truncate max-w-[100px]">{product.name}</span>
                                  <span className="ml-1 text-green-600 dark:text-green-400">{product.price} ₽</span>
                                </Link>
                              ))}
                              {matchedProducts.length > 2 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                                  +{matchedProducts.length - 2} ещё
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            } else if (isSteps) {
              // Форматируем шаги приготовления
              const lines = paragraph.split("\n");
              const title = lines[0];
              const steps = lines.slice(1);
              
              return (
                <div key={index} className="mb-6">
                  <h4 className="font-semibold text-lg mb-3 flex items-center text-gray-700 dark:text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    {title}
                  </h4>
                  <ol className="list-none pl-0 space-y-3">
                    {steps.map((step, idx) => {
                      // Удаляем номера, если они есть
                      const cleanStep = step.replace(/^\d+\.\s*/, "");
                      return cleanStep.trim() ? (
                        <li key={idx} className="flex items-start p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-gray-700 dark:text-slate-300">
                          <span className="w-6 h-6 mr-3 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold">{idx + 1}</span>
                          <span>{cleanStep}</span>
                        </li>
                      ) : null;
                    })}
                  </ol>
                </div>
              );
            } else {
              // Обычный параграф
              return <p key={index} className="mb-4 leading-relaxed text-gray-700 dark:text-slate-300">{paragraph}</p>;
            }
          })}
        </div>
      </div>
    );
  };

  // Получаем имя активного чата
  const activeChatName = activeChat ? chats.find(chat => chat.id === activeChat)?.name || "Чат" : "Чат";

  const getPlaceholder = () => {
    if (chatMode === "dishRecipe") return "Введите название блюда...";
    if (chatMode === "myOrdersRecipe") return "Запрос рецепта из ваших заказов (ввод не требуется)";
    return "Введите ваш вопрос или запрос...";
  };

  const getButtonText = () => {
    if (chatMode === "dishRecipe") return "Найти рецепт блюда";
    if (chatMode === "myOrdersRecipe") return "Рецепт из моих заказов";
    return "Отправить вопрос";
  };
  
  const modeButtonClass = (mode) => 
    `px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-sm ${
      chatMode === mode 
        ? 'bg-blue-600 text-white ring-blue-500 hover:bg-blue-700' 
        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 ring-gray-300 dark:ring-slate-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Панель инструментов с выбором чата */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="relative" ref={chatListRef}>
              <button 
                onClick={() => setShowChatList(!showChatList)}
                className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700 mr-2 transition-all duration-200"
              >
                <span className="mr-2 font-medium text-gray-700 dark:text-slate-200 truncate max-w-xs">{activeChatName}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Выпадающий список чатов */}
              {showChatList && (
                <div className="absolute mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 overflow-hidden">
                  <div className="py-2">
                    {chats.map(chat => (
                      <div 
                        key={chat.id} 
                        onClick={() => switchChat(chat.id)}
                        className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-150 text-gray-700 dark:text-slate-200 ${chat.id === activeChat ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                      >
                        <span className="truncate max-w-xs">{chat.name}</span>
                        <div className="flex space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const newName = prompt("Введите новое название чата:", chat.name);
                              if (newName) renameChat(chat.id, newName, e);
                            }}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-slate-300"
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
                      onClick={() => {
                        setShowNewChatDialog(true);
                        setShowChatList(false);
                      }}
                      className="flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
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
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Очистить чат
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-center mb-4 p-3 bg-red-100 dark:bg-red-700/30 rounded-lg border border-red-300 dark:border-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Основной блок сообщений */}
        <div className="mb-6 h-[500px] overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 h-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-lg">Чат пуст. Начните общение с ИИ-помощником!</p>
              <p className="text-sm mt-2">Задайте вопрос или запросите рецепт, выбрав режим ниже.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white ml-auto max-w-[80%]"
                      : msg.isRecipe 
                        ? "bg-white dark:bg-slate-700 border border-green-300 dark:border-green-600 mr-auto max-w-[80%]"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 mr-auto max-w-[80%]"
                  }`}>
                  {msg.sender === "user" ? (
                    <div className="flex justify-end items-start">
                      <div className="mr-2 font-medium text-right break-words">{msg.text}</div>
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-purple-600 dark:bg-purple-700 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 break-words">
                        {msg.isRecipe ? formatRecipeText(msg.text, msg.products, msg.ingredients) : <div className="text-gray-800 dark:text-slate-200">{msg.text}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Invisible element for scrolling to the bottom */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Mode Selection and Input Area */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => setChatMode("chat")} className={modeButtonClass("chat")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Обычный чат
            </button>
            <button onClick={() => setChatMode("dishRecipe")} className={modeButtonClass("dishRecipe")}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" /></svg>
              Рецепт по блюду
            </button>
            <button onClick={() => setChatMode("myOrdersRecipe")} className={modeButtonClass("myOrdersRecipe")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 5h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Рецепт из заказов
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                disabled={loading || chatMode === "myOrdersRecipe"}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && chatMode !== "myOrdersRecipe") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500">
                {chatMode === "chat" && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                {chatMode === "dishRecipe" && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" /></svg>}
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={loading || (chatMode !== "myOrdersRecipe" && !input.trim())}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 font-medium flex items-center justify-center min-w-[180px] disabled:opacity-60 shadow-sm"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  {chatMode === "chat" && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
                  {chatMode === "dishRecipe" && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
                  {chatMode === "myOrdersRecipe" && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 5h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> }
                </>
              )}
              {loading ? "Загрузка..." : getButtonText()}
            </button>
          </div>
        </div>
      </div>
      
      {/* Модальное окно создания нового чата */}
      {showNewChatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-slate-200">Создать новый чат</h3>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Название чата"
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg mb-4 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowNewChatDialog(false)} className="px-4 py-2 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors duration-200">Отмена</button>
              <button onClick={() => createNewChat(newChatName || "Новый чат")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">Создать</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        .dark .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; /* slate-800 */ }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; /* slate-600 */ }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; /* slate-500 */ }
      `}</style>
    </div>
  );
};

export default AssistantPage;