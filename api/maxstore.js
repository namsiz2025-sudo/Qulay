
const { randomUUID } = require("crypto");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const token = process.env.MAXSTORE_API_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "MAXSTORE_API_TOKEN تېپىلمىدى" });
  }

  const action = req.query.action;

  const endpoints = {
    products: "/api/v2/products",
    profile: "/api/v2/profile",
    balance: "/api/v2/balance"
  };

  try {
    let url;
    let options = {
      method: "GET",
      headers: {
        "api-token": token,
        "Accept": "application/json"
      }
    };

    if (req.method === "GET") {
      if (endpoints[action]) {
        url = "https://maxstore1.com" + endpoints[action];
      } else if (action === "content") {
        const id = req.query.id;
        if (!/^\d+$/.test(String(id || ""))) {
          return res.status(400).json({ error: "كاتېگورىيە ID خاتا" });
        }
        url = `https://maxstore1.com/api/v2/content/${id}`;
      } else if (action === "check") {
        const orders = String(req.query.orders || "");
        if (!orders || orders.split(",").length > 50) {
          return res.status(400).json({ error: "زاكاس نومۇرى خاتا" });
        }
        url = "https://maxstore1.com/api/v2/check?orders=" +
          encodeURIComponent(orders);
      } else {
        return res.status(400).json({ error: "action خاتا" });
      }
    } else if (req.method === "POST" && action === "order") {
      const body = req.body || {};
      const productId = Number(body.product_id);
      const qty = Number(body.qty);

      if (!Number.isInteger(productId) || productId <= 0 ||
          !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: "مەھسۇلات ياكى سان خاتا" });
      }

      const orderUuid = body.order_uuid || randomUUID();

      const payload = {
        product_id: productId,
        qty,
        order_uuid: orderUuid
      };

      if (body.params && typeof body.params === "object" &&
          !Array.isArray(body.params)) {
        payload.params = body.params;
      }

      url = "https://maxstore1.com/api/v2/order";
      options = {
        method: "POST",
        headers: {
          "api-token": token,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      };
    } else {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "بۇ ئۇسۇلغا رۇخسەت يوق" });
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "MaxStore بىلەن ئۇلىنىش مەغلۇپ بولدى"
    });
  }
}
