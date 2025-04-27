import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, LineController, LineElement, BarController, BarElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Container, Grid, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

// Регистрация компонентов Chart.js
Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const SellerDashboard = () => {
  const [stats, setStats] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/seller-statistics/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
      }
    };
    fetchStats();
  }, [token]);

  if (!stats) return <div>Загрузка...</div>;

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Grid container spacing={3}>
        {/* Основные метрики */}
        <Grid item xs={12} sm={4}>
          <Paper style={{ padding: '1rem', textAlign: 'center' }}>
            <Typography variant="h6">Всего заказов</Typography>
            <Typography variant="h4">{stats.orders.total_orders}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper style={{ padding: '1rem', textAlign: 'center' }}>
            <Typography variant="h6">Общий доход</Typography>
            <Typography variant="h4">${stats.orders.total_revenue.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper style={{ padding: '1rem', textAlign: 'center' }}>
            <Typography variant="h6">Продано товаров</Typography>
            <Typography variant="h4">{stats.orders.total_quantity}</Typography>
          </Paper>
        </Grid>

        {/* Ежемесячные продажи */}
        <Grid item xs={12}>
          <Paper style={{ padding: '1rem' }}>
            <Typography variant="h5" gutterBottom>Ежемесячные продажи</Typography>
            <Line 
              data={{
                labels: stats.monthly_stats.map(m => new Date(m.month).toLocaleString('ru-RU', { month: 'short' })),
                datasets: [{
                  label: 'Доход',
                  data: stats.monthly_stats.map(m => m.revenue),
                  borderColor: '#4CAF50',
                  fill: false
                }]
              }}
            />
          </Paper>
        </Grid>

        {/* Топ товаров */}
        <Grid item xs={12}>
          <Paper style={{ padding: '1rem' }}>
            <Typography variant="h5" gutterBottom>Топ товаров</Typography>
            <Bar
              data={{
                labels: stats.products.map(p => p.product__name),
                datasets: [{
                  label: 'Продано единиц',
                  data: stats.products.map(p => p.total_sold),
                  backgroundColor: '#2196F3'
                }]
              }}
            />
          </Paper>
        </Grid>

        {/* Кто что купил */}
        <Grid item xs={12}>
          <Paper style={{ padding: '1rem' }}>
            <Typography variant="h5" gutterBottom>Кто что купил</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Покупатель</TableCell>
                    <TableCell>Товар</TableCell>
                    <TableCell>Количество</TableCell>
                    <TableCell>Сумма</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.purchases.map(purchase => (
                    <TableRow key={`${purchase.order__user__id}-${purchase.product__name}`}>
                      <TableCell>{purchase.order__user__first_name} {purchase.order__user__last_name}</TableCell>
                      <TableCell>{purchase.product__name}</TableCell>
                      <TableCell>{purchase.quantity}</TableCell>
                      <TableCell>${(purchase.price * purchase.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Средний рейтинг покупателей */}
        <Grid item xs={12} sm={6}>
          <Paper style={{ padding: '1rem', textAlign: 'center' }}>
            <Typography variant="h6">Средний рейтинг покупателей</Typography>
            <Typography variant="h4">{stats.avg_customer_rating.toFixed(1)}/5</Typography>
          </Paper>
        </Grid>

        {/* Пиковые часы заказов */}
        <Grid item xs={12}>
          <Paper style={{ padding: '1rem' }}>
            <Typography variant="h5" gutterBottom>Пиковые часы заказов</Typography>
            <Bar
              data={{
                labels: stats.peak_hours.map(h => `${h.hour}:00`),
                datasets: [{
                  label: 'Количество заказов',
                  data: stats.peak_hours.map(h => h.order_count),
                  backgroundColor: '#FF9800'
                }]
              }}
            />
          </Paper>
        </Grid>

        {/* Актуальные товары по времени года */}
        <Grid item xs={12}>
          <Paper style={{ padding: '1rem' }}>
            <Typography variant="h5" gutterBottom>Актуальные товары по времени года</Typography>
            <Bar
              data={{
                labels: stats.seasonal_products.map(p => p.product__name),
                datasets: [{
                  label: 'Продано в этом сезоне',
                  data: stats.seasonal_products.map(p => p.total_sold),
                  backgroundColor: '#9C27B0'
                }]
              }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SellerDashboard;