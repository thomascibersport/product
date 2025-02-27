import React from "react";

function Card({ title, value, description, icon }) {
  return (
    <div className="border rounded-lg shadow-md p-6 bg-white flex items-center space-x-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

export default Card;
