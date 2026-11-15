
export default async function handler(req, res) {
  const token = process.env.MAXSTORE_API_TOKEN?.trim();

  if (!token) {
    return res.status(500).json({
      error: "MAXSTORE_API_TOKEN"
    });
  }
  msk_hVT29MH6bP07N08PkunKzPx2h9GeD0vSjqyxYDWwiro

  const action = req.query.action || "products";

  const endpoints = {
    products: "/api/v2/products",
    profile: "/api/v2/profile",
    balance: "/api/v2/balance",
    content: "/api/v2/content/0"
  };

  if (!endpoints[action]) {
    return res.status(400).json({
      error: "نامەلۇم API action"
    });
  }

  try {
    const response = await fetch(
      "https://maxstore1.com" + endpoints[action],
      {
        method: "GET",
        headers: {
          "api-token": token,
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "MaxStore بىلەن ئۇلىنىش مەغلۇپ بولدى",
      message: error.message
    });
  }
}
