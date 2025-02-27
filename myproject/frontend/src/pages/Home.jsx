// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import ProductCard from '../components/ProductCard';

// const Home = () => {
//     const [products, setProducts] = useState([]);

//     useEffect(() => {
//         axios.get('/api/products/')
//             .then(response => {
//                 setProducts(response.data);
//             })
//             .catch(error => {
//                 console.error('Ошибка при загрузке продуктов:', error);
//             });
//     }, []);

//     return (
//         <div>
//             <h1>Продукты</h1>
//             <div className="product-list">
//                 {products.map(product => (
//                     <ProductCard key={product.id} product={product} />
//                 ))}
//             </div>
//         </div>
        
//     );
// };

// export default Home;