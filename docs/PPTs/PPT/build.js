const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const pres = new pptxgen();
pres.defineLayout({ name: "W", width: 13.333, height: 7.5 });
pres.layout = "W";
pres.author = "UniFund";
pres.title = "UniFund Investor Presentation";

// ---------- PALETTE ----------
const NAVY   = "1B2A4A";   // deep navy (headings)
const BLUE   = "1B4DB1";   // brand blue (accents)
const BLUE2  = "4F75C9";   // lighter blue
const TEAL   = "0E7C7B";   // teal accent
const GOLD   = "C08A2E";   // gold accent
const GREY   = "5B6577";   // body text
const LGREY  = "8A93A3";   // muted
const CARD   = "F7F9FC";   // light card
const CARDBD = "E2E8F0";   // card border
const WHITE  = "FFFFFF";
const DARK   = "0E1525";   // dark screenshot bg surround

const HEAD = "Georgia";
const BODY = "Calibri";

const W = 13.333, H = 7.5;
const MX = 0.92;           // standard left/right margin

// ---------- HELPERS ----------
function makeShadow() {
  return { type: "outer", color: "1B2A4A", blur: 9, offset: 3, angle: 90, opacity: 0.12 };
}
function softShadow() {
  return { type: "outer", color: "1B2A4A", blur: 6, offset: 2, angle: 90, opacity: 0.08 };
}

// Eyebrow + title + footer scaffolding for content slides
function scaffold(slide, eyebrow, title, pageNum) {
  slide.background = { color: WHITE };
  slide.addText(eyebrow, {
    x: MX, y: 0.55, w: 10, h: 0.35, margin: 0,
    fontFace: BODY, fontSize: 12.5, bold: true, color: BLUE, charSpacing: 3,
  });
  slide.addText(title, {
    x: MX, y: 0.92, w: 11.5, h: 0.95, margin: 0,
    fontFace: HEAD, fontSize: 33, bold: true, color: NAVY, lineSpacing: 36,
  });
  // footer
  slide.addShape(pres.shapes.LINE, { x: MX, y: 7.02, w: W - 2 * MX, h: 0, line: { color: CARDBD, width: 1 } });
  slide.addText("UniFund", { x: MX, y: 7.08, w: 3, h: 0.3, margin: 0, fontFace: BODY, fontSize: 9.5, bold: true, color: LGREY, charSpacing: 2 });
  slide.addText("Investor Presentation · 2026", { x: W / 2 - 2, y: 7.08, w: 4, h: 0.3, margin: 0, align: "center", fontFace: BODY, fontSize: 9.5, color: LGREY });
  slide.addText(String(pageNum), { x: W - MX - 1, y: 7.08, w: 1, h: 0.3, margin: 0, align: "right", fontFace: BODY, fontSize: 9.5, color: LGREY });
}

function iconCircle(slide, x, y, d, fill, iconPath, iconScale = 0.5) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, shadow: softShadow() });
  const id = d * iconScale;
  slide.addImage({ path: iconPath, x: x + (d - id) / 2, y: y + (d - id) / 2, w: id, h: id });
}

// =====================================================================
// SLIDE 1 — TITLE
// =====================================================================
(function () {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  // left accent band
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.32, h: H, fill: { color: BLUE } });

  // subtle decorative oversized rings on the right (depth, not slop)
  s.addShape(pres.shapes.OVAL, { x: 9.4, y: -1.6, w: 5.6, h: 5.6, fill: { type: "none" }, line: { color: "2C3F63", width: 1.25 } });
  s.addShape(pres.shapes.OVAL, { x: 10.7, y: 1.4, w: 4.2, h: 4.2, fill: { type: "none" }, line: { color: "26375A", width: 1 } });
  s.addShape(pres.shapes.OVAL, { x: 11.9, y: 4.3, w: 3.0, h: 3.0, fill: { color: "223252" }, line: { type: "none" } });

  s.addText("INVESTOR PRESENTATION · 2026", {
    x: 1.1, y: 1.7, w: 8, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, bold: true, color: BLUE2, charSpacing: 4,
  });
  s.addText("UNIFUND", {
    x: 1.05, y: 2.35, w: 10, h: 1.5, margin: 0,
    fontFace: HEAD, fontSize: 84, bold: true, color: WHITE, charSpacing: 1,
  });
  // tagline as three weighted phrases
  s.addText([
    { text: "Predict your career.", options: { color: WHITE, bold: true } },
    { text: "   Protect your money.", options: { color: "C7D3EA" } },
    { text: "   Plug into your people.", options: { color: "C7D3EA" } },
  ], { x: 1.1, y: 3.95, w: 10.5, h: 0.5, margin: 0, fontFace: BODY, fontSize: 21 });

  s.addShape(pres.shapes.LINE, { x: 1.12, y: 4.75, w: 4.4, h: 0, line: { color: BLUE, width: 2 } });

  s.addText("Confidential — for discussion purposes only", {
    x: 1.1, y: 6.75, w: 8, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 11, italic: true, color: "7E8BA6",
  });
})();

