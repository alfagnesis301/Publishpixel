import {
  calculatePublishReadyScore,
  type ImageFormat,
  type PresetId,
  type PublishResult
} from "./publishRules";
import { estimateOutputSize, ratioToString, safeFileName } from "./imageUtils";
import { readExifInfo, type ExifInfo } from "./exifReader";

export type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageOrientation = "square" | "portrait" | "landscape" | "wide" | "vertical";

export type ImageAnalysisResult = {
  file: File;
  name: string;
  size: number;
  type: string;
  format: ImageFormat;
  width: number;
  height: number;
  aspectRatio: number;
  ratioLabel: string;
  orientation: ImageOrientation;
  megapixels: number;
  hasTransparency: boolean | null;
  hasExifMetadata: boolean | null;
  exifInfo: ExifInfo | null;
  estimatedOptimizedSize: number;
  compressionOpportunity: number;
  recommendedFormat: ImageFormat;
  recommendedMaxWidth: number;
  recommendedCompressionLevel: number;
  seoFilename: string;
  altTextStructure: string;
  openGraphCompatible: boolean;
  socialPlatformCompatible: boolean;
  isTooHeavy: boolean;
  isTooSmall: boolean;
  blurryRisk: "low" | "medium" | "high";
  notes: string[];
};

export function getFileSize(file: File): number {
  return file.size;
}

export function getImageFormat(file: File): ImageFormat {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "image/jpeg" || /\.(jpg|jpeg)$/.test(name)) return "jpg";
  if (type === "image/png" || /\.png$/.test(name)) return "png";
  if (type === "image/webp" || /\.webp$/.test(name)) return "webp";
  if (type === "image/gif" || /\.gif$/.test(name)) return "gif";
  if (type === "image/svg+xml" || /\.svg$/.test(name)) return "svg";
  return "unknown";
}

export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  const format = getImageFormat(file);
  if (format === "svg") return getSvgDimensions(file);

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return getImageElementDimensions(file);
  }
}

export function getAspectRatio(width: number, height: number): number {
  return height ? width / height : 0;
}

export function detectOrientation(width: number, height: number): ImageOrientation {
  const ratio = getAspectRatio(width, height);
  if (Math.abs(ratio - 1) <= 0.04) return "square";
  if (ratio >= 2) return "wide";
  if (ratio > 1) return "landscape";
  if (ratio <= 0.6) return "vertical";
  return "portrait";
}

export function calculateMegapixels(width: number, height: number): number {
  return Math.round((width * height) / 10_000) / 100;
}

export function estimateCompressionPotential(
  file: File,
  dimensions: ImageDimensions,
  format: ImageFormat
): number {
  const megapixels = calculateMegapixels(dimensions.width, dimensions.height);
  const estimate = estimateOutputSize(file.size, 0.78, format);
  const dimensionFactor = megapixels > 2 ? 0.82 : 0.95;
  const optimized = Math.round(estimate * dimensionFactor);
  return Math.max(0, Math.min(95, Math.round(((file.size - optimized) / file.size) * 100)));
}

export function recommendFormat(
  format: ImageFormat,
  hasTransparency: boolean | null,
  preset?: PresetId
): ImageFormat {
  if (preset === "favicon") return "svg";
  if (hasTransparency) return "webp";
  if (format === "png") return "webp";
  if (format === "gif") return "webp";
  if (format === "svg") return "svg";
  return "webp";
}

export function generateSeoFilename(originalName: string): string {
  return `${safeFileName(originalName)}-optimized.webp`;
}

export function analyzeImageForPreset(
  imageData: ImageAnalysisResult,
  preset: PresetId
): PublishResult {
  return calculatePublishReadyScore(
    {
      width: imageData.width,
      height: imageData.height,
      size: imageData.size,
      format: imageData.format,
      hasTransparency: imageData.hasTransparency
    },
    preset
  );
}

