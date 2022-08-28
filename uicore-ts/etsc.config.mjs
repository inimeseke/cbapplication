import inlineWorkerPlugin from "esbuild-plugin-inline-worker"
import {BuildOptions} from "esbuild"


/**
 * @type {BuildOptions} BuildOptions for ESBuild.
 */
const buildOptions = {
    
    plugins: [inlineWorkerPlugin({sourcemap: "inline"})],
    sourcemap: true,
    write: true,
    minify: false
    
}

module.exports = {
    esbuild: buildOptions
}




