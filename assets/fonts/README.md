# Fonts

**Crimson Pro** by Jacques Le Bailly, under the SIL Open Font License 1.1 (`OFL.txt`).

Used only by the OpenGraph image route (`app/j/[token]/opengraph-image.tsx`). Satori, which
renders those images, cannot use the `next/font` faces the site itself is set in — it needs a
real font file handed to it at render time. Crimson Pro is the closest old-style serif to the
EB Garamond used on the page, and is small enough to commit.

`next.config.mjs` lists this directory under `outputFileTracingIncludes` so the deploy bundles
it; without that the image route renders in a fallback sans and the decree stops looking like a
decree.