export async function analyzeImage(file: File, preset?: PresetId): Promise<ImageAnalysisResult> {
  const format = getImageFormat(file);
  const dimensions = await getImageDimensions(file);
  const hasTransparency = await detectTransparency(file, format);
  const exifInfo = format === "jpg" ? await readExifInfo(file) : null;
  const hasExifMetadata = exifInfo?.status === "detected" ? true : exifInfo?.status === "absent" ? false : null;
  const compressionOpportunity = estimateCompressionPotential(file, dimensions, format);
  const recommendedFormat = recommendFormat(format, hasTransparency, preset);
  const aspectRatio = getAspectRatio(dimensions.width, dimensions.height);
  const estimatedOptimizedSize = Math.round(
    file.size * Math.max(0.18, 1 - compressionOpportunity / 100)
  );
  const notes: string[] = [];

  if (format === "svg") {
    notes.push("SVG files receive a basic dimension check only. The SVG is not inserted into the page as HTML.");
  }

  if (format === "gif") {
    notes.push("GIF analysis uses static file checks. Animated frame quality is not evaluated.");
  }

  if (hasExifMetadata) {
    notes.push("Basic EXIF metadata markers were detected. Consider exporting a clean copy before publishing sensitive images.");
  }

  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type || "Unknown",
    format,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio,
    ratioLabel: ratioToString(dimensions.width, dimensions.height),
    orientation: detectOrientation(dimensions.width, dimensions.height),
    megapixels: calculateMegapixels(dimensions.width, dimensions.height),
    hasTransparency,
    hasExifMetadata,
    exifInfo,
    estimatedOptimizedSize,
    compressionOpportunity,
    recommendedFormat,
    recommendedMaxWidth: getRecommendedMaxWidth(dimensions.width, preset),
    recommendedCompressionLevel: format === "png" ? 0.9 : 0.78,
    seoFilename: generateSeoFilename(file.name),
    altTextStructure:
      "Describe the visible subject, context and page purpose without stuffing keywords.",
    openGraphCompatible:
      dimensions.width >= 1200 && dimensions.height >= 630 && Math.abs(aspectRatio - 1200 / 630) <= 0.08,
    socialPlatformCompatible: dimensions.width >= 1080 || dimensions.height >= 1080,
    isTooHeavy: file.size > 1024 * 1024,
    isTooSmall: dimensions.width < 800 || dimensions.height < 450,
    blurryRisk: getBlurryRisk(dimensions.width, dimensions.height, preset),
    notes
  };
}

async function detectTransparency(file: File, format: ImageFormat): Promise<boolean | null> {
  if (format !== "png" && format !== "webp") return null;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const maxSide = 160;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) return true;
    }
    return false;
  } catch {
    return null;
  }
}

async function getImageElementDimensions(file: File): Promise<ImageDimensions> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<ImageDimensions>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Could not read image dimensions."));
    });
    image.src = url;
    return await loaded;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function getSvgDimensions(file: File): Promise<ImageDimensions> {
  const text = await file.text();
  const parser = new DOMParser();
  const documentSvg = parser.parseFromString(text, "image/svg+xml");
  const svg = documentSvg.querySelector("svg");
  if (!svg) throw new Error("This SVG could not be parsed.");

  const width = parseSvgLength(svg.getAttribute("width"));
  const height = parseSvgLength(svg.getAttribute("height"));
  if (width && height) return { width, height };

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number(part));
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  throw new Error("This SVG needs width/height or a viewBox for analysis.");
}

function parseSvgLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getRecommendedMaxWidth(width: number, preset?: PresetId): number {
  if (preset === "open-graph") return 1200;
  if (preset === "youtube-thumbnail") return 1280;
  if (preset === "hero-banner") return Math.min(Math.max(width, 1600), 2400);
  return width > 1600 ? 1600 : Math.max(1200, width);
}

function getBlurryRisk(width: number, height: number, preset?: PresetId): "low" | "medium" | "high" {
  const longest = Math.max(width, height);
  if (preset === "hero-banner" && width < 1400) return "high";
  if (preset === "youtube-thumbnail" && (width < 1280 || height < 720)) return "high";
  if (longest < 800) return "high";
  if (longest < 1200) return "medium";
  return "low";
}