// =====================================================================
// SLIDE 2 — THE PROBLEM (2x2 cards)
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "THE PROBLEM", "Advice is broken. Money is scary.\nStudent knowledge dies every year.", 2);

  const cards = [
    { n: "01", t: "Lack of saving motivation", d: "Students struggle to consistently save without accountability or incentives.", icon: "icons/save_w.png", c: BLUE },
    { n: "02", t: "Career blindness", d: "Students invest significant time and substantial financial resources in a path whose outcomes remain uncertain.", icon: "icons/compass_w.png", c: TEAL },
    { n: "03", t: "Isolation", d: "They begin with limited professional networks and without access to mentors who have navigated a similar path.", icon: "icons/isolation_w.png", c: GOLD },
    { n: "04", t: "Lost knowledge", d: "The student who found the cheap grocer, the right bank, the visa trick — once they graduate, it is gone.", icon: "icons/brain_w.png", c: BLUE2 },
  ];
  const cw = 5.62, ch = 1.92, gx = 0.55, gy = 0.35;
  const x0 = MX, y0 = 2.55;
  cards.forEach((cd, i) => {
    const cx = x0 + (i % 2) * (cw + gx);
    const cy = y0 + Math.floor(i / 2) * (ch + gy);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: CARD }, line: { color: CARDBD, width: 1 }, rectRadius: 0.06, shadow: softShadow() });
    iconCircle(s, cx + 0.32, cy + 0.34, 0.62, cd.c, cd.icon, 0.5);
    s.addText(cd.n, { x: cx + 0.3, y: cy + 1.02, w: 0.7, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: cd.c });
    s.addText(cd.t, { x: cx + 1.12, y: cy + 0.3, w: cw - 1.4, h: 0.4, margin: 0, fontFace: BODY, fontSize: 15.5, bold: true, color: NAVY });
    s.addText(cd.d, { x: cx + 1.12, y: cy + 0.72, w: cw - 1.4, h: ch - 0.85, margin: 0, fontFace: BODY, fontSize: 11.5, color: GREY, lineSpacing: 15 });
  });
})();

// =====================================================================
// SLIDE 3 — THE SOLUTION (3 columns)
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "THE SOLUTION", "One AI agent per student. Three engines.", 3);

  const cols = [
    { n: "01", t: "Career Simulation", d: "Type your plan and see a month-by-month prediction, built from thousands who already did it.", icon: "icons/chart_w.png", c: BLUE },
    { n: "02", t: "Money & Runway", d: "Tracks spending and shows exactly how many months of runway remain — the daily habit.", icon: "icons/wallet_w.png", c: TEAL },
    { n: "03", t: "Community Knowledge", d: "Students' agents share knowledge automatically — the network that compounds.", icon: "icons/network_w.png", c: GOLD },
  ];
  const cw = 3.78, gx = 0.45, ch = 3.5;
  const x0 = MX, y0 = 2.65;
  cols.forEach((cd, i) => {
    const cx = x0 + i * (cw + gx);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: y0, w: cw, h: ch, fill: { color: CARD }, line: { color: CARDBD, width: 1 }, rectRadius: 0.05, shadow: softShadow() });
    // top accent
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: y0, w: cw, h: 0.09, fill: { color: cd.c } });
    iconCircle(s, cx + 0.5, y0 + 0.42, 0.82, cd.c, cd.icon, 0.5);
    s.addText(cd.n, { x: cx + 0.5, y: y0 + 1.42, w: 1.2, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 22, bold: true, color: cd.c });
    s.addText(cd.t, { x: cx + 0.5, y: y0 + 1.92, w: cw - 1, h: 0.45, margin: 0, fontFace: BODY, fontSize: 17, bold: true, color: NAVY });
    s.addText(cd.d, { x: cx + 0.5, y: y0 + 2.42, w: cw - 1, h: 0.95, margin: 0, fontFace: BODY, fontSize: 12.5, color: GREY, lineSpacing: 17 });
  });
})();

