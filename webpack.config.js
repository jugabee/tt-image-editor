var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    entry: ["./index.ts", "./src/stylesheets/main.scss"],
    output: {
        filename: "./dist/bundle.js"
    },
    resolve: {
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader"
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: "css-loader?importLoaders=1",
                }),
            },
            {
                test: /\.(sass|scss)$/,
                use: ExtractTextPlugin.extract(["css-loader"])
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: "./dist/bundle.css",
            allChunks: true,
        })
    ],
}
