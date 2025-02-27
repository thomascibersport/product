import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import EditProfilePage from "./pages/EditProfilePage";
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} /> {/* Новая главная страница */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
      </Routes>
    </Router>
  );
};

export default App;


