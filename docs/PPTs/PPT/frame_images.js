const sharp = require("sharp");
const fs = require("fs");

// Add a rounded-corner mask + subtle border to each screenshot so it reads as a framed product view.
async function frame(inPath, outPath) {
  const img = sharp(inPath);
  const meta = await img.metadata();
  const w = meta.width, h = meta.height;
  const radius = Math.round(Math.min(w, h) * 0.025);

  // Rounded rectangle mask
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/></svg>`
  );

  const rounded = await img
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Add a thin border by drawing a stroked rounded rect on top
  const border = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${radius}" ry="${radius}" fill="none" stroke="#2A3550" stroke-width="2"/></svg>`
  );

  await sharp(rounded)
    .composite([{ input: border, blend: "over" }])
    .png()
    .toFile(outPath);
  console.log("Framed:", outPath, `${w}x${h}`);
}

(async () => {
  await frame("assets/runway.png", "assets/runway_framed.png");
  await frame("assets/agent.png", "assets/agent_framed.png");
  await frame("assets/community.png", "assets/community_framed.png");
  await frame("assets/network.png", "assets/network_framed.png");
})();
