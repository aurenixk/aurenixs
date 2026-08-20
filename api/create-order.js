const { priceForItems } = require("./_catalog");

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        return response.status(405).json({ error: "Method not allowed." });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        return response.status(500).json({ error: "Razorpay is not configured." });
    }

    try {
        const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
        const items = priceForItems(body.items);
        const amount = items.reduce((total, item) => total + item.unit_amount * item.quantity, 0);
        const receipt = `aurenix_${Date.now()}`;
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount, currency: body.currency === "USD" ? "USD" : "INR", receipt })
        });

        const data = await razorpayResponse.json();
        if (!razorpayResponse.ok) {
            return response.status(502).json({ error: "Razorpay order creation failed." });
        }

        return response.status(200).json({
            keyId,
            order: data,
            items,
            customer: {
                name: String(body.customer?.name || "").slice(0, 120),
                email: String(body.customer?.email || "").slice(0, 254)
            }
        });
    } catch (error) {
        return response.status(400).json({ error: error.message || "Invalid order request." });
    }
};