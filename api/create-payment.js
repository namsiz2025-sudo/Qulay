export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({
error: "POST method only"
});
}

try {
const { amount, paymentNote } = req.body;

if (!amount || Number(amount) <= 0) {
  return res.status(400).json({
    error: "مۇۋاپىق پۇل سوممىسىنى كىرگۈزۈڭ"
  });
}

const response = await fetch(
  "https://api.shamcash-api.com/v1/invoices",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SHAMCASH_API_TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: "SYP",
      payment_note:
        paymentNote || `TUR-${Date.now()}`,
      match_by: "payment_note"
    })
  }
);

const data = await response.json();

if (!response.ok || data.status !== "success") {
  return res.status(response.status || 500).json({
    error: data.message || "Invoice قۇرۇلمىدى",
    details: data
  });
}

return res.status(200).json({
  success: true,
  invoice: data.data
});

} catch (error) {

console.error("ShamCash error:", error);

return res.status(500).json({
  error: "Server خاتالىقى"
});

}
}
