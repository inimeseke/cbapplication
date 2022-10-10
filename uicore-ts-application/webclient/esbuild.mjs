import {build} from "esbuild"
import inlineImage from "esbuild-plugin-inline-image"
import inlineWorkerPlugin from "esbuild-plugin-inline-worker"
// import esbuildSvelte from "esbuild-svelte"
// import sveltePreprocess from "svelte-preprocess"


build({
    
    entryPoints: ["scripts/RunApplication.ts"],
    bundle: true,
    outfile: "compiledScripts/webclient.js",
    plugins: [
        inlineWorkerPlugin({sourcemap: false}),
        inlineImage()
        // "esbuild-svelte": "^0.7.1",
        // "svelte-preprocess": "^4.10.7",
        // "svelte": "^3.49.0",
        // "svelte-check": "^2.8.1",
        // esbuildSvelte({
        //     preprocess: sveltePreprocess()
        // })
    ],
    sourcemap: false,
    minify: true,
    preserveSymlinks: true,
    keepNames: true,
    format: "esm"
    
})




