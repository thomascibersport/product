import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
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
import AssistantPage from '../src/pages/AssistantPage';
const AdminRoute = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  console.log(
    "AdminRoute: token:",
    token,
    "user:",
    user,
    "isLoading:",
    isLoading
  );
  if (isLoading || user === null) {
    return <div>Loading user…</div>;
  }
  if (!token || !user.is_staff) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
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
                <PrivateRoute>
                  <AddProductForm />
                </PrivateRoute>
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
                <PrivateRoute>
                  <MyProductsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/seller-orders"
              element={
                <PrivateRoute>
                  <SellerOrdersPage />
                </PrivateRoute>
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
                <PrivateRoute>
                  <SellerStatisticsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/seller-dashboard"
              element={
                <PrivateRoute>
                  <SellerDashboard />
                </PrivateRoute>
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
      </AuthProvider>
    </Router>
  );
};

export default App;
