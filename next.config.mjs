/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse v2 内部依赖 pdfjs-dist@5 (ESM)；Next webpack 把它当 CJS bundle 会
    // 触发 "Object.defineProperty called on non-object"。让 Next 在服务端用原生
    // require 加载这两个包，绕过 webpack 转换。
    // mammoth 类似处理（zip 解析有 native binding 风格的依赖）。
    //
    // @napi-rs/canvas：pdfjs-dist 在 Node 端启动时会 `require('@napi-rs/canvas')`
    // 拿 DOMMatrix/ImageData/Path2D 做 polyfill —— 缺这个包，Vercel serverless
    // 会抛 "ReferenceError: DOMMatrix is not defined"。必须 external，否则
    // webpack 没法把它的 .node 二进制 bundle 进去。
    serverComponentsExternalPackages: [
      'pdf-parse',
      'pdfjs-dist',
      'mammoth',
      '@napi-rs/canvas',
    ],
    // pnpm 的 symlink 结构有时让 Vercel outputFileTracing 漏掉 @napi-rs/canvas
    // 的平台 .node 二进制。显式 include 所有 @napi-rs 子包，保证 lambda 里能找到。
    outputFileTracingIncludes: {
      '/api/resumes/upload': ['./node_modules/.pnpm/@napi-rs+**/**'],
    },
  },
};

export default nextConfig;
