import React, { Suspense, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import EditProfilePage from "./pages/EditProfilePage";
import AddProductForm from "./components/AddProductForm";
import ProductDetail from "../src/components/ProductDetail";
import CartPage from "../src/components/CartPage";
import OrdersPage from "../src/pages/OrdersPage";
import MyProductsPage from "../src/components/MyProductsPage";
import SellerOrdersPage from "../src/pages/SellerOrdersPage";
import UserProfile from "./components/UserProfile";
import MessagesPage from "../src/pages/MessagesPage";
import ChatPage from "../src/pages/ChatPage";
import SellerStatisticsPage from "../src/pages/SellerStatisticsPage";
import SellerDashboard from "../src/pages/SellerStatisticsPage";
import AdminDashboard from "../src/pages/AdminDashboard";
import PrivateRoute from "./PrivateRoute";
import SellerRoute from "./SellerRoute";
import AssistantPage from '../src/pages/AssistantPage';

// Loading component with background matching the site theme
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">Загрузка...</p>
    </div>
  </div>
);

const AdminRoute = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  
  if (isLoading || user === null) {
    return <LoadingFallback />;
  }
  
  if (!token || !user.is_staff) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// AppContent component to access useLocation inside Router
const AppContent = () => {
  const location = useLocation();
  
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile/edit"
            element={
              <PrivateRoute>
                <EditProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-product"
            element={
              <SellerRoute>
                <AddProductForm />
              </SellerRoute>
            }
          />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route
            path="/cart"
            element={
              <PrivateRoute>
                <CartPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <OrdersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-products"
            element={
              <SellerRoute>
                <MyProductsPage />
              </SellerRoute>
            }
          />
          <Route
            path="/seller-orders"
            element={
              <SellerRoute>
                <SellerOrdersPage />
              </SellerRoute>
            }
          />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <MessagesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller-statistics"
            element={
              <SellerRoute>
                <SellerStatisticsPage />
              </SellerRoute>
            }
          />
          <Route
            path="/seller-dashboard"
            element={
              <SellerRoute>
                <SellerDashboard />
              </SellerRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/assistant" element={<AssistantPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

const App = () => {
  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
