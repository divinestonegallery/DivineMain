import localFont from "next/font/local";
import { Manrope } from "next/font/google";

// Body face used by https://www.lykke.travel/. Manrope is a variable font, weights 200–800.
export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

// Heading face. Travel LYKKE uses URW Gothic. TeX Gyre Adventor is the
// GUST-licensed release of that design and can be embedded on the web.
export const headingFont = localFont({
  src: [
    {
      path: "../../shared/fonts/tex-gyre-adventor/texgyreadventor-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../shared/fonts/tex-gyre-adventor/texgyreadventor-bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-heading",
  fallback: ["sans-serif"],
});

export const fontVariables = `${manrope.variable} ${headingFont.variable}`;
