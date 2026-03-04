import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

// --- Elements ---
const mainEl = document.querySelector(".main") as HTMLElement;
const swatch = document.getElementById("swatch") as HTMLElement;
const hexDisplay = document.getElementById("hex-display") as HTMLElement;
const colorInput = document.getElementById("color-input") as HTMLInputElement;
const sliderR = document.getElementById("slider-r") as HTMLInputElement;
const sliderG = document.getElementById("slider-g") as HTMLInputElement;
const sliderB = document.getElementById("slider-b") as HTMLInputElement;
const valueR = document.getElementById("value-r") as HTMLElement;
const valueG = document.getElementById("value-g") as HTMLElement;
const valueB = document.getElementById("value-b") as HTMLElement;
const hexInput = document.getElementById("hex-input") as HTMLInputElement;
const rgbDisplay = document.getElementById("rgb-display") as HTMLElement;
const hslDisplay = document.getElementById("hsl-display") as HTMLElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;

// --- Color Utilities ---
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

// --- UI Update ---
function updateUI(r: number, g: number, b: number) {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);

  swatch.style.backgroundColor = hex;
  hexDisplay.textContent = hex;
  colorInput.value = hex;
  hexInput.value = hex;

  sliderR.value = String(r);
  sliderG.value = String(g);
  sliderB.value = String(b);
  valueR.textContent = String(r);
  valueG.textContent = String(g);
  valueB.textContent = String(b);

  // Style slider tracks with color tints
  sliderR.style.setProperty("--track-color", `rgb(${r}, 0, 0)`);
  sliderG.style.setProperty("--track-color", `rgb(0, ${g}, 0)`);
  sliderB.style.setProperty("--track-color", `rgb(0, 0, ${b})`);

  rgbDisplay.textContent = `${r}, ${g}, ${b}`;
  hslDisplay.textContent = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
}

// --- Event Handlers ---
colorInput.addEventListener("input", () => {
  const rgb = hexToRgb(colorInput.value);
  if (rgb) updateUI(rgb.r, rgb.g, rgb.b);
});

function onSliderChange() {
  updateUI(
    parseInt(sliderR.value),
    parseInt(sliderG.value),
    parseInt(sliderB.value),
  );
}
sliderR.addEventListener("input", onSliderChange);
sliderG.addEventListener("input", onSliderChange);
sliderB.addEventListener("input", onSliderChange);

hexInput.addEventListener("change", () => {
  let val = hexInput.value.trim();
  if (!val.startsWith("#")) val = "#" + val;
  const rgb = hexToRgb(val);
  if (rgb) updateUI(rgb.r, rgb.g, rgb.b);
  else hexInput.value = hexDisplay.textContent ?? "";
});

copyBtn.addEventListener("click", async () => {
  const hex = hexDisplay.textContent ?? "";
  try {
    await navigator.clipboard.writeText(hex);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy Hex"), 1500);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => (copyBtn.textContent = "Copy Hex"), 1500);
  }
});

// --- Host Context ---
function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

// --- MCP App Lifecycle ---
const app = new App({ name: "Color Picker", version: "1.0.0" });

app.onteardown = async () => ({ });

app.ontoolinput = (params) => {
  const args = params.arguments as { initialColor?: string } | undefined;
  if (args?.initialColor) {
    const rgb = hexToRgb(args.initialColor);
    if (rgb) updateUI(rgb.r, rgb.g, rgb.b);
  }
};

app.ontoolresult = (result: CallToolResult) => {
  const data = result.structuredContent as {
    hex?: string;
    rgb?: { r: number; g: number; b: number };
  } | undefined;
  if (data?.rgb) {
    updateUI(data.rgb.r, data.rgb.g, data.rgb.b);
  } else if (data?.hex) {
    const rgb = hexToRgb(data.hex);
    if (rgb) updateUI(rgb.r, rgb.g, rgb.b);
  }
};

app.ontoolcancelled = () => {};
app.onerror = console.error;
app.onhostcontextchanged = handleHostContextChanged;

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
