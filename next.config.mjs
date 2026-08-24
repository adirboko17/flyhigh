/** @type {import('next').NextConfig} */
const nextConfig = {
  // מסתיר את כפתור ה-N של כלי הפיתוח, שיכול להיראות כמו צל בתחתית המובייל.
  devIndicators: false,
  // מונע מ-next build ומשרת הפיתוח לדרוס זה לזה chunks באותה תיקייה.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    // ב־Next 15 ברירת המחדל ל־dynamic היא 0 — כל לחיצה בתפריט שולחת RSC מחדש.
    // 30 שניות משאירות את העמוד הקודם בזיכרון, כך שחזרה אחורה מיידית.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    serverActions: {
      // Cursor/VS Code מעבירים את localhost דרך dev tunnel. ההחרגה קיימת
      // בפיתוח בלבד כדי לא להרחיב את מקורות ה-Server Actions בייצור.
      allowedOrigins:
        process.env.NODE_ENV === "development"
          ? ["localhost:3000", "127.0.0.1:3000", "*.devtunnels.ms"]
          : [],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "dckaymriibwnkkinakhz.supabase.co",
      },
    ],
  },
};

export default nextConfig;
