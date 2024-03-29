const os = require('os');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// vue.config.js
module.exports = {
    pluginOptions: {
        electronBuilder: {
            // List native deps here if they don't work
            externals: ['iconv-lite'],
            // If you are using Yarn Workspaces, you may have multiple node_modules folders
            // List them all here so that VCP Electron Builder can find them
            nodeModulesPath: ['../../node_modules', './node_modules']
        }
    },
    runtimeCompiler: true,
    configureWebpack: {
        node: {
            process: true
        },

        plugins: [
            new CopyWebpackPlugin([
                {
                    from: 'static',
                    to: 'static'
                }
            ])
        ]
    }
};
