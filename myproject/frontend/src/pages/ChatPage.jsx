import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import Header from "../components/Header";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../index.css";
import { FaEdit, FaTrash } from "react-icons/fa";

const MediaGallery = ({ mediaFiles, onClose, onShowInChat }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Медиафайлы</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Закрыть
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mediaFiles.length > 0 ? (
            mediaFiles.map((file, index) => (
              <div key={index} className="relative">
                {file.type === "image" ? (
                  <img
                    src={file.url}
                    alt="media"
                    className="w-full h-48 object-cover rounded-lg shadow-md hover:scale-105 transition-transform"
                  />
                ) : (
                  <video
                    controls
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  >
                    <source src={file.url} type="video/mp4" />
                    Ваш браузер не поддерживает видео.
                  </video>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  {new Date(file.timestamp).toLocaleDateString()}
                </div>
                <button
                  onClick={() => onShowInChat(file.messageId)}
                  className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Показать в чате
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center col-span-full">
              Медиафайлы отсутствуют
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [partner, setPartner] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  // WebSocket connection and message handling - completely rewritten
  useEffect(() => {
    let ws = null;
    
    const connectWebSocket = () => {
      const token = getToken();
      if (!token || !id || !currentUserId) return null;
      
      console.log("Connecting to WebSocket...", id);
      
      // Create WebSocket connection
      const newWs = new WebSocket(`ws://localhost:8000/ws/chat/${id}/?token=${token}`);
      
      newWs.onopen = () => {
        console.log("WebSocket connected for chat:", id);
        setIsConnected(true);
        
        // Check partner's online status when connected
        newWs.send(JSON.stringify({
          type: 'check_online',
          partner_id: id
        }));
      };
      
      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          console.log("Message type:", data.type);
          
          if (data.type === 'message') {
            const newMessage = data.message;
            console.log("New message received:", newMessage);
            
            // Only add this message if it doesn't already exist in our state
            if (newMessage && typeof newMessage.id !== 'undefined') {
              setMessages(prevMessages => {
                // Check for existing message
                const existingMessage = prevMessages.find(msg => msg.id === newMessage.id);
                if (existingMessage) {
                  console.log(`Message ${newMessage.id} already exists, not adding again`);
                  return prevMessages;
                }
                
                console.log(`Adding message ${newMessage.id} to state`);
                return [...prevMessages, newMessage];
              });
            }
          } else if (data.type === 'update') {
            console.log("Message update received");
            // Handle message update
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === data.message.id 
                  ? { ...msg, content: data.message.content }
                  : msg
              )
            );
          } else if (data.type === 'delete') {
            console.log("Message delete received");
            // Handle message deletion
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg.id !== data.message_id)
            );
          } else if (data.type === 'online_status' || data.type === 'status') {
            // Handle online status updates
            if (data.user_id === id) {
              if (data.type === 'online_status') {
                console.log("Partner online status:", data.is_online);
                setIsPartnerOnline(data.is_online);
              } else if (data.type === 'status') {
                console.log("Partner status update:", data.status);
                setIsPartnerOnline(data.status === 'online');
              }
            }
          } else if (data.type === 'messages_read') {
            // Mark messages as read
            if (data.reader_id !== currentUserId) {
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  data.message_ids.includes(msg.id)
                    ? { ...msg, is_read: true }
                    : msg
                )
              );
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      newWs.onclose = (event) => {
        console.log("WebSocket disconnected with code:", event.code);
        setIsConnected(false);
        setIsPartnerOnline(false);
        
        // Try to reconnect if the connection was closed unexpectedly
        if (event.code !== 1000) {
          console.log("Attempting to reconnect in 3 seconds...");
          setTimeout(() => {
            // Only attempt reconnection if component is still mounted
            if (socket !== null) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
      
      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Ошибка WebSocket соединения");
      };
      
      return newWs;
    };
    
    // Initial connection
    ws = connectWebSocket();
    setSocket(ws);
    
    // Cleanup function
    return () => {
      console.log("Cleaning up WebSocket connection");
      if (ws) {
        // Update the socket reference to null before closing
        setSocket(null);
        // Use a clean close code to prevent reconnection attempts
        ws.close(1000, "Component unmounted");
      }
    };
  }, [id, currentUserId]);

  // Effect for scrolling to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]); // Runs when the messages array changes

  // Effect to mark messages as read when received
  useEffect(() => {
    if (socket && isConnected && messages.length > 0) {
      // Find any unread messages from partner
      const unreadMessages = messages.filter(
        msg => msg.sender.id !== currentUserId && !msg.is_read
      );
      
      // Mark them as read through WebSocket if there are any
      if (unreadMessages.length > 0) {
        socket.send(JSON.stringify({
          type: 'mark_read',
          message_ids: unreadMessages.map(msg => msg.id)
        }));
      }
    }
  }, [messages, currentUserId, socket, isConnected]);

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
          `http://localhost:8000/api/profile/${id}/`,
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
    fetchMessages(); // Load initial messages
    
    // Set up polling as fallback if WebSocket fails
    const pollingInterval = setInterval(() => {
      if (!isConnected) {
        console.log("WebSocket not connected, polling for messages");
        fetchMessages();
      }
    }, 10000); // Poll every 10 seconds if WebSocket is down
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [id, isConnected]);

  useEffect(() => {
    const media = messages
      .filter((msg) => msg.content.startsWith("Файл: "))
      .map((msg) => {
        const fileUrl = msg.content.split("Файл: ")[1];
        const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png)$/) != null;
        const isVideo = fileUrl.match(/\.(mp4|webm|ogg)$/) != null;
        return {
          url: fileUrl,
          type: isImage ? "image" : isVideo ? "video" : "unknown",
          timestamp: msg.timestamp,
          messageId: msg.id,
        };
      })
      .filter((file) => file.type !== "unknown");
    setMediaFiles(media);
  }, [messages]);

  // Separate function to handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
      return;
    }
    if (!newMessage.trim()) {
      toast.error("Сообщение не может быть пустым.");
      return;
    }
    
    const messageToSend = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX
    
    // Create a temporary message to show immediately in the UI
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: messageToSend,
      sender: {
        id: currentUserId,
        first_name: "", // Will be replaced with actual data when message is received back
        last_name: ""
      },
      timestamp: new Date().toISOString(),
      is_read: false,
      isSending: true // Flag to show it's still sending
    };
    
    // Add temp message to state
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    
    try {
      if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
        console.log("Sending message via WebSocket:", messageToSend);
        
        // Send via WebSocket
        socket.send(JSON.stringify({
          type: 'message',
          content: messageToSend,
          recipient_id: id
        }));
        
        // The real message will come back through the WebSocket and replace our temp message
      } else {
        console.log("WebSocket not connected, using REST API");
        // Fallback to REST API
        const response = await axios.post(
          "http://localhost:8000/api/messages/send/",
          { recipient_id: id, content: messageToSend },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("Message sent via REST API, response:", response.data);
        
        // Replace our temp message with the real one from the server
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? response.data : msg
          )
        );
        
        // Try to reconnect WebSocket
        if (socket && socket.readyState !== WebSocket.OPEN) {
          console.log("Attempting to reconnect WebSocket after REST API message...");
          const newWs = new WebSocket(`ws://localhost:8000/ws/chat/${id}/?token=${token}`);
          setSocket(newWs);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Не удалось отправить сообщение: " + (err.message || "Неизвестная ошибка"));
      
      // Mark the temp message as failed
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempId 
            ? { ...msg, isSending: false, sendFailed: true } 
            : msg
        )
      );
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxImageSize = 5 * 1024 * 1024;
    const maxVideoSize = 20 * 1024 * 1024;

    if (file.type.startsWith("image/")) {
      if (file.size > maxImageSize) {
        toast.error("Изображение слишком большое. Максимальный размер: 5MB.");
        return;
      }
    } else if (file.type.startsWith("video/")) {
      if (file.size > maxVideoSize) {
        toast.error("Видео слишком большое. Максимальный размер: 20MB.");
        return;
      }
    } else {
      toast.error("Пожалуйста, загрузите изображение или видео.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
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

      if (socket && isConnected) {
        // Send via WebSocket
        socket.send(JSON.stringify({
          type: 'message',
          content: `Файл: ${fileUrl}`,
          recipient_id: id
        }));
      } else {
        // Fallback to REST API
        const messageResponse = await axios.post(
          "http://localhost:8000/api/messages/send/",
          { recipient_id: id, content: `Файл: ${fileUrl}` },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages((prevMessages) => [...prevMessages, messageResponse.data]);
      }
      
      // Scrolling will be handled by the useEffect hook watching 'messages'
      // setTimeout(() => {
      //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // }, 0);
    } catch (err) {
      console.error("Ошибка:", err.response?.data || err.message);
      toast.error(
        "Не удалось загрузить файл: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const startEditing = (message) => {
    const isImage = message.content.match(/\.(jpeg|jpg|gif|png)$/) != null;
    const isVideo = message.content.match(/\.(mp4|webm|ogg)$/) != null;
    if (isImage || isVideo) {
      toast.error("Медиафайлы нельзя редактировать.");
      return;
    }
    setEditingMessageId(message.id);
    setEditedContent(message.content);
  };

  const saveEditedMessage = async (messageId) => {
    const token = getToken();
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
      return;
    }
    
    if (socket && isConnected) {
      // Send via WebSocket
      socket.send(JSON.stringify({
        type: 'edit',
        message_id: messageId,
        content: editedContent
      }));
      
      setEditingMessageId(null);
      setEditedContent("");
    } else {
      // Fallback to REST API
      try {
        const response = await axios.patch(
          `http://localhost:8000/api/messages/${messageId}/`,
          { content: editedContent },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.id === messageId ? response.data : msg))
        );
        setEditingMessageId(null);
        setEditedContent("");
      } catch (err) {
        console.error("Ошибка при редактирования сообщения:", err);
        toast.error("Не удалось отредактировать сообщение: " + err.message);
      }
    }
  };

  const deleteMessageAction = async (messageId) => {
    const token = getToken();
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
      return;
    }
    
    if (socket && isConnected) {
      // Send via WebSocket
      socket.send(JSON.stringify({
        type: 'delete',
        message_id: messageId
      }));
      
      toast.success("Сообщение успешно удалено!");
    } else {
      // Fallback to REST API
      try {
        await axios.delete(
          `http://localhost:8000/api/messages/${messageId}/delete/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== messageId)
        );
        toast.success("Сообщение успешно удалено!");
      } catch (err) {
        console.error("Ошибка при удалении сообщения:", err);
        toast.error("Не удалось удалить сообщение: " + err.message);
      }
    }
  };

  const confirmDeleteMessage = (messageId) => {
    toast(
      <div>
        <p>Вы уверены, что хотите удалить это сообщение?</p>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              deleteMessageAction(messageId);
              toast.dismiss();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded mr-2"
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

  const deleteMessage = (messageId) => {
    confirmDeleteMessage(messageId);
  };

  const openMediaGallery = () => setIsMediaGalleryOpen(true);
  const closeMediaGallery = () => setIsMediaGalleryOpen(false);

  const showInChat = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth" });
    }
    closeMediaGallery();
  };

  const filteredMessages = selectedDate
    ? messages.filter(
        (msg) =>
          new Date(msg.timestamp).toDateString() === selectedDate.toDateString()
      )
    : searchQuery
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Сортировка сообщений по времени
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Функция для получения даты без времени
  const getDateWithoutTime = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSearchQuery("");
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
          {isPartnerOnline && (
            <span className="ml-3 text-sm px-2 py-1 bg-green-500 text-white rounded-full">
              Онлайн
            </span>
          )}
        </h1>
        <div className="flex justify-between mb-6">
          <button
            onClick={openMediaGallery}
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-md"
          >
            Показать медиафайлы
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"
            >
              🔍
            </button>
            {isSearchOpen && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск сообщений..."
                className="p-2 border rounded-lg"
              />
            )}
            <div className="relative w-32">
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                className="p-2 border rounded-lg w-full"
                placeholderText="📅"
                popperPlacement="bottom-start"
              />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 max-h-[70vh] overflow-y-auto custom-scrollbar flex justify-center items-center">
          {sortedMessages.length === 0 ? (
            <p className="text-gray-500 text-center">Отправьте сообщение</p>
          ) : (
            <div className="space-y-4 w-full">
              {sortedMessages.map((msg, index) => {
                const messageDate = getDateWithoutTime(msg.timestamp);
                const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
                const prevDate = prevMessage
                  ? getDateWithoutTime(prevMessage.timestamp)
                  : null;
                const showDateHeader =
                  index === 0 || messageDate.getTime() !== prevDate?.getTime();
                const formattedDate = messageDate.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                });
                const isOwnMessage = msg.sender.id === currentUserId;
                const isEditing = editingMessageId === msg.id;
                const fileUrl = msg.content.startsWith("Файл: ")
                  ? msg.content.split("Файл: ")[1]
                  : msg.content;
                const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png)$/) != null;
                const isVideo = fileUrl.match(/\.(mp4|webm|ogg)$/) != null;
                // Check if this is a temporary message still sending
                const isSending = msg.isSending === true;
                const sendFailed = msg.sendFailed === true;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-4">
                        <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-1 rounded-full text-sm">
                          {formattedDate}
                        </span>
                      </div>
                    )}
                    <div
                      ref={(el) => (messageRefs.current[msg.id] = el)}
                      className={`flex w-full ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`message p-3 rounded-lg max-w-md ${
                          isOwnMessage
                            ? "bg-green-100 dark:bg-green-700"
                            : "bg-blue-100 dark:bg-blue-700"
                        } ${isSending ? "opacity-70" : ""} ${sendFailed ? "border-red-500 border" : ""}`}
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
                            ) : isVideo ? (
                              <video controls className="max-w-full h-auto">
                                <source src={fileUrl} type="video/mp4" />
                                Ваш браузер не поддерживает видео.
                              </video>
                            ) : (
                              <p className="text-gray-800 dark:text-white">
                                {msg.content}
                              </p>
                            )}
                            {isOwnMessage && !isSending && !sendFailed && (
                              <div className="flex justify-end gap-2 mt-2">
                                {!isImage && !isVideo && (
                                  <button
                                    onClick={() => startEditing(msg)}
                                    className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500"
                                    title="Редактировать"
                                    aria-label="Редактировать сообщение"
                                  >
                                    <FaEdit size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-500"
                                  title="Удалить"
                                  aria-label="Удалить сообщение"
                                >
                                  <FaTrash size={16} />
                                </button>
                              </div>
                            )}
                            {sendFailed && (
                              <div className="mt-2 text-red-600 text-xs flex justify-between items-center">
                                <span>Ошибка отправки</span>
                                <button 
                                  onClick={() => {
                                    // Remove failed message
                                    setMessages(msgs => msgs.filter(m => m.id !== msg.id));
                                    // Put the content back in the input
                                    setNewMessage(msg.content);
                                  }}
                                  className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-xs"
                                >
                                  Повторить
                                </button>
                              </div>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-300 block mt-2 flex items-center">
                              {new Date(msg.timestamp).toLocaleString()}
                              {isSending && (
                                <span className="ml-2 text-yellow-600 animate-pulse">Отправка...</span>
                              )}
                              {isOwnMessage && !isSending && !sendFailed && msg.is_read && (
                                <span className="ml-2 text-blue-500">Прочитано</span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-md">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="p-2 bg-indigo-500 text-white text-lg font-bold rounded-full hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors duration-200"
          >
            📁
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
            onClick={handleSendMessage}
            className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200 shadow-md text-3xl"
          >
            ➤
          </button>
        </div>
      </div>
      {isMediaGalleryOpen && (
        <MediaGallery
          mediaFiles={mediaFiles}
          onClose={closeMediaGallery}
          onShowInChat={showInChat}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default ChatPage;