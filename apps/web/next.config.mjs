import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kinetics/core', '@kinetics/abi'],
  turbopack: {
    root: workspaceRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
