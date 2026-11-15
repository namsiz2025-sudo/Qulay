export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST method only",
    });
  }

  try {
    // FormData نى Vercel Node.js API دا بىۋاسىتە ئوقۇش
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    // بۇ API پەقەت كەلگەن ئۇچۇرنى تەكشۈرۈش ئۈچۈن
    if (!body || body.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "ئۇچۇر تېپىلمىدى",
      });
    }

    return res.status(501).json({
      ok: false,
      error:
        "رەسىم ۋە سىن بىلەن FormData نى بىر تەرەپ قىلىش ئۈچۈن multipart parser قوشۇش كېرەك.",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Server خاتالىقى",
    });
  }
}
