import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Campus AI: study help that reads your coursework";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const YELLOW = "#FACC15";
const BLACK = "#171717";

/** 1200x630 social preview (Open Graph + Twitter). Same pixel look as the site. */
export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public", "campus-ai-logo-dark.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: YELLOW,
          backgroundImage:
            "linear-gradient(#E4BC11 2px, transparent 2px), linear-gradient(90deg, #E4BC11 2px, transparent 2px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 1040,
            padding: "56px 64px",
            background: "#FFFFFF",
            border: `6px solid ${BLACK}`,
            boxShadow: `16px 16px 0 ${BLACK}`,
          }}
        >
          <div style={{ display: "flex", background: BLACK, padding: "20px 28px", alignSelf: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={316} height={69} alt="" />
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              color: BLACK,
              letterSpacing: -2,
            }}
          >
            Study help that reads your own notes.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#44403C" }}>
            Homework, quizzes, flashcards and a study plan, from your own coursework.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
