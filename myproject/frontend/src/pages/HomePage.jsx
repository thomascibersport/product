import React from "react";
import Header from "../components/Header";


const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">
          Панель управления
        </h1>
      </div>
    </div>
  );
};

export default HomePage;
