import React from "react";

export const Card = ({ children, className }) => (
  <div className={`rounded-lg shadow-md bg-white dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className }) => (
  <div className={`border-b border-gray-200 dark:border-gray-700 p-4 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h3>
  </div>
);

export const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>
    <p className="text-gray-700 dark:text-gray-300">{children}</p>
  </div>
);
