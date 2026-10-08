import { ImageResponse } from "next/og";

import { APP_DESCRIPTION, APP_NAME } from "@/config/brand";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = APP_NAME;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#09090B",
          color: "#FAFAFA",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "#111113",
            border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          T
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: "-0.04em",
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            marginTop: 16,
            maxWidth: 820,
            fontSize: 28,
            lineHeight: 1.4,
            color: "#A1A1AA",
          }}
        >
          {APP_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
