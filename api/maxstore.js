
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const token = process.env.MAXSTORE_API_TOKEN?.trim();

  if (!token) {
    return res.status(500).json({
      error: "MAXSTORE_API_TOKEN تېپىلمىدى"
    });
  }

  const action = req.query.action;

  const headers = {
    "api-token": token,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  let url = "";
  let options = { method: "GET", headers };

  try {
    if (req.method === "GET") {
      switch (action) {
        case "products":
          url = "https://maxstore1.com/api/v2/products";
          break;

        case "profile":
          url = "https://maxstore1.com/api/v2/profile";
          break;

        case "balance":
          url = "https://maxstore1.com/api/v2/balance";
          break;

        case "content": {
          const id = String(req.query.id || "0");
          if (!/^\d+$/.test(id)) {
            return res.status(400).json({ error: "ID خاتا" });
          }
          url = `https://maxstore1.com/api/v2/content/${id}`;
          break;
        }

        case "check": {
          const orders = String(req.query.orders || "");
          if (!orders || orders.split(",").length > 50) {
            return res.status(400).json({
              error: "زاكاس نومۇرى خاتا"
            });
          }
          url = "https://maxstore1.com/api/v2/check?orders=" +
            encodeURIComponent(orders);
          break;
        }

        default:
          return res.status(400).json({
            error: "action خاتا"
          });
      }
    } else if (req.method === "POST" && action === "order") {
      const body = req.body || {};
      const productId = Number(body.product_id);
      const qty = Number(body.qty);
      const uuid = String(body.order_uuid || "");

      if (!Number.isInteger(productId) || productId <= 0 ||
          !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
          error: "مەھسۇلات ID ياكى سان خاتا"
        });
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
        return res.status(400).json({
          error: "توغرا UUIDv4 زاكاس نومۇرى كېرەك"
        });
      }

      const payload = {
        product_id: productId,
        qty,
        order_uuid: uuid
      };

      if (body.params && typeof body.params === "object" &&
          !Array.isArray(body.params)) {
        payload.params = body.params;
      }

      url = "https://maxstore1.com/api/v2/order";

      options = {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      };
    } else {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({
        error: "بۇ ئۇسۇلغا رۇخسەت يوق"
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(20000)
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }

    return res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    return res.status(500).json({
      error: "MaxStore ئۇلىنىشىدا خاتالىق",
      message: error.message
    });
  }
}
