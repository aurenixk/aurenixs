const products = {
    "auradock-pro": { title: "AuraDock Pro", price: 2999 },
    "focushub-pro": { title: "FocusHub Pro", price: 2499 },
    "lumisphere": { title: "LumiSphere Ambient Light", price: 2199 },
    "travelcore": { title: "TravelCore Tech Organizer", price: 1899 },
    "nightdock": { title: "NightDock Station", price: 3299 }
};

function priceForItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Cart is empty.");
    }

    return items.map(item => {
        const product = products[String(item.id)];
        const quantity = Number(item.qty);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            throw new Error("Invalid cart item.");
        }
        return {
            id: String(item.id),
            title: product.title,
            quantity,
            option: String(item.selectedSize || item.option || "Standard").slice(0, 80),
            unit_amount: Math.round(product.price * 100)
        };
    });
}

module.exports = { products, priceForItems };