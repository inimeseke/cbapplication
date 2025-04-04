import { CBCoreInitializer } from "../webclient/node_modules/cbcore-ts/compiledScripts/CBDataInterfaces"
import { Application, Request, Response } from "express"
import * as fs from "fs"
import { Server } from "socket.io"
import { promisify } from "util"
import { InternalSettingsController } from "./InternalSettingsController"
import { RoutesController } from "./RoutesController"


export class WebClientController extends RoutesController {
    
    private static _instance: WebClientController
    
    public registerRoutes() {
        
        this.expressApp.route("/").get(async (request: Request, response: Response) => {
            
            const result: CBCoreInitializer = {
                
                languageValues: await InternalSettingsController.sharedInstance.retrieveLanguagesValues(),
                // Set the default language key here
                defaultLanguageKey: "en"
                
            }
            
            const viewLocation = "index"
            
            function escape(s) {
                return ("" + s)
                    .replace(/\\/g, "\\\\")
                    .replace(/\t/g, "\\t")
                    .replace(/\n/g, "\\n")
                    .replace(/\u00A0/g, "\\u00A0")
                    .replace(/&/g, "\\x26")
                    .replace(/'/g, "\\x27")
                    .replace(/"/g, "\\x22")
                    .replace(/</g, "\\x3C")
                    .replace(/>/g, "\\x3E")
            }
            
            
            const stats = await promisify(fs.stat)("webclient/compiledScripts/webclient.js")
            const mtime = stats.mtime
            
            response.render(
                viewLocation,
                {
                    CBCoreInitializerObject: escape(encodeURIComponent(JSON.stringify(result))),
                    FileModifiedTime: mtime.getTime()
                }
            )
            
            // We should send dropdown data through here as much as possible
            // Seems like we should have an in-memory object with data for all the dropdowns in a controller and update it when dropdownData is changed via InternalSettingsController
            
        })
        
        
        this.expressApp.route("/unsupported").get(async (request: Request, response: Response) => {
            
            response.render("unsupported")
            
        })
        
        //const asd = new UICore("RootView", RootViewController)
        
        
        
    }
    
    public static get sharedInstance() {
        return this._instance
    }
    
    public static Instance(expressApp: Application, socketIO: Server) {
        return this._instance || (this._instance = new this(expressApp, socketIO))
    }
    
}
