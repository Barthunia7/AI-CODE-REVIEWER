import "./globals.css";

export const metadata = {
  title: "AI Code Reviewer Assistant",
  description: "Automate code quality optimization workflows.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
