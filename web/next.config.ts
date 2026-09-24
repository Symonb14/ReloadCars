import type { NextConfig } from 'next'

const apiUrl = process.env.API_URL ?? 'http://localhost:3333'

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The browser talks only to this app: /backend/* is proxied to the API, so the
  // session cookie is first-party (no CORS, no cross-site cookies).
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${apiUrl}/:path*` }]
  },
}

export default nextConfig
