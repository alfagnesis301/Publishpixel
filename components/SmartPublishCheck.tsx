"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CompressionEstimator from "./CompressionEstimator";
import FormatRecommendation from "./FormatRecommendation";
import FilenameSeoCheck from "./FilenameSeoCheck";
import ImageMetrics from "./ImageMetrics";
import ImagePreview from "./ImagePreview";
import ImageUploader from "./ImageUploader";
import InstagramCropPreview from "./InstagramCropPreview";
import MetadataPanel from "./MetadataPanel";
import OpenGraphPreview from "./OpenGraphPreview";
import PlatformPresetSelector from "./PlatformPresetSelector";
import PublishReadyReport from "./PublishReadyReport";
import PublishScoreCard from "./PublishScoreCard";
import RecommendationPanel from "./RecommendationPanel";
import ResizeSuggestions from "./ResizeSuggestions";
import { analyzeImage, analyzeImageForPreset, type ImageAnalysisResult } from "@/lib/imageAnalysis";
import type { PresetId } from "@/lib/publishRules";
import { translatePublishText } from "@/lib/publishTranslations";
import { useLanguage } from "./LanguageProvider";

type SmartPublishCheckProps = {
  initialPreset?: PresetId;
  heading?: string;
  description?: string;
};

const PRESET_STORAGE_KEY = "irt-last-preset";

export default function SmartPublishCheck({
  initialPreset = "website-blog",
  heading = "Smart Image Publish Check",
  description = "Upload an image and get a practical readiness score for websites, SEO, social platforms, thumbnails, product images and more."
}: SmartPublishCheckProps) {
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const { language, t } = useLanguage();

  useEffect(() => {
    if (initialPreset !== "website-blog") return;
    const stored = window.localStorage.getItem(PRESET_STORAGE_KEY) as PresetId | null;
    if (stored) setPreset(stored);
  }, [initialPreset]);

  useEffect(() => {
    window.localStorage.setItem(PRESET_STORAGE_KEY, preset);
  }, [preset]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const result = useMemo(() => (analysis ? analyzeImageForPreset(analysis, preset) : null), [analysis, preset]);
  const altTextScore = getAltTextScore(altText);
  const localizedHeading = heading === "Smart Image Publish Check" ? t("tool.defaultHeading") : heading;
  const localizedDescription =
    description ===
    "Upload an image and get a practical readiness score for websites, SEO, social platforms, thumbnails, product images and more."
      ? t("tool.defaultDescription")
      : description;

  async function handleFileAccepted(file: File, fileWarning?: string) {
    setIsLoading(true);
    setError(null);
    setWarning(fileWarning || null);
    setAnalysis(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));

    try {
      const nextAnalysis = await analyzeImage(file, preset);
      setAnalysis(nextAnalysis);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("tool.errorFallback")
      );
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }

  function clearImage() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setAnalysis(null);
    setWarning(null);
    setError(null);
    setAltText("");
  }

  return (
    <section id="tool" className="panel scroll-mt-24 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="label">{t("tool.eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-slate-950 sm:text-3xl dark:text-white">
            {localizedHeading}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{localizedDescription}</p>
          <div className="mt-5">
            <ImageUploader onFileAccepted={handleFileAccepted} isLoading={isLoading} />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="alt-text-draft" className="label">
              {t("tool.altLabel")}
            </label>
            <textarea
              id="alt-text-draft"
              className="input min-h-20"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder={t("tool.altPlaceholder")}
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t("tool.altHelp")}
            </p>
          </div>

          <PlatformPresetSelector value={preset} onChange={setPreset} />

          {warning ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>{warning}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white/82 p-6 text-center dark:border-slate-800 dark:bg-slate-900/82" role="status">
              <Loader2 size={26} className="mx-auto animate-spin text-blue-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("tool.analyzing")}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200" role="alert">
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {!analysis && !isLoading && !error ? (
            <div className="rounded-lg border border-slate-200 bg-white/72 p-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/72 dark:text-slate-400">
              <CheckCircle2 size={20} className="mb-3 text-emerald-500" aria-hidden="true" />
              {t("tool.empty")}
            </div>
          ) : null}
        </div>
      </div>

      {analysis && result && objectUrl ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <ImagePreview analysis={analysis} objectUrl={objectUrl} onClear={clearImage} />
            {(preset === "instagram-post" || preset === "instagram-story") && analysis.format !== "svg" ? (
              <InstagramCropPreview imageUrl={objectUrl} />
            ) : null}
            <ImageMetrics analysis={analysis} />
          </div>
          <div className="grid gap-4">
            <PublishScoreCard result={result} />
            <RecommendationPanel result={result} />
            <PublishReadyReport
              score={result.score}
              preset={t(`preset.${result.preset.id}`)}
              format={analysis.format.toUpperCase()}
              width={analysis.width}
              height={analysis.height}
              size={analysis.size}
              recommendations={result.recommendations.map((item) => translatePublishText(item, language))}
            />
            <FormatRecommendation result={result} />
            <FilenameSeoCheck filename={analysis.name} />
            <AltTextCheck score={altTextScore} />
            <MetadataPanel analysis={analysis} />
          </div>
          <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
            <OpenGraphPreview
              imageUrl={objectUrl}
              title={t("tool.ogTitle")}
              description={t("tool.ogDescription")}
            />
            <CompressionEstimator analysis={analysis} />
            <ResizeSuggestions analysis={analysis} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getAltTextScore(altText: string): {
  status: "missing" | "needsDetail" | "looksUseful";
  messageKey: string;
} {
  const trimmed = altText.trim();
  if (!trimmed) {
    return {
      status: "missing",
      messageKey: "tool.altMessage.missing"
    };
  }
  if (trimmed.length < 20) {
    return {
      status: "needsDetail",
      messageKey: "tool.altMessage.needsDetail"
    };
  }
  return {
    status: "looksUseful",
    messageKey: "tool.altMessage.looksUseful"
  };
}

function AltTextCheck({
  score
}: {
  score: ReturnType<typeof getAltTextScore>;
}) {
  const { t } = useLanguage();
  const statusLabel = t(`tool.altStatus.${score.status}`);
  const colorClass =
    score.status === "looksUseful"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100"
      : score.status === "needsDetail"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100"
        : "border-slate-200 bg-white/82 text-slate-700 dark:border-slate-800 dark:bg-slate-900/82 dark:text-slate-300";

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <h3 className="text-sm font-bold">{t("tool.altCheck", { status: statusLabel })}</h3>
      <p className="mt-2 text-sm leading-6">{t(score.messageKey)}</p>
    </div>
  );
}
