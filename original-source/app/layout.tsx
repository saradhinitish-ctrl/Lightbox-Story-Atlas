import type { Metadata, Viewport } from "next";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/400-italic.css";
import "@fontsource/courier-prime/700.css";
import "@fontsource/courier-prime/700-italic.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-sans/400-italic.css";
import "@fontsource/ibm-plex-sans/700-italic.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/600.css";
import "@fontsource/ibm-plex-serif/700.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import "@fontsource/ibm-plex-serif/700-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import "./atlas.css";
import "./typography.css";
import "./refinement.css";
import "./visual-language.css";
import "./public.css";
import "./screenplay-polish.css";

export const viewport: Viewport = { width:"device-width", initialScale:1, viewportFit:"cover", themeColor:"#f5efdf", interactiveWidget:"resizes-content" };

export const metadata: Metadata = {
  metadataBase: new URL("https://lightbox.beigeleaf64.chatgpt.site"),
  title: "Lightbox — Screenwriting & Film Development Workspace",
  description: "Develop your film in Lightbox. Write screenplays, build story worlds, collect visual references, and plan scenes in one workspace for filmmakers.",
  verification: { google: "O3bisUWxuO7h3-av5hKtNY4EnKVh_MdZ2UQ9zRUk2WE" },
  alternates: { canonical: "/" },
  robots: { index:true, follow:true },
  openGraph: { type:"website", siteName:"Lightbox", title:"Lightbox — A workspace for filmmakers", description:"Develop the story. Write the screenplay. Find the visual language.", url:"/", images:[{url:"/brand/lightbox-approved.png",width:1254,height:1254,alt:"Lightbox logo"}] },
  twitter: { card:"summary", title:"Lightbox — A workspace for filmmakers", description:"A home for your ideas, screenplay, visual language, and scenes.", images:["/brand/lightbox-approved-512.png"] },
  manifest: "/manifest.webmanifest?version=lightbox-origin-v2",
  appleWebApp: { capable: true, title: "Lightbox", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/brand/lightbox-approved-192.png", type: "image/png", sizes: "192x192" }, { url: "/favicon.ico?brand=lightbox-approved-v1", sizes: "any" }],
    apple: "/brand/lightbox-approved-180.png",
    shortcut: "/brand/lightbox-approved-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
