const express = require("express");
const fetch = require("node-fetch");

const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

console.log(`Starting with PORT: ${PORT}, RD_KEY: ${RD_KEY ? "yes" : "no"}`);

/* =========================
   MANIFEST
========================= */
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "com.souhail.stremio.v2",
    version: "2.0.0",
    name: "🟢Souhail Premium🟢",
    description: "Clean Real-Debrid Streams (Safe Formatting)",
    resources: ["stream"],
    types: ["movie", "series"]
  });
});

/* =========================
   STREAM
========================= */
app.get("/stream/:type/:id.json", async (req, res) => {
  if (!RD_KEY) return res.json({ streams: [] });

  try {
    const torrentioUrl =
      `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;

    const response = await fetch(torrentioUrl);
    const data = await response.json();

    const streams = (data.streams || [])
      // ❌ نحيد CAM / TS
      .filter(s => !/(CAM|TS|TELE|SCR|HDCAM)/i.test(s.title || ""))
      // ✅ نخلي غير الجودات المزيانة
      .filter(s => /(2160p|1080p|720p)/i.test(s.title || ""))
      // 🔽 ترتيب حسب الحجم
      .sort((a, b) => extractSize(b.title) - extractSize(a.title))
      // 🎨 غير نزين title
      .map(s => {
        const t = s.title || "";

        return {
          ...s, // ⛔ مهم: ما نمسّوش stream الأصلي
          title:
`🎬 ${cleanTitle(t)}
💾 ${formatSize(extractSize(t))} | ${extractVideoRange(t)}
📽️ ${extract(t, /(2160p|1080p|720p)/i)}
🎞️ ${extract(t, /(H\.265|H\.264|x265|x264)/i) || "H.264"}
🔊 ${extract(t, /(Atmos|DDP5\.1|DD5\.1|AC3|AAC)/i) || "Audio"}
🧲 ${extract(t, /(YTS|RARBG|TPB|ThePirateBay|1337x)/i) || "Torrent"}`
        };
      });

    res.json({ streams });

  } catch (err) {
    console.error("Stream error:", err.message);
    res.json({ streams: [] });
  }
});

/* =========================
   INSTALL
========================= */
app.get("/install", (req, res) => {
  const baseUrl = `https://${req.hostname}`;
  res.send(`
    <h2>Install Souhail Premium</h2>
    <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json">
      Install Addon
    </a>
    <p>${baseUrl}/manifest.json</p>
  `);
});

app.get("/", (req, res) => res.redirect("/install"));

/* =========================
   HELPERS
========================= */
function extract(text, regex) {
  const m = text.match(regex);
  return m ? m[0] : null;
}

function extractVideoRange(text) {
  if (/dolby\s?vision|dv/i.test(text)) return "Dolby Vision";
  if (/hdr/i.test(text)) return "HDR";
  return "SDR";
}

function cleanTitle(text) {
  return text
    .split(/\b(2160p|1080p|720p|WEB|BluRay|HDR|DV|x264|x265)\b/i)[0]
    .replace(/\./g, " ")
    .trim();
}

function extractSize(text) {
  const m = text.match(/(\d+(\.\d+)?)\s?(GB|MB)/i);
  if (!m) return 0;

  const size = parseFloat(m[1]);
  return m[3].toUpperCase() === "GB" ? size * 1024 : size;
}

function formatSize(sizeMB) {
  if (!sizeMB) return "";
  return sizeMB >= 1024
    ? (sizeMB / 1024).toFixed(2) + " GB"
    : sizeMB.toFixed(0) + " MB";
}

/* =========================
   START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