// =====================================================================
// SLIDE 4 — FOUNDATIONS (2x2)
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "FOUNDATIONS", "Four pillars hold the business up.", 4);
  const cards = [
    { n: "01", t: "Forward-Looking Visibility", d: "Replaces the backward-looking model of traditional banking apps by showing students what they can spend, not just what they have spent.", icon: "icons/eye_w.png", c: BLUE },
    { n: "02", t: "Personalized Intelligence", d: "Every student has a personal AI agent that learns their behaviour, goals, and context over time.", icon: "icons/robot_w.png", c: TEAL },
    { n: "03", t: "Collective Wisdom", d: "The platform's true strength lies in its student community, where anonymized peer connections turn individual experiences into shared knowledge.", icon: "icons/users_w.png", c: GOLD },
    { n: "04", t: "Compounding Network Effect", d: "Each new student strengthens the platform by contributing insights that continuously improve recommendations and increase its value.", icon: "icons/infinity_w.png", c: BLUE2 },
  ];
  const cw = 5.62, ch = 1.92, gx = 0.55, gy = 0.35;
  const x0 = MX, y0 = 2.4;
  cards.forEach((cd, i) => {
    const cx = x0 + (i % 2) * (cw + gx);
    const cy = y0 + Math.floor(i / 2) * (ch + gy);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: CARD }, line: { color: CARDBD, width: 1 }, rectRadius: 0.06, shadow: softShadow() });
    iconCircle(s, cx + 0.32, cy + 0.34, 0.62, cd.c, cd.icon, 0.5);
    s.addText(cd.n, { x: cx + 0.3, y: cy + 1.02, w: 0.7, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: cd.c });
    s.addText(cd.t, { x: cx + 1.12, y: cy + 0.3, w: cw - 1.4, h: 0.4, margin: 0, fontFace: BODY, fontSize: 15.5, bold: true, color: NAVY });
    s.addText(cd.d, { x: cx + 1.12, y: cy + 0.72, w: cw - 1.4, h: ch - 0.85, margin: 0, fontFace: BODY, fontSize: 11.5, color: GREY, lineSpacing: 15 });
  });
})();

// =====================================================================
// PRODUCT SCREENSHOT SLIDES (5-8) — the redesign focus
// Consistent split layout: text panel left, framed screenshot right.
// =====================================================================
function productSlide(cfg) {
  const s = pres.addSlide();
  s.background = { color: WHITE };

  // Left text panel
  const px = MX, pw = 3.95;
  // eyebrow strip
  s.addText("THE PRODUCT", { x: px, y: 0.7, w: pw, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11.5, bold: true, color: BLUE, charSpacing: 3 });

  // big number
  s.addText(cfg.n, { x: px, y: 2.3, w: 2, h: 1.0, margin: 0, fontFace: HEAD, fontSize: 64, bold: true, color: cfg.c });
  // accent rule
  s.addShape(pres.shapes.LINE, { x: px + 0.06, y: 3.42, w: 1.3, h: 0, line: { color: cfg.c, width: 2.5 } });
  // title
  s.addText(cfg.t, { x: px, y: 3.62, w: pw, h: 0.9, margin: 0, fontFace: HEAD, fontSize: 25, bold: true, color: NAVY, lineSpacing: 28 });
  // description
  s.addText(cfg.d, { x: px, y: 4.55, w: pw, h: 1.6, margin: 0, fontFace: BODY, fontSize: 14, color: GREY, lineSpacing: 21 });

  // tag chip
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: 1.15, w: cfg.tagW, h: 0.42, fill: { color: cfg.c }, line: { type: "none" }, rectRadius: 0.21 });
  s.addText(cfg.tag, { x: px, y: 1.15, w: cfg.tagW, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: BODY, fontSize: 11, bold: true, color: WHITE, charSpacing: 1 });

  // Right framed screenshot, vertically centered
  const aspect = cfg.w / cfg.h;
  const imgW = 7.55;
  const imgH = imgW / aspect;
  const imgX = W - MX - imgW;
  const imgY = (H - imgH) / 2 + 0.05;
  // dark backing panel slightly larger for a "device" feel
  const pad = 0.12;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: imgX - pad, y: imgY - pad, w: imgW + 2 * pad, h: imgH + 2 * pad, fill: { color: DARK }, line: { type: "none" }, rectRadius: 0.08, shadow: makeShadow() });
  s.addImage({ path: cfg.img, x: imgX, y: imgY, w: imgW, h: imgH });

  return s;
}

