import React from 'react';

const ProductCard = ({ product }) => {
    return (
        <div className="product-card">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p>Цена: ${product.price}</p>
            <p>Категория: {product.category}</p>
        </div>
    );
};

export default ProductCard;