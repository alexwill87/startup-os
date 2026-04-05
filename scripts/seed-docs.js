const fs = require("fs");
const https = require("https");

const BASE = "https://gesdscaawdvvmrmxlxdu.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlc2RzY2Fhd2R2dm1ybXhseGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODkzOTQsImV4cCI6MjA5MDk2NTM5NH0.6RAWrwC5zlhDD-IpydtrHL7n4llQ0XCnS6Z7EFnW948";

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token || ANON}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Login
  const login = await api("POST", "/auth/v1/token?grant_type=password", {
    email: "pokamblg@gmail.com",
    password: "RadarCockpit2026!",
  });
  const token = login.access_token;
  if (!token) { console.error("Login failed:", login); process.exit(1); }

  // Read markdown
  const md = fs.readFileSync("/home/omar/RADAR/Radar_AtoZ.md", "utf-8");
  const lines = md.split("\n");

  // Parse into chapters
  const chapters = [];
  let currentPart = "Introduction";
  let currentTitle = null;
  let currentSlug = null;
  let currentContent = [];
  let order = 0;

  function flush() {
    if (currentTitle && currentContent.length > 0) {
      chapters.push({
        slug: currentSlug,
        title: currentTitle,
        part: currentPart,
        chapter_order: order++,
        content: currentContent.join("\n").trim(),
      });
    }
    currentContent = [];
  }

  for (const line of lines) {
    // Detect PART headers
    const partMatch = line.match(/^# (PART \d+.+)$/);
    if (partMatch) {
      flush();
      currentPart = partMatch[1];
      continue;
    }

    // Detect chapter headers
    const chapterMatch = line.match(/^## (.+)$/);
    if (chapterMatch) {
      flush();
      currentTitle = chapterMatch[1];
      currentSlug = currentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 60);
      continue;
    }

    currentContent.push(line);
  }
  flush();

  // Add intro section
  const introEnd = lines.findIndex((l) => l.startsWith("## "));
  if (introEnd > 0) {
    chapters.unshift({
      slug: "introduction",
      title: "Introduction — What Radar Is",
      part: "Introduction",
      chapter_order: -1,
      content: lines.slice(0, introEnd).join("\n").trim(),
    });
  }

  // Fix ordering
  chapters.forEach((c, i) => (c.chapter_order = i));

  console.log(`Parsed ${chapters.length} chapters:\n`);
  chapters.forEach((c) =>
    console.log(`  [${c.chapter_order}] ${c.part} > ${c.title} (${c.content.length} chars)`)
  );

  // Insert
  console.log("\nInserting...\n");
  for (const ch of chapters) {
    const res = await api("POST", "/rest/v1/cockpit_docs", ch, token);
    if (Array.isArray(res)) {
      console.log(`  OK: ${ch.title}`);
    } else {
      console.log(`  ERR: ${ch.title} -- ${res.message || JSON.stringify(res)}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
