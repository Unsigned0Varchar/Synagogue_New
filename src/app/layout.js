import "./globals.css";

export const metadata = {
  title: "SYNAGOGUE | Ghost MGM",
  description: "SYNAGOGUE event information and ticket booking by Ghost MGM Management Team.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
