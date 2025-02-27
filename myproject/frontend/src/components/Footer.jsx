import React from "react";

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto text-center">
        <p className="text-sm">
          © {new Date().getFullYear()} Система управления доставкой. Все права защищены.
        </p>
        <div className="flex justify-center space-x-4 mt-2">
          <a
            href="/about"
            className="text-gray-300 hover:text-white transition duration-200"
          >
            О нас
          </a>
          <a
            href="/contacts"
            className="text-gray-300 hover:text-white transition duration-200"
          >
            Контакты
          </a>
          <a
            href="/terms"
            className="text-gray-300 hover:text-white transition duration-200"
          >
            Условия использования
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
