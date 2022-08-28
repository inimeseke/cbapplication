import {nodeResolve} from "@rollup/plugin-node-resolve"
import path from "path"
import sourcemaps from "rollup-plugin-sourcemaps"
import webWorkerLoader from "rollup-plugin-web-worker-loader"
import typescript from "rollup-plugin-typescript2"


const onwarn = (warning, rollupWarning) => {
    
    // Silence circular dependency warning for CBCore
    if (
        warning.code === "CIRCULAR_DEPENDENCY"
        && !warning.importer.indexOf(path.normalize("scripts/CBCore/CBCore.ts"))
    ) {
        return
    }
    
    rollupWarning(warning)
    
}

export default {
    input: "./scripts/index.ts",
    output: {
        
        dir: "compiledScripts",
        format: "cjs",
        sourcemap: true
        
    },
    onwarn: onwarn,
    plugins: [
        nodeResolve({
            
            browser: true
            
        }),
        typescript(),
        sourcemaps(),
        webWorkerLoader({
            
            targetPlatform: "browser",
            sourcemap: true,
            pattern: /web-worker:(.+)/,
            inline: true
            
        })
    ]
}
