import { deleteSync } from "del"
import fs from "fs"


const source = "./template"
const destination = "./dist/template"

if (fs.existsSync(destination)) {
    deleteSync(destination)
}

fs.cpSync(
    source,
    destination,
    {
        recursive: true,
        dereference: true,
        filter: (source, destination) => !source.includes("node_modules")
    }
)



