"use client";

import { toString as qrToSvg } from "qrcode";
import { useEffect, useState } from "react";
import { Spinner } from "./ui";

/**
 * Renders a QR code entirely in the browser. Used for the TOTP otpauth://
 * URL, which contains the two-factor secret: it must never be sent to an
 * external QR service.
 */
export function QrCode({ value, label, size = 192 }: { value: string; label: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    qrToSvg(value, { type: "svg", errorCorrectionLevel: "M", margin: 2 })
      .then((svg) => {
        if (!cancelled) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (failed) return <p className="text-sm text-failed">Could not draw the QR code. Enter the key manually instead.</p>;
  if (!src) return <Spinner label="Drawing QR code" />;
  // eslint-disable-next-line @next/next/no-img-element -- a local data: URL; next/image adds nothing here.
  return <img src={src} alt={label} width={size} height={size} className="rounded-lg border border-line bg-white" />;
}
