// /api/delete-product.js
// Permanently removes a custom product (added via the admin page) and all
// of its uploaded photos. Cannot be used to remove the 13 built-in products
// -- those live in the site's code, not the manifest.

import { put, list, del } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, slug } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if (!slug) {
    return res.status(400).json({ error: "Missing slug" });
  }

  try {
    const manifest = await loadManifest();
    const entry = manifest.customProducts && manifest.customProducts[slug];

    if (entry && Array.isArray(entry.images)) {
      for (const url of entry.images) {
        try {
          await del(url);
        } catch (e) {
          console.warn("Could not delete blob file (continuing anyway):", e);
        }
      }
    }
    if (manifest.customProducts) delete manifest.customProducts[slug];

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
    return res.status(500).json({ error: "Delete failed", details: String(err) });
  }
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
