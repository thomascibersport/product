import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import EditProfilePage from "./pages/EditProfilePage";
import AddProductForm from "./components/AddProductForm";
import ProductDetail from "../src/components/ProductDetail";
import CartPage from "../src/components/CartPage";
import OrdersPage from "../src/pages/OrdersPage";
import MyProductsPage from "../src/components/MyProductsPage";
import SellerOrdersPage from "./pages/SellerOrdersPage";
import UserProfile from "./components/UserProfile";
import MessagesPage from "../src/pages/MessagesPage";
import ChatPage from "../src/pages/ChatPage";

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/add-product" element={<AddProductForm />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/my-products" element={<MyProductsPage />} />
            <Route path="/seller-orders" element={<SellerOrdersPage />} />
            <Route path="/users/:id" element={<UserProfile />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;