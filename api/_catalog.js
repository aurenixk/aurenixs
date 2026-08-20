const products = {
    1: { title: "Double-Breasted Wool Trench Coat", price: 189.99 },
    2: { title: "Vintage Italian Leather Biker Jacket", price: 229.99 },
    3: { title: "Arctic Insulated Waterproof Parka", price: 159.99 },
    4: { title: "Oversized Cashmere Mix Long Coat", price: 199.99 },
    5: { title: "Tailored Structured Blazer Coat", price: 119.99 },
    6: { title: "Kids Insulated Puffer Coat", price: 69.99 },
    7: { title: "Heritage Belted Trench Coat", price: 179.99 },
    8: { title: "Children's Shearling Layered Jacket", price: 79.99 }
};

function priceForItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Cart is empty.");
    }

    return items.map(item => {
        const product = products[Number(item.id)];
        const quantity = Number(item.qty);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            throw new Error("Invalid cart item.");
        }
        return {
            id: Number(item.id),
            title: product.title,
            quantity,
            unit_amount: Math.round(product.price * 100)
        };
    });
}

module.exports = { priceForItems };