// /api/save-description.js
// Saves a custom description for a product into manifest.json, alongside
// its photo slots. The main website reads this on load and uses it instead
// of the default hardcoded description, if present.

import { put, list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, product, description } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if (!product || typeof description !== "string") {
    return res.status(400).json({ error: "Missing product or description" });
  }

  try {
    const manifest = await loadManifest();
    if (!manifest[product]) manifest[product] = {};
    manifest[product].description = sanitizeDescriptionHtml(description);

    await put("manifest.json", JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, manifest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Save failed", details: String(err) });
  }
}

// Only the formatting the admin toolbar can actually produce is allowed through:
// bold/italic/underline, legacy <font size> tags from execCommand, line breaks and
// paragraphs. Everything else (scripts, links, event handlers, iframes, etc.) is stripped.
function sanitizeDescriptionHtml(html) {
  let out = html;
  // Remove script/style blocks entirely, including their content
  out = out.replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Remove any tag not on the allowlist (keeps the text inside, drops the tag itself)
  const allowed = ["b", "strong", "i", "em", "u", "br", "p", "span", "font", "ul", "ol", "li"];
  out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag, attrs) => {
    const lower = tag.toLowerCase();
    if (!allowed.includes(lower)) return "";
    // Strip all attributes except a safe "style" limited to font-size, and font's "size"/"color"
    let safeAttrs = "";
    const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
    if (styleMatch) {
      const sizeOnly = styleMatch[1].match(/font-size\s*:\s*[\w.%-]+/i);
      if (sizeOnly) safeAttrs += ` style="${sizeOnly[0]}"`;
    }
    if (lower === "font") {
      const sizeAttr = attrs.match(/size\s*=\s*"?(\d+)"?/i);
      if (sizeAttr) safeAttrs += ` size="${sizeAttr[1]}"`;
    }
    const closing = match.startsWith("</") ? "/" : "";
    return `<${closing}${lower}${closing ? "" : safeAttrs}>`;
  });
  return out;
}

async function loadManifest() {
  try {
    const { blobs } = await list({ prefix: "manifest.json" });
    const found = blobs.find((b) => b.pathname === "manifest.json");
    if (!found) return {};
    const r = await fetch(found.url + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}
