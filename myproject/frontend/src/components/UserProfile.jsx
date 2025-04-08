import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { FaEnvelope } from "react-icons/fa";
import Modal from "react-modal";
import { AuthContext } from "../AuthContext"; // Import AuthContext

Modal.setAppElement("#root");

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { setHasMessages } = useContext(AuthContext); // Access setHasMessages from context

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userResponse = await axios.get(
          `http://localhost:8000/api/users/${id}/`
        );
        setUser(userResponse.data);

        const productsResponse = await axios.get(
          `http://localhost:8000/api/users/${id}/products/`
        );
        setProducts(productsResponse.data);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const token = Cookies.get("token");

    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/messages/send/",
        {
          recipient: id,
          content: message,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("");
      setIsModalOpen(false);
      alert("Сообщение отправлено!");
      setHasMessages(true); // Update context to indicate new messages

      // Optional: Fetch updated message status (can be optimized with context)
      const messagesResponse = await axios.get(
        "http://localhost:8000/api/messages/has-messages/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Remove this reload in production; rely on context instead
      // window.location.reload();
    } catch (err) {
      console.error("Ошибка при отправке сообщения:", err);
      alert("Не удалось отправить сообщение: " + err.message);
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
  if (!user)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Пользователь не найден
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col items-center mb-8">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Аватар пользователя"
                className="w-32 h-32 rounded-full object-cover mb-4"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mb-4">
                <span className="text-gray-500 dark:text-gray-400">
                  Нет фото
                </span>
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white text-center">
              {user.first_name} {user.last_name}
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-blue-500 hover:text-blue-600"
            >
              <FaEnvelope size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Электронная почта:</strong> {user.email}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Телефон:</strong>{" "}
              {user.show_phone ? user.phone || "Не указан" : "Скрыт"}
            </p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">
            Товары пользователя
          </h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="block bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md transition-transform hover:scale-[1.005] cursor-pointer"
                >
                  <div className="relative h-48 w-full mb-4 rounded-lg overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400">
                          Нет изображения
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    <strong>Цена:</strong> {product.price} руб.
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              У этого продавца пока нет товаров.
            </p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold mb-4">Отправить сообщение</h2>
        <form onSubmit={handleSendMessage}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            rows="4"
            placeholder="Введите ваше сообщение..."
            required
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Отправить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile;