/// <reference path="../webclient/scripts/SocketClientFunctions.d.ts" />

import { Application } from "express"
import * as mongoose from "mongoose"
import { Server } from "socket.io"


export class RoutesController {
    
    public model: mongoose.Model<mongoose.Document>
    
    constructor(private _expressApp: Application, private _socketIO: Server) {
    }
    
    get expressApp() {
        return this._expressApp
    }
    
    get socketIO() {
        return this._socketIO
    }
    
}
