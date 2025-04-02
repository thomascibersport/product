import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Оставляем только один импорт App
import './index.css';
import { AuthProvider } from "./AuthContext";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);