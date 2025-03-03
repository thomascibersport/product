import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import EditProfilePage from "./pages/EditProfilePage";
import AddProductForm from "./components/AddProductForm"; // Новый импорт
import ProductDetail from "../src/components/ProductDetail";
import CartPage from "../src/components/CartPage";
import OrdersPage from "../src/pages/OrdersPage";
const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Загрузка...</div>}></Suspense>
      <Routes>
        <Route path="/" element={<HomePage />} /> {/* Главная страница */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/add-product" element={<AddProductForm />} /> {/* Новый маршрут */}
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </Router>
  );
};

export default App;

