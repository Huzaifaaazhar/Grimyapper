import * as THREE from 'three';

/**
 * A sheet of parchment, drawn into a canvas and handed to three.js.
 *
 * Shared by both verdicts, and extracted here because the two scenes had
 * drifted apart in exactly the way that shows: the warrant was a real page
 * with a ruled border, a heading and the texture of writing on it, while the
 * charter was `meshStandardMaterial color="#e9dfc6"` — a flat brown square.
 * Watching the recordings side by side, the blessing looked like a placeholder
 * next to the execution, and this was the whole reason.
 *
 * The body is ruled strokes rather than words. At the size and duration either
 * page is seen, legible copy would be noise; what has to read is the heading,
 * the border and the *impression* of a written instrument.
 *
 * The caller owns disposal — both scenes drop their texture when they unmount.
 */
export type ParchmentSpec = {
  heading: string;
  subheading: string;
  /** The rubricated line under the heading. Vermilion for a warrant, gilt for a charter. */
  accent: string;
  /** Pixels. Portrait, since both pages are. */
  width?: number;
  height?: number;
};

export function makeParchment({
  heading,
  subheading,
  accent,
  width = 768,
  height = 1024,
}: ParchmentSpec): THREE.CanvasTexture | null {
  const W = width;
  const H = height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Parchment ground, with the lit centre and aged edges the CSS has.
  ctx.fillStyle = '#e9dfc6';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, H * 0.75);
  glow.addColorStop(0, 'rgba(255,252,241,0.75)');
  glow.addColorStop(1, 'rgba(122,92,46,0.16)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Fibre: cheap value noise, multiplied in. Without it the page reads as flat
  // card, and on the warrant the burn edge has nothing to bite into.
  const grain = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    grain.data[i] += n;
    grain.data[i + 1] += n;
    grain.data[i + 2] += n * 0.8;
  }
  ctx.putImageData(grain, 0, 0);

  // The ruled border.
  ctx.strokeStyle = 'rgba(90,72,46,0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  // The heading: the one thing that must read before the page chars or gilds.
  ctx.fillStyle = '#2a1e12';
  ctx.textAlign = 'center';
  ctx.font = 'bold 62px Georgia, serif';
  ctx.fillText(heading, W / 2, 190);

  ctx.fillStyle = accent;
  ctx.font = '22px Georgia, serif';
  ctx.fillText(subheading.toUpperCase(), W / 2, 240);

  // Body copy as ruled strokes: the texture of writing, not the words.
  ctx.strokeStyle = 'rgba(42,30,18,0.42)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  let y = 330;
  for (let line = 0; line < 18; line += 1) {
    const indent = line % 6 === 0 ? 150 : 110;
    // Ragged right, as justified manuscript text is not.
    const end = W - 110 - Math.random() * 90;
    ctx.beginPath();
    ctx.moveTo(indent, y);
    ctx.lineTo(end, y);
    ctx.stroke();
    y += line % 6 === 5 ? 54 : 34;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
