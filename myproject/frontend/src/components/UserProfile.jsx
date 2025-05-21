import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { FaEnvelope, FaPhone, FaShoppingBag, FaStar, FaRegStar, FaUserCircle, FaTrashAlt, FaPen } from "react-icons/fa";
import Modal from "react-modal";
import { AuthContext } from "../AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

Modal.setAppElement("#root");

// Add custom styles for react-modal
const customModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(5px)',
    zIndex: 50,
    overflow: 'hidden'
  },
  content: {
    inset: 'auto',
    overflow: 'visible',
    border: 'none',
    background: 'transparent',
    padding: 0
  }
};

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
  const [activeTab, setActiveTab] = useState("products");

  // Handle body scrolling when modals are open
  useEffect(() => {
    if (isModalOpen || isReviewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen, isReviewModalOpen]);

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
      toast.error("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      await axios.post(
        `http://localhost:8000/api/messages/send/`,
        { recipient_id: id, content: message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("");
      setIsModalOpen(false);
      toast.success("Сообщение отправлено!");
      setHasMessages(true);
    } catch (err) {
      console.error("Ошибка при отправке сообщения:", err);
      toast.error("Не удалось отправить сообщение: " + err.message);
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
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
      const updatedUserResponse = await axios.get(
        `http://localhost:8000/api/users/${id}/`
      );
      setUser(updatedUserResponse.data);
      setReviewContent("");
      setReviewRating(0);
      setHoverRating(0);
      setIsReviewModalOpen(false);
      toast.success("Отзыв отправлен!");
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error("Вы уже оставили отзыв этому пользователю.");
      } else {
        toast.error("Не удалось отправить отзыв: " + err.message);
      }
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!token) {
      toast.error("Пожалуйста, войдите в систему.");
      return;
    }
    try {
      await axios.delete(`http://localhost:8000/api/reviews/${reviewId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedReviews = reviews.filter((review) => review.id !== reviewId);
      setReviews(updatedReviews);
      const updatedUserResponse = await axios.get(
        `http://localhost:8000/api/users/${id}/`
      );
      setUser(updatedUserResponse.data);
      toast.success("Отзыв успешно удален!");
    } catch (err) {
      console.error("Ошибка при удалении отзыва:", err);
      if (err.response?.status === 403) {
        toast.error("Вы не можете удалить этот отзыв.");
      } else {
        toast.error("Не удалось удалить отзыв: " + err.message);
      }
    }
  };

  const confirmDeleteReview = (reviewId) => {
    toast(
      <div>
        <p>Вы уверены, что хотите удалить этот отзыв?</p>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              handleDeleteReview(reviewId);
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

  const renderRatingStars = (rating, interactive = false) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${interactive ? 'cursor-pointer' : ''} transition-colors duration-200`}
            onClick={interactive ? () => setReviewRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
          >
            {star <= (interactive ? (hoverRating || reviewRating) : rating) ? (
              <FaStar className="text-yellow-500" />
            ) : (
              <FaRegStar className="text-gray-300 dark:text-gray-500" />
            )}
          </span>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Загрузка профиля...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Произошла ошибка</h2>
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md">
        <div className="text-gray-400 text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Пользователь не найден</h2>
        <p className="text-gray-600 dark:text-gray-400">Пользователь с указанным идентификатором не существует или был удален.</p>
        <Link 
          to="/" 
          className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Профиль пользователя */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden mb-8">
          {/* Обложка профиля - заменена на однотонный цвет */}
          <div className="h-40 bg-blue-500 dark:bg-blue-700 relative">
            <div className="absolute -bottom-16 left-8 bg-white dark:bg-gray-800 p-2 rounded-full shadow-xl">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border-4 border-white dark:border-gray-800">
                  <FaUserCircle className="text-blue-500 dark:text-blue-400 w-20 h-20" />
                </div>
              )}
            </div>
          </div>
          
          {/* Информация о пользователе */}
          <div className="pt-20 px-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <div className="flex items-center">
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {user.first_name} {user.last_name}
                  </h1>
                  <div className="ml-4 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium text-sm">
                    {user.successful_deals > 0 ? 'Продавец' : 'Новичок'}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {user.average_rating > 0 && (
                    <div className="flex items-center bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                      <div className="flex mr-1">
                        {renderRatingStars(user.average_rating)}
                      </div>
                      <span className="text-amber-700 dark:text-amber-300 font-medium">
                        {user.average_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FaShoppingBag className="mr-1 text-green-500 dark:text-green-400" />
                    <span>{user.successful_deals || 0} успешных сделок</span>
                  </div>
                </div>
              </div>
              
              {token && parseInt(id) !== currentUser?.id && (
                <div className="mt-4 md:mt-0 flex space-x-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    <FaEnvelope className="mr-2" />
                    <span>Написать</span>
                  </button>
                  <button
                    onClick={() => setIsReviewModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    <FaStar className="mr-2" />
                    <span>Оставить отзыв</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Контактная информация</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FaEnvelope className="text-gray-500 dark:text-gray-400 mr-3" />
                    <span className="text-gray-800 dark:text-gray-200">{user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <FaPhone className="text-gray-500 dark:text-gray-400 mr-3" />
                    <span className="text-gray-800 dark:text-gray-200">
                      {user.show_phone ? user.phone || "Не указан" : "Скрыт"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">О пользователе</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {user.successful_deals > 10 
                    ? `Опытный продавец с ${user.successful_deals} успешными сделками` 
                    : user.successful_deals > 0 
                      ? `Начинающий продавец с ${user.successful_deals} успешными сделками`
                      : "Новый пользователь на платформе"}
                </p>
              </div>
            </div>
            
            {/* Вкладки */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex space-x-8">
                <button
                  className={`pb-3 px-1 ${
                    activeTab === "products"
                      ? "border-b-2 border-blue-500 font-medium text-blue-500 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("products")}
                >
                  Товары
                </button>
                <button
                  className={`pb-3 px-1 ${
                    activeTab === "reviews"
                      ? "border-b-2 border-blue-500 font-medium text-blue-500 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("reviews")}
                >
                  Отзывы {reviews.length > 0 && `(${reviews.length})`}
                </button>
              </div>
            </div>
            
            {/* Содержимое активной вкладки */}
            {activeTab === "products" ? (
              <>
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        className="group block bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-lg"
                      >
                        <div className="relative h-48 w-full overflow-hidden">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-400 dark:text-gray-500">Нет изображения</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 m-2 px-2 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg">
                            {product.price} ₽
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                            {product.description}
                          </p>
                          <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {product.category && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-xs">
                                {product.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">🛒</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">У этого продавца пока нет товаров.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-gray-50 dark:bg-gray-700 p-5 rounded-xl shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-medium text-gray-800 dark:text-white">
                            {review.author_name}
                          </h4>
                          <div className="flex text-amber-500 dark:text-amber-400">
                            {renderRatingStars(review.rating)}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {review.content}
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {new Date(review.created_at).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })}
                          </span>
                          {currentUser && currentUser.id && String(review.author) === String(currentUser.id) && (
                            <button
                              onClick={() => confirmDeleteReview(review.id)}
                              className="flex items-center text-red-500 hover:text-red-600 transition-colors"
                            >
                              <FaTrashAlt className="mr-1" /> Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">⭐</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">У этого пользователя пока нет отзывов.</p>
                    {token && parseInt(id) !== currentUser?.id && (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Оставить первый отзыв
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно для отправки сообщения */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={customModalStyles}
        className="max-w-md mx-auto mt-20 outline-none"
        overlayClassName="fixed inset-0 flex justify-center"
      >
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Отправить сообщение</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Для {user?.first_name} {user?.last_name}
          </p>
          <form onSubmit={handleSendMessage}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="5"
              placeholder="Введите ваше сообщение..."
              required
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Отправить
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Модальное окно для отзыва */}
      <Modal
        isOpen={isReviewModalOpen}
        onRequestClose={() => setIsReviewModalOpen(false)}
        style={customModalStyles}
        className="max-w-md mx-auto mt-20 outline-none"
        overlayClassName="fixed inset-0 flex justify-center"
      >
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Оставить отзыв</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Для {user?.first_name} {user?.last_name}
          </p>
          <form onSubmit={handleSendReview}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                Ваша оценка:
              </label>
              <div className="flex space-x-2 text-xl">
                {renderRatingStars(0, true)}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                Ваш отзыв:
              </label>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="4"
                placeholder="Расскажите о вашем опыте сотрудничества с этим пользователем..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={reviewRating === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить
              </button>
            </div>
          </form>
        </div>
      </Modal>
      
      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default UserProfile;