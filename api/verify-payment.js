const crypto = require("crypto");

function jsonHeaders() {
    return { "Content-Type": "application/json" };
}

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        return response.status(405).json({ error: "Method not allowed." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        return response.status(500).json({ error: "Razorpay is not configured." });
    }

    try {
        const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
        const signaturePayload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
        const expectedSignature = crypto.createHmac("sha256", secret).update(signaturePayload).digest("hex");
        const receivedSignature = String(body.razorpay_signature || "");
        const valid = receivedSignature.length === expectedSignature.length &&
            crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));

        if (!valid) {
            return response.status(400).json({ error: "Payment signature verification failed." });
        }

        const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!keyId) {
            return response.status(500).json({ error: "Razorpay public key is not configured." });
        }
        const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
        const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpay_payment_id)}`, {
            headers: { Authorization: `Basic ${auth}` }
        });
        const payment = await paymentResponse.json();
        if (!paymentResponse.ok || payment.order_id !== body.razorpay_order_id || payment.status !== "captured") {
            return response.status(400).json({ error: "Razorpay payment was not captured." });
        }

        const order = {
            razorpay_order_id: String(body.razorpay_order_id),
            razorpay_payment_id: String(body.razorpay_payment_id),
            customer_name: String(body.customer?.name || "").slice(0, 120),
            customer_email: String(body.customer?.email || "").slice(0, 254),
            amount: payment.amount,
            currency: payment.currency,
            status: "paid",
            items: Array.isArray(body.items) ? body.items : []
        };

        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            return response.status(500).json({ error: "Supabase server credentials are not configured." });
        }

        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: "POST",
            headers: {
                ...jsonHeaders(),
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal"
            },
            body: JSON.stringify(order)
        });
        if (!supabaseResponse.ok) {
            return response.status(502).json({ error: "The payment was verified, but saving the order failed." });
        }

        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (n8nUrl) {
            const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
            if (!webhookSecret) {
                return response.status(500).json({ error: "n8n webhook secret is not configured." });
            }
            const webhookPayload = JSON.stringify(order);
            const webhookSignature = crypto.createHmac("sha256", webhookSecret).update(webhookPayload).digest("hex");
            await fetch(n8nUrl, {
                method: "POST",
                headers: {
                    ...jsonHeaders(),
                    "x-webhook-signature": webhookSignature,
                    "x-webhook-signature-algorithm": "sha256"
                },
                body: webhookPayload
            });
        }

        return response.status(200).json({ ok: true });
    } catch (error) {
        return response.status(400).json({ error: error.message || "Invalid payment response." });
    }
};