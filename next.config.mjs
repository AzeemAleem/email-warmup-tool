/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
    serverComponentsExternalPackages: ["imapflow", "@prisma/client", "nodemailer"],
  },
};

export default nextConfig;
