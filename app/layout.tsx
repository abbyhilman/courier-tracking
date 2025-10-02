// app/layout.tsx
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
