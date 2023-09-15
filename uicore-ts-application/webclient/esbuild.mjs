import filePlugin from "@chialab/esbuild-plugin-any-file"
import {build} from "esbuild"
import {esbuildPluginDecorator} from "esbuild-plugin-decorator"
import inlineImage from "esbuild-plugin-inline-image"
import inlineWorkerPlugin from "esbuild-plugin-inline-worker"
import ts from "typescript"
import fs from "fs"
// import esbuildSvelte from "esbuild-svelte"
// import sveltePreprocess from "svelte-preprocess"


const workerEntryPoints = [
    "vs/language/json/json.worker.js",
    "vs/language/css/css.worker.js",
    "vs/language/html/html.worker.js",
    "vs/language/typescript/ts.worker.js",
    "vs/editor/editor.worker.js"
]

await build({
    entryPoints: workerEntryPoints.map((entry) => `./node_modules/monaco-editor/esm/${entry}`),
    bundle: true,
    format: "iife",
    plugins: [filePlugin()],
    outbase: "./node_modules/monaco-editor/esm/",
    outdir: "compiledScripts"
})

await build({
    
    entryPoints: ["scripts/RunApplication.ts"],
    bundle: true,
    outfile: "compiledScripts/webclient.js",
    plugins: [
        inlineWorkerPlugin({sourcemap: "external"}),
        inlineImage(),
        //esbuildPluginDecorator(),
        filePlugin()
        // "esbuild-svelte": "^0.7.1",
        // "svelte-preprocess": "^4.10.7",
        // "svelte": "^3.49.0",
        // "svelte-check": "^2.8.1",
        // esbuildSvelte({
        //     preprocess: sveltePreprocess()
        // })
    ],
    sourcemap: true,
    minify: false,
    format: "esm",
    preserveSymlinks: true,
    keepNames: true
    
})

// build({
//
//     entryPoints: ["scripts/RunApplication.ts"],
//     bundle: true,
//     outfile: "compiledScripts/webclient.js",
//     plugins: [
//         inlineWorkerPlugin({sourcemap: false}),
//         inlineImage()
//         // "esbuild-svelte": "^0.7.1",
//         // "svelte-preprocess": "^4.10.7",
//         // "svelte": "^3.49.0",
//         // "svelte-check": "^2.8.1",
//         // esbuildSvelte({
//         //     preprocess: sveltePreprocess()
//         // })
//     ],
//     sourcemap: false,
//     minify: true,
//     preserveSymlinks: true,
//     keepNames: true,
//     format: "esm"
//
// })

let result = fs.readFileSync("compiledScripts/webclient.js").toString()
result = result.replace("@(import_uicore_ts2.UIComponentView)", "")
    .replace("@CBEditorNestedAttributes()", "")
fs.writeFileSync("compiledScripts/webclient.js", result)

// const result = ts.transpile(fs.readFileSync("compiledScripts/webclient_raw.js").toString(), {
//     compilerOptions: {
//         allowJs: true,
//         outFile: "compiledScripts/webclient.js",
//         target: "ES2018"
//     }
// })
//
// fs.writeFileSync("compiledScripts/webclient.js", result)




