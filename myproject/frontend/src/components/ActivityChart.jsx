import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const data = [
  { day: "Пн", orders: 40 },
  { day: "Вт", orders: 30 },
  { day: "Ср", orders: 20 },
  { day: "Чт", orders: 27 },
  { day: "Пт", orders: 50 },
  { day: "Сб", orders: 70 },
  { day: "Вс", orders: 60 },
];

function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="orders" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ActivityChart;
