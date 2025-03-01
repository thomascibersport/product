import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = Cookies.get("token");
    axios
      .get("http://localhost:8000/api/products/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setProducts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          Продукты
        </h1>
        {loading ? (
          <p>Загрузка...</p>
        ) : error ? (
          <p>Ошибка: {error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white dark:bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {product.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Цена: {product.price}
                </p>
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="mt-2 rounded"
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
