/** @type {import('next').NextConfig} */
const nextConfig = {
  // As in the app (ADR 0029): pages added here are checked for instant
  // navigations from the start.
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