productSlide({
  n: "01", c: BLUE,
  tag: "FINANCIAL RUNWAY", tagW: 2.0,
  t: "Forward-Looking Visibility",
  d: "Replaces the backward-looking model of traditional banking apps by showing students what they can spend, not just what they have spent.",
  img: "assets/runway_framed.png", w: 1889, h: 901,
});
productSlide({
  n: "02", c: TEAL,
  tag: "AGENT STUDIO", tagW: 1.75,
  t: "Agent Studio",
  d: "Every student has a personal AI agent that learns their behaviour, goals, and context over time — building an identity that grows with them.",
  img: "assets/agent_framed.png", w: 1905, h: 923,
});
productSlide({
  n: "03", c: GOLD,
  tag: "COMMUNITY HUB", tagW: 1.95,
  t: "Community Knowledge",
  d: "The platform's true strength lies in its student community, where anonymized peer connections transform individual experiences into shared knowledge.",
  img: "assets/community_framed.png", w: 1909, h: 956,
});
productSlide({
  n: "04", c: BLUE2,
  tag: "AGENTIC WEB", tagW: 1.75,
  t: "Compounding Network Effect",
  d: "Each new student strengthens the platform by contributing insights that continuously improve recommendations and increase its value over time.",
  img: "assets/network_framed.png", w: 1908, h: 916,
});

// =====================================================================
// SLIDE 9 — THE PRODUCT (5 beats timeline)
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "THE PRODUCT", "The experience, in five beats.", 9);
  const beats = [
    { t: "Agent wakes up", d: "A 3D particle system forms your digital self as you onboard." },
    { t: "Daily money check", d: "\"4.2 months of runway. You're €38 over on food this week.\"" },
    { t: "Career simulation", d: "\"Masters in AI, Dublin\" renders a month-by-month timeline with risks flagged." },
    { t: "Community answers", d: "Another student's agent replies automatically while they sleep." },
    { t: "Marketplace moment", d: "\"Grocery 1.2km away, 15% off.\" The student saves; we earn commission." },
  ];
  const x0 = MX + 0.1, y0 = 2.55, rowH = 0.86, d = 0.6;
  // connecting line
  s.addShape(pres.shapes.LINE, { x: x0 + d / 2, y: y0 + d / 2, w: 0, h: (beats.length - 1) * rowH, line: { color: CARDBD, width: 1.5 } });
  beats.forEach((b, i) => {
    const cy = y0 + i * rowH;
    s.addShape(pres.shapes.OVAL, { x: x0, y: cy, w: d, h: d, fill: { color: BLUE }, line: { type: "none" }, shadow: softShadow() });
    s.addText(String(i + 1), { x: x0, y: cy, w: d, h: d, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 18, bold: true, color: WHITE });
    s.addText(b.t, { x: x0 + 0.95, y: cy, w: 3.4, h: d, margin: 0, valign: "middle", fontFace: BODY, fontSize: 15.5, bold: true, color: NAVY });
    s.addText(b.d, { x: x0 + 4.55, y: cy, w: 7.3, h: d, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13.5, color: GREY, lineSpacing: 17 });
  });
})();

