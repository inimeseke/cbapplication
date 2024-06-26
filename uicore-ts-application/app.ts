import * as bodyParser from "body-parser"
import * as dotenv from "dotenv"
import * as express from "express"

import * as HTTP from "http"
import { MongoMemoryServer } from "mongodb-memory-server"
import * as mongoose from "mongoose"
import * as passport from "passport"
import * as path from "path"
import * as SocketIO from "socket.io"
import { PORT } from "./config"
import { CBEditorController } from "./controllers/CBEditorController"
import { ChatGPTController } from "./controllers/ChatGPTController"
import { FilesController } from "./controllers/FilesController"
import { InternalSettingsController } from "./controllers/InternalSettingsController"
import { SocketController } from "./controllers/SocketController"
import { UserController } from "./controllers/UserController"
import { WebClientController } from "./controllers/WebClientController"
import "./Extensions"

//mongoose.set('debug', true);

export default class App {
    
    public expressApp: express.Application
    public static mongoUrl: string
    HTTPServerInstance: HTTP.Server
    socketIO: SocketIO.Server
    
    constructor() {
        
        var origlog = console.log
        
        console.log = function (obj, ...placeholders) {
            
            const date = new Date().toISOString()
            
            if (typeof obj === "string") {
                placeholders.unshift(date + " " + obj)
            }
            else {
                
                // This handles console.log( object )
                placeholders.unshift(obj)
                placeholders.unshift(date + " %j")
                
            }
            
            origlog.apply(this, placeholders)
            
        }
        
        dotenv.config({ path: "./configuration.env" })
        
        this.expressApp = express()
        this.HTTPServerInstance = this.expressApp.listen(PORT, () => {
            
            console.log("Express server listening on port " + PORT)
            
        })
        this.config()
        this.mongoSetup()
        
        this.socketIO = new SocketIO.Server(this.HTTPServerInstance, { cookie: false, pingTimeout: 30000 })
        
        SocketController.Instance(this.socketIO)
        UserController.Instance(this.expressApp)
        
        WebClientController.Instance(this.expressApp, this.socketIO).registerRoutes()
        
        FilesController.Instance(this.expressApp, this.socketIO).registerRoutes()
        
        InternalSettingsController.Instance(this.expressApp, this.socketIO).registerRoutes()
        CBEditorController.Instance(this.expressApp, this.socketIO).registerRoutes()
        
        ChatGPTController.Instance(this.expressApp, this.socketIO).registerRoutes()
        
        
    }
    
    private config(): void {
        
        // This apparently has to be done before other configurations because of some kind on speed issue
        this.expressApp.use(express.static(path.join(__dirname, "webclient")))
        
        this.expressApp.use(passport.initialize())
        
        // support application/json type post data
        this.expressApp.use(bodyParser.json())
        // support application/x-www-form-urlencoded post data
        this.expressApp.use(bodyParser.urlencoded({ extended: false }))
        
        this.expressApp.set("view engine", "ejs")// tell Express we're using EJS
        this.expressApp.set("views", path.join(__dirname + "/webclient"))// set path to *.ejs files
        
        // this.expressApp.use(minifyHTML({
        //     override: true,
        //     exception_url: false,
        //     htmlMinifier: {
        //         removeComments: true,
        //         collapseWhitespace: true,
        //         collapseBooleanAttributes: true,
        //         //removeAttributeQuotes:     true,
        //         //removeEmptyAttributes:     true,
        //         minifyJS: true
        //     }
        // }))
        
        //this.expressApp.use(cookieParser())// sets request.cookies
        
    }
    
    private async mongoSetup() {

        (mongoose as any).Promise = global.Promise// @see https://stackoverflow.com/a/38833920/4782491

        const mongodb = await MongoMemoryServer.create()

        const address = mongodb.getUri("ui_core_application") //"mongodb://localhost:27017/ui_core_application"

        try {

            console.log("Connecting to database with URL " + address)

            await mongoose.connect(address)

            //await mongoose.connect(App.mongoUrl)

            console.log("Database is " + JSON.stringify(mongoose.connection.db))

        } catch (exception) {

            console.log(JSON.stringify(exception))

        }

    }
    
    
}
