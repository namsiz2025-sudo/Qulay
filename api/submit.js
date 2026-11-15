import formidable from "formidable";
import fs from "node:fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST method only",
    });
  }

  try {
    const form = formidable({
      multiples: false,
      maxFileSize: 20 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(req);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        ok: false,
        error: "Telegram تەڭشەكلىرى تېپىلمىدى",
      });
    }

    const photo1 = first(files.photo1);
    const photo2 = first(files.photo2);
    const video = first(files.video);

    if (!photo1 || !photo2) {
      return res.status(400).json({
        ok: false,
        error: "ئىككى پارچە رەسىم كېرەك",
      });
    }

    const price = first(fields.price) || "";
    const currency = first(fields.currency) || "";
    const negotiable = first(fields.negotiable) || "";
    const exchange = first(fields.exchange) || "";
    const device = first(fields.device) || "";
    const telegram = first(fields.telegram) || "";
    const note = first(fields.note) || "";

    const caption = `
⚔️ MLBB ARMAN

💰 باھاسى: ${price} ${currency}
🤝 كېلىشىش: ${negotiable}
🔄 ئالماشتۇرۇش: ${exchange}
📱 ئۈسكۈنە: ${device}
📲 Telegram: ${telegram || "كۆرسىتىلمىگەن"}

📝 ئۇچۇر:
${note || "يوق"}
`.trim();

    // Telegram API غا ئاددىي ئۇچۇر يوللاش
    const messageResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: caption,
        }),
      }
    );

    const messageResult = await messageResponse.json();

    if (!messageResult.ok) {
      throw new Error(
        messageResult.description || "Telegram غا ئۇچۇر يوللاش مەغلۇپ بولدى"
      );
    }

    async function sendFile(file, type) {
      const buffer = fs.readFileSync(file.filepath);

      const formData = new FormData();

      formData.append("chat_id", chatId);

      const blob = new Blob([buffer], {
        type: file.mimetype || "application/octet-stream",
      });

      formData.append(
        type,
        blob,
        file.originalFilename || `${type}.file`
      );

      const response = await fetch(
        `https://api.telegram.org/bot${token}/send${type === "photo" ? "Photo" : "Video"}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(
          result.description || `${type} يوللاش مەغلۇپ بولدى`
        );
      }
    }

    // 1-رەسىم
    await sendFile(photo1, "photo");

    // 2-رەسىم
    await sendFile(photo2, "photo");

    // سىن بولسا يوللاش
    if (video && video.size > 0) {
      await sendFile(video, "video");
    }

    return res.status(200).json({
      ok: true,
      message: "مۇۋەپپەقىيەتلىك يوللاندى",
    });

  } catch (error) {
    console.error("SUBMIT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Server خاتالىقى",
    });
  }
}