// =====================================================================
// SLIDE 10 — REVENUE MODEL (doughnut + list)
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "REVENUE MODEL", "Students don't pay. Partners do.", 10);
  s.addText("88% of revenue comes from merchants, brands, banks and universities.", {
    x: MX, y: 1.85, w: 11, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14.5, italic: true, color: GREY,
  });

  // Doughnut chart
  const rows = [
    { t: "Hyper-local affiliate commerce", p: 30, d: "Merchants pay 10–20% on ethnic groceries & food. Recurring weekly.", c: BLUE },
    { t: "Brand partnerships & offers", p: 22, d: "Brands pay to reach verified students. The proven UNiDAYS model.", c: BLUE2 },
    { t: "Financial-services referrals", p: 20, d: "Banks and fintechs pay for student accounts, cards, remittance.", c: TEAL },
    { t: "Institutional B2B", p: 16, d: "Universities pay €499–€2,999/mo to reduce dropout.", c: GOLD },
    { t: "Student subscriptions", p: 12, d: "Kept low — students mostly stay free.", c: LGREY },
  ];
  s.addChart(pres.charts.DOUGHNUT, [{
    name: "Revenue", labels: rows.map(r => r.t), values: rows.map(r => r.p),
  }], {
    x: 0.55, y: 2.55, w: 4.3, h: 3.9,
    chartColors: rows.map(r => r.c),
    holeSize: 62, showLegend: false, showValue: false,
    chartArea: { fill: { color: WHITE } },
  });
  // center label
  s.addText([
    { text: "88%\n", options: { fontSize: 30, bold: true, color: BLUE, fontFace: HEAD } },
    { text: "from partners", options: { fontSize: 11.5, color: GREY, fontFace: BODY } },
  ], { x: 1.7, y: 4.0, w: 2.0, h: 1.0, margin: 0, align: "center", valign: "middle", lineSpacing: 30 });

  // List rows on right
  const lx = 5.35, lw = 7.05, ly = 2.6, rh = 0.74, gap = 0.07;
  rows.forEach((r, i) => {
    const cy = ly + i * (rh + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y: cy, w: lw, h: rh, fill: { color: i % 2 === 0 ? CARD : WHITE }, line: { color: CARDBD, width: 1 }, rectRadius: 0.04 });
    s.addShape(pres.shapes.OVAL, { x: lx + 0.22, y: cy + rh / 2 - 0.09, w: 0.18, h: 0.18, fill: { color: r.c }, line: { type: "none" } });
    s.addText(r.t, { x: lx + 0.58, y: cy, w: 2.85, h: rh, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13, bold: true, color: NAVY });
    s.addText(`${r.p}%`, { x: lx + 3.4, y: cy, w: 0.75, h: rh, margin: 0, valign: "middle", align: "right", fontFace: HEAD, fontSize: 16, bold: true, color: r.c });
    s.addText(r.d, { x: lx + 4.35, y: cy, w: lw - 4.5, h: rh, margin: 0, valign: "middle", fontFace: BODY, fontSize: 9.5, color: GREY, lineSpacing: 11.5 });
  });
  s.addText("€250–450/mo grocery spend × 12–15% ≈ €12–15/mo per student — more than any subscription, and they pay €0.", {
    x: 5.35, y: 6.5, w: 7.05, h: 0.4, margin: 0, align: "left", fontFace: BODY, fontSize: 10.5, italic: true, color: GOLD,
  });
})();

// =====================================================================
// SLIDE 11 — FUTURE SCOPE
// =====================================================================
(function () {
  const s = pres.addSlide();
  scaffold(s, "FUTURE SCOPE", "From student app to lifelong AI commerce network.", 11);
  const items = [
    { t: "Student → alumni → lifelong companion", d: "The agent grows into the user's high-value financial life stages.", icon: "icons/grad_w.png", c: BLUE },
    { t: "The agent economy", d: "Your agent finds offers, negotiates, and shares knowledge on your behalf.", icon: "icons/handshake_w.png", c: TEAL },
    { t: "Predictive commerce & finance", d: "We know your runway, so we surface the right product at the right moment.", icon: "icons/bolt_w.png", c: GOLD },
    { t: "Every campus, every country", d: "A localisation playbook that repeats, market after market.", icon: "icons/globe_w.png", c: BLUE2 },
  ];
  const x0 = MX, y0 = 2.42, rowH = 0.86, d = 0.66;
  items.forEach((it, i) => {
    const cy = y0 + i * rowH;
    iconCircle(s, x0, cy, d, it.c, it.icon, 0.5);
    s.addText(it.t, { x: x0 + 0.95, y: cy, w: 4.6, h: d, margin: 0, valign: "middle", fontFace: BODY, fontSize: 15.5, bold: true, color: NAVY });
    s.addText(it.d, { x: x0 + 5.7, y: cy, w: 6.1, h: d, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13.5, color: GREY, lineSpacing: 17 });
  });
  // endgame callout (sits above footer line at y=7.02)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y: 6.14, w: W - 2 * MX, h: 0.6, fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.06 });
  s.addText([
    { text: "The endgame:  ", options: { bold: true, color: WHITE } },
    { text: "the queryable layer of human experience — monetized through commerce.", options: { color: "C7D3EA" } },
  ], { x: MX + 0.3, y: 6.14, w: W - 2 * MX - 0.6, h: 0.6, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13.5 });
})();

