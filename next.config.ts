const isProd = process.env.NODE_ENV === 'production';
const repositoryName = 'NNDLproject';

const nextConfig = {
    // (Optional) Export as a static site
    // See https://nextjs.org/docs/pages/building-your-application/deploying/static-exports#configuration
    output: 'export',
    trailingSlash: true,
    basePath: isProd ? `/${repositoryName}` : '',
    assetPrefix: isProd ? `/${repositoryName}/` : '',
    images: {
      unoptimized: true
    },

    turbopack: (config: any) => {
        // See https://webpack.js.org/configuration/resolve/#resolvealias
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        return config;
    },
    webpack: (config: any) => {
        // See https://webpack.js.org/configuration/resolve/#resolvealias
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        return config;
    },
}

module.exports = nextConfig
