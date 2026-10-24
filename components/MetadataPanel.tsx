"use client";

import { FileText, Info } from "lucide-react";
import type { ImageAnalysisResult } from "@/lib/imageAnalysis";
import { useLanguage } from "./LanguageProvider";

export default function MetadataPanel({ analysis }: { analysis: ImageAnalysisResult }) {
  const { t, language } = useLanguage();
  const es = language === "es";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/82 p-4 dark:border-slate-800 dark:bg-slate-900/82">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-blue-600 dark:text-blue-300" aria-hidden="true" />
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">{t("metadata.title")}</h3>
      </div>
      <dl className="mt-3 grid gap-3 text-sm">
        <div>
          <dt className="label">{t("metadata.filename")}</dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">{analysis.seoFilename}</dd>
        </div>
        <div>
          <dt className="label">{t("metadata.altStructure")}</dt>
          <dd className="mt-1 leading-6 text-slate-600 dark:text-slate-400">
            {analysis.altTextStructure ===
            "Describe the visible subject, context and page purpose without stuffing keywords."
              ? t("metadata.altDefault")
              : analysis.altTextStructure}
          </dd>
        </div>
        <div>
          <dt className="label">{t("metadata.exifSignal")}</dt>
          <dd className="mt-1 leading-6 text-slate-600 dark:text-slate-400">
            {analysis.hasExifMetadata === null
              ? t("metadata.exifNotChecked")
              : analysis.hasExifMetadata
                ? t("metadata.exifDetected")
                : t("metadata.exifNone")}
          </dd>
        </div>
        {analysis.exifInfo?.status === "detected" ? (
          <>
            {analysis.exifInfo.cameraMake || analysis.exifInfo.cameraModel ? (
              <div>
                <dt className="label">{es ? "Cámara" : "Camera"}</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {[analysis.exifInfo.cameraMake, analysis.exifInfo.cameraModel].filter(Boolean).join(" ")}
                </dd>
              </div>
            ) : null}
            {analysis.exifInfo.capturedAt ? (
              <div>
                <dt className="label">{es ? "Fecha de captura (EXIF)" : "Capture date (EXIF)"}</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{analysis.exifInfo.capturedAt}</dd>
              </div>
            ) : null}
            <div className={`rounded-lg border p-3 ${
              analysis.exifInfo.gpsPresent
                ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            }`} role={analysis.exifInfo.gpsPresent ? "alert" : "status"}>
              <dt className="font-semibold">{es ? "Ubicación GPS" : "GPS location"}</dt>
              <dd className="mt-1 leading-6">
                {analysis.exifInfo.gpsPresent
                  ? es
                    ? "Se detectaron etiquetas GPS. La foto podría revelar dónde se tomó. Exporta una copia y verifica los metadatos antes de compartirla."
                    : "GPS tags detected. This photo may reveal where it was taken. Export a copy and verify its metadata before sharing."
                  : es
                    ? "No se detectaron etiquetas de coordenadas GPS en el bloque EXIF leído. Esto no garantiza que el archivo esté libre de datos de ubicación."
                    : "No GPS coordinate tags found in the inspected EXIF block. This does not guarantee the file has no location data."}
              </dd>
            </div>
          </>
        ) : null}
        {analysis.exifInfo?.status === "unreadable" ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="status">
            {es
              ? "No se pudieron leer los metadatos EXIF con seguridad. No asumas que la imagen no contiene GPS."
              : "EXIF metadata could not be read reliably. Do not assume the image is free of GPS information."}
          </p>
        ) : null}
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            {t("metadata.notice")}
          </p>
        </div>
      </dl>
    </div>
  );
}