// =====================================================================
// SLIDE 12 — THE OPPORTUNITY (closing, dark)
// =====================================================================
(function () {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.32, h: H, fill: { color: BLUE } });
  // decorative rings
  s.addShape(pres.shapes.OVAL, { x: 10.0, y: -1.4, w: 5.2, h: 5.2, fill: { type: "none" }, line: { color: "2C3F63", width: 1.25 } });
  s.addShape(pres.shapes.OVAL, { x: 11.4, y: 3.6, w: 3.4, h: 3.4, fill: { color: "223252" }, line: { type: "none" } });

  s.addText("THE OPPORTUNITY", { x: 1.1, y: 0.95, w: 8, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: BLUE2, charSpacing: 3 });
  s.addText("The network students\ncan't graduate without.", {
    x: 1.05, y: 1.4, w: 10.5, h: 1.7, margin: 0, fontFace: HEAD, fontSize: 46, bold: true, color: WHITE, lineSpacing: 52,
  });
  s.addText("Every student we add makes the product smarter, the partner deals better, and the margins higher — a relationship that starts at 18 and lasts a lifetime.", {
    x: 1.1, y: 3.25, w: 9.7, h: 0.9, margin: 0, fontFace: BODY, fontSize: 16, color: "C7D3EA", lineSpacing: 23,
  });

  const pills = [
    { t: "Built", d: "Frontend live — real product, not a mockup" },
    { t: "Proven", d: "Same model as UNiDAYS (£53M/yr)" },
    { t: "Aligned", d: "We profit when students save" },
  ];
  const pw = 3.5, gx = 0.42, x0 = 1.1, y0 = 4.5;
  pills.forEach((p, i) => {
    const cx = x0 + i * (pw + gx);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: y0, w: pw, h: 1.35, fill: { color: "223252" }, line: { color: "33476D", width: 1 }, rectRadius: 0.06 });
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: y0, w: 0.07, h: 1.35, fill: { color: BLUE2 } });
    s.addText(p.t, { x: cx + 0.32, y: y0 + 0.2, w: pw - 0.5, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 19, bold: true, color: WHITE });
    s.addText(p.d, { x: cx + 0.32, y: y0 + 0.65, w: pw - 0.55, h: 0.6, margin: 0, fontFace: BODY, fontSize: 12.5, color: "AEBBD4", lineSpacing: 15 });
  });

  // CTA button
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.1, y: 6.25, w: 3.6, h: 0.62, fill: { color: BLUE }, line: { type: "none" }, rectRadius: 0.08, shadow: makeShadow() });
  s.addImage({ path: "icons/rocket_w.png", x: 1.45, y: 6.43, w: 0.26, h: 0.26 });
  s.addText("Let's build this together", { x: 1.75, y: 6.25, w: 2.8, h: 0.62, margin: 0, valign: "middle", fontFace: BODY, fontSize: 14.5, bold: true, color: WHITE });
})();

// =====================================================================
// SLIDE 13 — THANK YOU
// =====================================================================
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.32, h: H, fill: { color: BLUE } });
  s.addText("UNIFUND", { x: 0, y: 2.7, w: W, h: 0.6, margin: 0, align: "center", fontFace: BODY, fontSize: 15, bold: true, color: BLUE, charSpacing: 5 });
  s.addText("Thank you.", { x: 0, y: 3.15, w: W, h: 1.2, margin: 0, align: "center", fontFace: HEAD, fontSize: 60, bold: true, color: NAVY });
  s.addText("Predict your career.  Protect your money.  Plug into your people.", {
    x: 0, y: 4.5, w: W, h: 0.5, margin: 0, align: "center", fontFace: BODY, fontSize: 16, color: GREY,
  });
})();

pres.writeFile({ fileName: "UniFund_Investor_Deck.pptx" }).then(() => console.log("WROTE UniFund_Investor_Deck.pptx"));
