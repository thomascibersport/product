import React, { useEffect, useState } from 'react';
import { getUser } from '../api/auth'; // Исправленный импорт
import { getToken, removeToken } from '../utils/auth';

const Dashboard = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getToken(); // Получение токена
                if (!token) {
                    throw new Error("Токен отсутствует");
                }
                const response = await getUser(token);
                setUser(response.data);
            } catch (error) {
                console.error('Ошибка загрузки пользователя:', error);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = () => {
        removeToken();
        window.location.href = '/login';
    };

    return (
        <div>
            <h2>Dashboard</h2>
            {user ? <p>Welcome, {user.username}</p> : <p>Loading user data...</p>}
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default Dashboard;
