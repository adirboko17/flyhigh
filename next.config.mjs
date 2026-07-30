/** @type {import('next').NextConfig} */
const nextConfig = {
  // מסתיר את כפתור ה-N של כלי הפיתוח, שיכול להיראות כמו צל בתחתית המובייל.
  devIndicators: false,
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
