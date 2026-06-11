const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");

const fa = require("react-icons/fa");

function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}
async function iconToPng(IconComponent, color, outPath, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(outPath, buf);
}

const NAVY = "#1B2A4A";
const BLUE = "#1B4DB1";
const WHITE = "#FFFFFF";
const TEAL = "#0E7C7B";
const GOLD = "#C08A2E";

(async () => {
  if (!fs.existsSync("icons")) fs.mkdirSync("icons");
  // Problem slide icons
  await iconToPng(fa.FaPiggyBank, WHITE, "icons/save_w.png");
  await iconToPng(fa.FaCompass, WHITE, "icons/compass_w.png");
  await iconToPng(fa.FaUserSlash, WHITE, "icons/isolation_w.png");
  await iconToPng(fa.FaBrain, WHITE, "icons/brain_w.png");
  // Solution slide icons
  await iconToPng(fa.FaChartLine, WHITE, "icons/chart_w.png");
  await iconToPng(fa.FaWallet, WHITE, "icons/wallet_w.png");
  await iconToPng(fa.FaNetworkWired, WHITE, "icons/network_w.png");
  // Foundations icons
  await iconToPng(fa.FaEye, WHITE, "icons/eye_w.png");
  await iconToPng(fa.FaRobot, WHITE, "icons/robot_w.png");
  await iconToPng(fa.FaUsers, WHITE, "icons/users_w.png");
  await iconToPng(fa.FaInfinity, WHITE, "icons/infinity_w.png");
  // Future scope
  await iconToPng(fa.FaUserGraduate, WHITE, "icons/grad_w.png");
  await iconToPng(fa.FaHandshake, WHITE, "icons/handshake_w.png");
  await iconToPng(fa.FaBolt, WHITE, "icons/bolt_w.png");
  await iconToPng(fa.FaGlobeEurope, WHITE, "icons/globe_w.png");
  // Closing checkmarks
  await iconToPng(fa.FaCheckCircle, BLUE, "icons/check_b.png");
  await iconToPng(fa.FaRocket, WHITE, "icons/rocket_w.png");
  // arrow
  await iconToPng(fa.FaArrowRight, WHITE, "icons/arrow_w.png");
  await iconToPng(fa.FaArrowRight, BLUE, "icons/arrow_b.png");
  console.log("Icons generated:", fs.readdirSync("icons").length);
})();
