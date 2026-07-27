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
    manifest[product].description = description;

    await put("manifest.json", JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, manifest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Save failed", details: String(err) });
  }
}

async function loadManifest() {
  try {
    const { blobs } = await list({ prefix: "manifest.json" });
    const found = blobs.find((b) => b.pathname === "manifest.json");
    if (!found) return {};
    const r = await fetch(found.url);
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}
