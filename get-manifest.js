// /api/get-manifest.js
// Returns the current product-photo manifest so the main website can
// display uploaded photos instead of the placeholder boxes. No password
// needed to read -- only uploading is protected.

import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const { blobs } = await list({ prefix: "manifest.json" });
    const found = blobs.find((b) => b.pathname === "manifest.json");
    if (!found) {
      return res.status(200).json({}); // no photos uploaded yet
    }
    const r = await fetch(found.url);
    const manifest = await r.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json(manifest);
  } catch (err) {
    console.error(err);
    return res.status(200).json({}); // fail quietly -- site should still work with placeholders
  }
}
