import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import EditProfilePage from "./pages/EditProfilePage";
import AddProductForm from "./components/AddProductForm"; // Новый импорт

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} /> {/* Главная страница */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/add-product" element={<AddProductForm />} /> {/* Новый маршрут */}
      </Routes>
    </Router>
  );
};

export default App;


