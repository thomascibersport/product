import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const AssistantPage = () => {
  console.log("AssistantPage rendered");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (type = "question") => {
    if (!input.trim() && type === "question") return;

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

      setMessages([
        ...messages,
        { text: type === "question" ? input : "Запросить рецепт на основе моих заказов", sender: "user" },
        { text: response.data.response, sender: "assistant" },
      ]);
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

    const data = { type: "recipe" };

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

      setMessages([
        ...messages,
        { text: "Запросить рецепт на основе моих заказов", sender: "user" },
        { text: response.data.response, sender: "assistant" },
      ]);
    } catch (error) {
      console.error("Ошибка при запросе рецепта:", error);
      setError("Не удалось запросить рецепт. Проверьте подключение или токен.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          🤖 ИИ Помощник
        </h1>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4 h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${
                msg.sender === "user"
                  ? "bg-blue-100 dark:bg-blue-900 text-right"
                  : "bg-gray-100 dark:bg-gray-700 text-left"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
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
    </div>
  );
};

export default AssistantPage;