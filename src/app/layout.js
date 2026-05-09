import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pankaj Sir Study Hub",
  description: "A premium educational platform for SEBA Excellence",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{
            style: {
              background: '#022c22',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
