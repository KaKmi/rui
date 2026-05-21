/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // unpdf 自带 serverless 友好的 pdfjs build；mammoth 有 zip 解析的 native 风格依赖。
    // 让 Next 在服务端用原生 require 加载，绕过 webpack 转换。
    serverComponentsExternalPackages: ['unpdf', 'mammoth'],
  },
};

export default nextConfig;
