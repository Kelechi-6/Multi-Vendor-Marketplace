/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Ensure Next.js/Turbopack uses this folder as the workspace root
    root: process.cwd(),
  },
};

export default nextConfig;
