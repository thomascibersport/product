import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { FaEnvelope } from "react-icons/fa";
import Modal from "react-modal";
import { AuthContext } from "../AuthContext";

Modal.setAppElement("#root");

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const { setHasMessages, user: currentUser } = useContext(AuthContext);
  const token = Cookies.get("token");

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
        if (token) {
          const reviewsResponse = await axios.get(
            `http://localhost:8000/api/users/${id}/reviews/`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setReviews(reviewsResponse.data);
        } else {
          setReviews([]);
          console.log("Токен отсутствует, отзывы недоступны");
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      await axios.post(
        `http://localhost:8000/api/users/${id}/reviews/`,
        { content: message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("");
      setIsModalOpen(false);
      alert("Сообщение отправлено!");
      setHasMessages(true);
    } catch (err) {
      console.error("Ошибка при отправке сообщения:", err);
      alert("Не удалось отправить сообщение: " + err.message);
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      const response = await axios.post(
        `http://localhost:8000/api/users/${id}/reviews/`,
        { content: reviewContent, rating: reviewRating, recipient: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newReview = response.data;
      setReviews([...reviews, newReview]);
      // Fetch updated user data to get the new average rating
      const updatedUserResponse = await axios.get(
        `http://localhost:8000/api/users/${id}/`
      );
      setUser(updatedUserResponse.data);
      setReviewContent("");
      setReviewRating(0);
      setHoverRating(0);
      setIsReviewModalOpen(false);
      alert("Отзыв отправлен!");
    } catch (err) {
      if (err.response?.status === 400) {
        alert("Вы уже оставили отзыв этому пользователю.");
      } else {
        alert("Не удалось отправить отзыв: " + err.message);
      }
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!token) {
      alert("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      await axios.delete(`http://localhost:8000/api/reviews/${reviewId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedReviews = reviews.filter((review) => review.id !== reviewId);
      setReviews(updatedReviews);
      // Fetch updated user data to get the new average rating
      const updatedUserResponse = await axios.get(
        `http://localhost:8000/api/users/${id}/`
      );
      setUser(updatedUserResponse.data);
      alert("Отзыв успешно удален!");
    } catch (err) {
      console.error("Ошибка при удалении отзыва:", err);
      if (err.response?.status === 403) {
        alert("Вы не можете удалить этот отзыв.");
      } else {
        alert("Не удалось удалить отзыв: " + err.message);
      }
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
            {token && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-500 hover:text-blue-600"
              >
                <FaEnvelope size={24} />
              </button>
            )}
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
          <div className="flex justify-between items-center mt-8 mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Отзывы
            </h2>
            {user.average_rating > 0 && (
              <div className="flex items-center">
                <span className="text-yellow-500 text-2xl">★</span>
                <span className="ml-2 text-gray-800 dark:text-white">
                  {user.average_rating.toFixed(1) || "0.0"}
                </span>
              </div>
            )}
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
                >
                  <p className="text-gray-800 dark:text-white font-semibold">
                    {review.author_name}
                  </p>
                  <p className="text-gray-800 dark:text-white mt-2">
                    {review.content}
                  </p>
                  <div className="flex items-center mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= review.rating
                            ? "text-yellow-500"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                  {currentUser &&
                    currentUser.id &&
                    String(review.author) === String(currentUser.id) && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="mt-2 text-red-500 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Пока нет отзывов.
            </p>
          )}
          {token && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Оставить отзыв
            </button>
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

      <Modal
        isOpen={isReviewModalOpen}
        onRequestClose={() => setIsReviewModalOpen(false)}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Оставить отзыв
        </h2>
        <form onSubmit={handleSendReview}>
          <textarea
            value={reviewContent}
            onChange={(e) => setReviewContent(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Введите ваш отзыв..."
            required
          />
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Оценка:
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`text-3xl ${
                    star <= (hoverRating || reviewRating)
                      ? "text-yellow-500"
                      : "text-gray-300"
                  } transition-colors duration-200`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
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