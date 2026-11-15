
const { formidable } = require("formidable");
const fs = require("fs/promises");

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

async function sendText(token, channel, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        chat_id: channel,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description || "Telegram يوللاش مەغلۇپ بولدى");
  }

  return result;
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ok:false,error:"POST only"});
  }

  const TOKEN = process.env.BOT_TOKEN;
  const CHANNEL = process.env.CHANNEL_ID;
  const SYP_PER_USD = Number(process.env.SYP_PER_USD || 0);

  if (!TOKEN || !CHANNEL) {
    return res.status(500).json({
      ok:false,
      error:"BOT_TOKEN ياكى CHANNEL_ID تەڭشەلمىگەن"
    });
  }

  let files = {};

  try {
    const form = formidable({
      maxFileSize: 15 * 1024 * 1024,
      maxTotalFileSize: 30 * 1024 * 1024,
      multiples: false,
      allowEmptyFiles: false
    });

    const [fields, parsedFiles] = await form.parse(req);
    files = parsedFiles;

    const type = String(getValue(fields.type) || "account");

    // ھېساب يوللاش
    if (type === "account") {
      const photo1 = getValue(files.photo1);
      const photo2 = getValue(files.photo2);
      const video = getValue(files.video);

      if (!photo1 || !photo2) {
        return res.status(400).json({
          ok:false,
          error:"ئىككى پارچە رەسىم لازىم"
        });
      }

      const allowedImages = ["image/jpeg","image/png","image/webp"];

      if (
        !allowedImages.includes(photo1.mimetype) ||
        !allowedImages.includes(photo2.mimetype)
      ) {
        return res.status(400).json({
          ok:false,
          error:"رەسىم JPG، PNG ياكى WEBP بولۇشى كېرەك"
        });
      }

      if (video && !["video/mp4","video/quicktime"].includes(video.mimetype)) {
        return res.status(400).json({
          ok:false,
          error:"سىن MP4 ياكى MOV بولۇشى كېرەك"
        });
      }

      const price = Number(getValue(fields.price));
      const currency = String(getValue(fields.currency) || "").toUpperCase();

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ok:false,error:"باھا خاتا"});
      }

      if (!["USD","SYP"].includes(currency)) {
        return res.status(400).json({ok:false,error:"پۇل بىرلىكى خاتا"});
      }

      let priceUSD = price;

      if (currency === "SYP") {
        if (!SYP_PER_USD || SYP_PER_USD <= 0) {
          return res.status(400).json({
            ok:false,
            error:"SYP_PER_USD تەڭشەلمىگەن"
          });
        }
        priceUSD = price / SYP_PER_USD;
      }

      const fee = calculateFee(priceUSD);
      const telegram = String(getValue(fields.telegram) || "").trim();
      const username = telegram.replace(/^@/,"");

      const contactLink = /^[a-zA-Z0-9_]{5,32}$/.test(username)
        ? "https://t.me/" + username
        : "https://t.me/Bang_Bang_Players_uy";

      const caption =
        "⚔️ <b>MLBB ARENA — يېڭى ھېسابات</b>\n\n" +
        "💰 باھاسى: <b>" + escapeHTML(price) + " " + escapeHTML(currency) + "</b>\n" +
        "🧾 مۇلازىمەت ھەققى: <b>$" + fee + "</b>\n" +
        "🤝 كېلىشىش: " + escapeHTML(getValue(fields.negotiable)) + "\n" +
        "🔄 ئالماشتۇرۇش: " + escapeHTML(getValue(fields.exchange)) + "\n" +
        "📱 ئۈسكۈنە: " + escapeHTML(getValue(fields.device)) + "\n" +
        "👤 Telegram: " + escapeHTML(telegram || "كۆرسىتىلمىگەن") + "\n" +
        "📝 ئۇچۇر: " + escapeHTML(getValue(fields.note) || "يوق") + "\n\n" +
        "📩 <a href=\"" + contactLink + "\">ئالاقىلىشىش</a>";

      const media = [
        {type:"photo",media:"attach://photo1",caption,parse_mode:"HTML"},
        {type:"photo",media:"attach://photo2"}
      ];

      if (video) media.push({type:"video",media:"attach://video"});

      const data = new FormData();
      data.append("chat_id",CHANNEL);
      data.append("media",JSON.stringify(media));

      for (const [key,file] of [["photo1",photo1],["photo2",photo2]]) {
        const buffer = await fs.readFile(file.filepath);
        data.append(key,new Blob([buffer],{type:file.mimetype}),file.originalFilename || key+".jpg");
      }

      if (video) {
        const buffer = await fs.readFile(video.filepath);
        data.append("video",new Blob([buffer],{type:video.mimetype}),video.originalFilename || "video.mp4");
      }

      const response = await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMediaGroup`,
        {method:"POST",body:data}
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.description || "Telegram يوللاش مەغلۇپ بولدى");
      }

      return res.status(200).json({
        ok:true,
        message:"ھېسابات مۇۋەپپەقىيەتلىك يوللاندى"
      });
    }

    // كوماندا يوللاش
    if (type === "team") {
      const teamId = String(getValue(fields.teamId) || "").trim();
      const size = Number(getValue(fields.teamSize));
      const rank = String(getValue(fields.teamRank) || "");
      const note = String(getValue(fields.teamNote) || "").trim();

      if (!teamId || !Number.isInteger(size) || size < 1 || size > 100) {
        return res.status(400).json({
          ok:false,
          error:"كوماندا ID سى ياكى ئادەم سانى خاتا"
        });
      }

      const roleNames = {
        jungle:"ئورمان",
        tank:"تانكا",
        exp:"ئېكىسپى",
        marksman:"ئاتقۇچى",
        mage:"سېھىرگەر"
      };

      let roleTotal = 0;
      let roleText = "";

      for (const [key,label] of Object.entries(roleNames)) {
        const amount = Number(getValue(fields[key]) || 0);

        if (!Number.isInteger(amount) || amount < 0) {
          return res.status(400).json({
            ok:false,
            error:"رول سانى خاتا"
          });
        }

        roleTotal += amount;
        roleText += "• " + label + ": " + amount + "\n";
      }

      if (roleTotal !== size) {
        return res.status(400).json({
          ok:false,
          error:"روللارنىڭ ئومۇمىي سانى ئادەم سانىغا تەڭ بولۇشى كېرەك"
        });
      }

      const message =
        "🎮 <b>MLBB ARENA — يېڭى كوماندا</b>\n\n" +
        "🆔 كوماندا ID: <b>" + escapeHTML(teamId) + "</b>\n" +
        "👥 ئادەم سانى: " + size + "\n\n" +
        "🎯 <b>كېرەكلىك روللار:</b>\n" + roleText + "\n" +
        "🏆 Rank: " + escapeHTML(rank) + "\n" +
        "📝 ئۇچۇر: " + escapeHTML(note || "يوق") + "\n\n" +
        "📢 <a href=\"https://t.me/Bang_Bang_Players_uy\">ئالاقىلىشىش</a>";

      await sendText(TOKEN,CHANNEL,message);

      return res.status(200).json({
        ok:true,
        message:"كوماندا ئېلانى قانالغا يوللاندى"
      });
    }

    return res.status(400).json({
      ok:false,
      error:"يوللاش تۈرى خاتا"
    });

  } catch (error) {
    console.error("MLBB ARENA ERROR:",error);
    return res.status(500).json({
      ok:false,
      error:error.message || "مۇلازىمېتىر خاتالىقى"
    });
  } finally {
    const allFiles = Object.values(files).flat();
    for (const file of allFiles) {
      if (file && file.filepath) {
        await fs.unlink(file.filepath).catch(()=>{});
      }
    }
  }
}

handler.config = {api:{bodyParser:false}};
module.exports = handler;
