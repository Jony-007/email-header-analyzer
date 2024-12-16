import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <header>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </header>
      <body>{children}</body>
    </html>
  );
}
