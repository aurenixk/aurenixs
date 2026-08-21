const { products } = require("./_catalog");

module.exports = function handler(request, response) {
    if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed." });
    return response.status(200).json({ products: Object.entries(products).map(([id, product]) => ({ id, ...product })) });
};
