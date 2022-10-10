import { Application } from "express"
import * as path from "path"
import { Server } from "socket.io"
import { Project } from "ts-morph"
import "../Extensions"
import { RoutesController } from "./RoutesController"
import { SocketController } from "./SocketController"


export class CBEditorController extends RoutesController {
    
    private static _instance: CBEditorController
    
    webclientProject = new Project({
        tsConfigFilePath: "webclient/tsconfig.json"
    })
    
    public registerRoutes() {
        
        const targets = SocketController.sharedInstance.messageTargets
        
        targets.PerformAction = (message, socketSession, respondWithMessage) => respondWithMessage()
        
        targets.PerformActionAndRetrieveData = (message, socketSession, respondWithMessage) => respondWithMessage(true)
        
        targets.PerformActionAndRetrieveDataWithParameters = async (message, socketSession, respondWithMessage) => {
            
            await respondWithMessage(message == "Autopood")
            
        }
        
        targets.EditProperty = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const referencedFiles = sourceFiles.map(
                (file) => {
                    
                    const result = {
                        codeFileContents: file.getFullText(),
                        path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                    }
                    
                    return result
                    
                }
            )
            
            await respondWithMessage({
                codeFileContents: resultFile.getFullText(),
                path: resultFile.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", ""),
                referencedFiles: referencedFiles
            })
            
        }
        
        
    }
    
    
    public static get sharedInstance() {
        return this._instance
    }
    
    // noinspection TypeScriptUMDGlobal,JSDeprecatedSymbols
    public static Instance(expressApp: Application, socketIO: Server) {
        return this._instance || (this._instance = new this(expressApp, socketIO))
    }
    
}
