// webpack.config.js
const path = require("path");

module.exports = {
  entry: "./ani-cursor.js", // 入口文件路径
  output: {
    filename: "ani-cursor.bundle.js", // 打包后的文件名
    path: path.resolve(__dirname, "dist"), // 输出目录
    library: "ani-cursor.js", // 打包成库的名字
    libraryTarget: "umd", // UMD 格式，兼容多种模块系统
    globalObject: "this", // 解决 window 和 global 在不同环境的问题
  },
  mode: "production", // 设置为生产模式，会自动压缩代码
};
