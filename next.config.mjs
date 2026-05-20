/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse v2 内部依赖 pdfjs-dist@5 (ESM)；Next webpack 把它当 CJS bundle 会
    // 触发 "Object.defineProperty called on non-object"。让 Next 在服务端用原生
    // require 加载这两个包，绕过 webpack 转换。
    // mammoth 类似处理（zip 解析有 native binding 风格的依赖）。
    serverComponentsExternalPackages: [
      'pdf-parse',
      'pdfjs-dist',
      'mammoth',
      'tesseract.js',
      '@napi-rs/canvas',
    ],
  },
};

export default nextConfig;
