import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Xelyqor — AI Study Materials",
  description: "Generate comprehensive study materials from your lectures",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#2c2416",
              color: "#f5f0e8",
              fontFamily: "Plus Jakarta Sans",
              fontSize: "14px",
              borderRadius: "8px",
            },
          }}
        />
      </body>
    </html>
  );
}
