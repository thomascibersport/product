import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          </div>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Электронная почта:</strong> {user.email}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Телефон:</strong>{" "}
              {user.show_phone ? (user.phone || "Не указан") : "Скрыт"}
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
    </div>
  );
};

export default UserProfile;