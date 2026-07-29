// /api/save-product.js
// Creates or updates a custom product added from the admin page (not one of
// the 13 built into the code). Stored under manifest.customProducts, keyed
// by a URL-safe slug. The main website merges these in alongside the
// built-in products at load time.

import { put, list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, slug: incomingSlug, name, cat, desc, features, oem } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }
  if (!name || !cat) {
    return res.status(400).json({ error: "Missing name or category" });
  }
  if (!["textiles", "decor", "lifestyle"].includes(cat)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  try {
    const manifest = await loadManifest();
    if (!manifest.customProducts) manifest.customProducts = {};

    let slug = incomingSlug;
    if (!slug) {
      const base = slugify(name);
      slug = base;
      let n = 2;
      // avoid clashing with an existing custom product or a built-in product name-slug
      while (manifest.customProducts[slug]) {
        slug = `${base}-${n}`;
        n++;
      }
    }

    const existing = manifest.customProducts[slug] || {};
    manifest.customProducts[slug] = {
      name: String(name).trim(),
      cat,
      desc: typeof desc === "string" ? desc : existing.desc || "",
      features: Array.isArray(features) ? features.filter(Boolean) : existing.features || [],
      oem: !!oem,
      images: existing.images || [],
    };

    await put("manifest.json", JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: "application/json",
    });

    return res.status(200).json({ ok: true, slug, manifest });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Save failed", details: String(err) });
  }
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
