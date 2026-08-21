const crypto = require("crypto");

module.exports = async function handler(request, response) {
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return response.status(500).json({ error: "Razorpay webhook is not configured." });
    const signature = request.headers["x-razorpay-signature"] || "";
    const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body || {});
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return response.status(400).json({ error: "Webhook signature verification failed." });
    }
    return response.status(200).json({ ok: true });
};
