
const formidable = require("formidable");
const fs = require("fs/promises");

module.exports.config = {
  api: {
    bodyParser: false
  }
};

function getValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function calculateFee(price) {
  if (price <= 50) return 1.5;
  if (price <= 100) return 3;
  if (price <= 200) return 5;
  return 7;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only"
    });
  }

  const TOKEN = process.env.BOT_TOKEN;
  const CHANNEL = process.env.CHANNEL_ID;
  const SYP_PER_USD = Number(process.env.SYP_PER_USD || 0);

  if (!TOKEN || !CHANNEL) {
    return res.status(500).json({
      ok: false,
      error: "Telegram تەڭشىكى تېخى تاماملانمىغان"
    });
  }

  try {
    const form = formidable({
      maxFileSize: 15 * 1024 * 1024,
      maxTotalFileSize: 30 * 1024 * 1024,
      multiples: false
    });

    const [fields, files] = await form.parse(req);

    const photo1 = getValue(files.photo1);
    const photo2 = getValue(files.photo2);
    const video = getValue(files.video);

    if (!photo1 || !photo2) {
      return res.status(400).json({
        ok: false,
        error: "ئىككى پارچە رەسىم لازىم"
      });
    }

    const price = Number(getValue(fields.price));
    const currency = getValue(fields.currency);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        ok: false,
        error: "باھا خاتا"
      });
    }

    let priceUSD = price;

    if (currency === "SYP") {
      if (!SYP_PER_USD || SYP_PER_USD <= 0) {
        return res.status(400).json({
          ok: false,
          error: "SYP_PER_USD پېرېۋوت نىسبىتى تەڭشەلمىگەن"
        });
      }

      priceUSD = price / SYP_PER_USD;
    }

    const fee = calculateFee(priceUSD);

    const negotiable = getValue(fields.negotiable);
    const exchange = getValue(fields.exchange);
    const device = getValue(fields.device);
    const telegram = getValue(fields.telegram);
    const note = getValue(fields.note);

    const caption =
      "⚔️ <b>MLBB ARENA — يېڭى ھېسابات</b>\n\n" +
      "💰 باھاسى: <b>" + escapeHTML(price) + " " +
      escapeHTML(currency) + "</b>\n" +
      "🧾 مۇلازىمەت ھەققى: <b>$" + fee + "</b>\n" +
      "🤝 كېلىشىش: " + escapeHTML(negotiable) + "\n" +
      "🔄 ئالماشتۇرۇش: " + escapeHTML(exchange) + "\n" +
      "📱 ئۈسكۈنە: " + escapeHTML(device) + "\n" +
      "👤 Telegram: " + escapeHTML(telegram || "كۆرسىتىلمىگەن") + "\n" +
      "📝 ئۇچۇر: " + escapeHTML(note || "يوق") + "\n\n" +
      "📩 ئالاقىلىشىش: https://t.me/Bang_Bang_Players_uy";

    const media = [
      {
        type: "photo",
        media: "attach://photo1",
        caption: caption,
        parse_mode: "HTML"
      },
      {
        type: "photo",
        media: "attach://photo2"
      }
    ];

    if (video) {
      media.push({
        type: "video",
        media: "attach://video"
      });
    }

    const data = new FormData();

    data.append("chat_id", CHANNEL);
    data.append("media", JSON.stringify(media));

    const p1 = await fs.readFile(photo1.filepath);
    const p2 = await fs.readFile(photo2.filepath);

    data.append(
      "photo1",
      new Blob([p1], {
        type: photo1.mimetype || "image/jpeg"
      }),
      photo1.originalFilename || "photo1.jpg"
    );

    data.append(
      "photo2",
      new Blob([p2], {
        type: photo2.mimetype || "image/jpeg"
      }),
      photo2.originalFilename || "photo2.jpg"
    );

    if (video) {
      const v = await fs.readFile(video.filepath);

      data.append(
        "video",
        new Blob([v], {
          type: video.mimetype || "video/mp4"
        }),
        video.originalFilename || "video.mp4"
      );
    }

    const response = await fetch(
      "https://api.telegram.org/bot" + TOKEN + "/sendMediaGroup",
      {
        method: "POST",
        body: data
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.description || "Telegram يوللاش مەغلۇپ بولدى"
      );
    }

    return res.status(200).json({
      ok: true,
      message: "ھېسابات مۇۋەپپەقىيەتلىك يوللاندى"
    });

  } catch (error) {
    console.error("MLBB ARENA ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "مۇلازىمېتىر خاتالىقى"
    });
  }
};
