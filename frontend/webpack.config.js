const path = require('path')
const HtmlWebPackPlugin = require('html-webpack-plugin')

module.exports = {
  devServer: {
    disableHostCheck: true
  },
  module: {
    rules: [
      // {
      //   test: /\.js$/,
      //   use: {loader: 'eslint-loader'},
      //   exclude: /node_modules/
      // },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader'
          }
        ]
      }
    ]
  },
  entry: {
    index: './src/index.js',
    vm: '../changtopia/VM/vm.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './src/index.html',
      filename: './index.html'
    })
  ],
}
