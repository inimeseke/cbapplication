import { ManagerOptions, SocketOptions } from "socket.io-client"
import { NO } from "uicore-ts"
import { FIRST, IS, IS_NOT, nil, UICore, UILink, UIObject, UIRoute, UIViewBroadcastEvent, YES } from "../../uicore-ts"
import { CBLocalizedTextObject, CBUserProfile } from "./CBDataInterfaces"
import { CBLanguageService } from "./CBLanguageService"
import { CBServerClient } from "./CBServerClient"
import { CBSocketClient } from "./CBSocketClient"


declare interface CBDialogViewShower {
    
    alert(text: string, dismissCallback?: Function): void
    
    localizedAlert(textObject: CBLocalizedTextObject, dismissCallback?: Function): void
    
    showActionIndicatorDialog(message: string, dismissCallback?: Function): void
    
    hideActionIndicatorDialog(): void
    
}


declare const CBCoreInitializerObject: any


export class CBCore extends UIObject {
    
    private static _sharedInstance: CBCore
    
    viewCores: UICore[] = []
    
    _isUserLoggedIn = NO
    _cachedMinimizedChatInquiryIDs: string[] = nil
    _socketClient: CBSocketClient = new CBSocketClient(this)
    _serverClient: CBServerClient = new CBServerClient(this)
    
    _functionsToCallForEachSocketClient: (() => void)[] = []
    
    _models: any[] = []
    
    dialogViewShowerClass: CBDialogViewShower = nil
    
    constructor() {
        
        super()
        
        if (CBCoreInitializerObject) {
            
            CBLanguageService.useStoredLanguageValues(CBCoreInitializerObject.languageValues)
            
        }
        
        
        window.addEventListener("storage", function (this: CBCore, event: StorageEvent) {
            
            if (event.newValue == event.oldValue) {
                return
            }
            
            //console.log("" + event.key + " changed to " + event.newValue + " from " + event.oldValue);
            
            
            if (event.key == "CBLanguageKey") {
                this.didSetLanguageKey()
            }
            
        }.bind(this))
        
        
        //this.checkIfUserIsAuthenticated();
        
        this.didSetLanguageKey()
        
        
    }
    
    
    static initIfNeededWithViewCore(
        viewCore: UICore
    ) {
        CBCore.sharedInstance.viewCores.push(viewCore)
    }
    
    
    static get sharedInstance() {
        if (!CBCore._sharedInstance) {
            CBCore._sharedInstance = new CBCore()
        }
        return CBCore._sharedInstance
    }
    
    
    static broadcastEventName = {
        
        "userDidLogIn": "UserDidLogIn",
        "userDidLogOut": "UserDidLogOut"
        
    } as const
    
    broadcastMessageInRootViewTree(message: UIViewBroadcastEvent) {
        
        this.viewCores.everyElement.rootViewController.view.broadcastEventInSubtree(message)
        
    }
    
    
    get socketClient() {
        return this._socketClient
    }
    
    get serverClient() {
        return this._serverClient
    }
    
    
    set isUserLoggedIn(isUserLoggedIn: boolean) {
        const previousValue = this.isUserLoggedIn
        this._isUserLoggedIn = isUserLoggedIn
        this.didSetIsUserLoggedIn(previousValue)
    }
    
    didSetIsUserLoggedIn(previousValue: boolean) {
        
        const isUserLoggedIn = this.isUserLoggedIn
        
        if (isUserLoggedIn && previousValue != isUserLoggedIn) {
            
            // Send message to views
            this.broadcastMessageInRootViewTree({
                name: CBCore.broadcastEventName.userDidLogIn,
                parameters: nil
            })
            
            this.updateLinkTargets()
            
        }
        else if (previousValue != isUserLoggedIn) {
            
            this.performFunctionWithDelay(0.01, function (this: CBCore) {
                
                UIRoute.currentRoute.routeByRemovingComponentsOtherThanOnesNamed([
                    "settings"
                ]).apply()
                
                this.broadcastMessageInRootViewTree({
                    name: CBCore.broadcastEventName.userDidLogOut,
                    parameters: nil
                })
                
                this.updateLinkTargets()
                
            }.bind(this))
            
        }
        
    }
    
    updateLinkTargets() {
        this.viewCores.everyElement.rootViewController.view.forEachViewInSubtree(function (view) {
            if (view instanceof UILink) {
                view.updateTarget()
            }
        })
    }
    
    get isUserLoggedIn() {
        return this._isUserLoggedIn
    }
    
    
    private _userProfile: CBUserProfile
    
    get userProfile() {
        return this._userProfile
    }
    
    set userProfile(userProfile: CBUserProfile) {
        this._userProfile = userProfile
        this.didSetUserProfile()
    }
    
    didSetUserProfile() {
        this.isUserLoggedIn = IS(this.userProfile)
    }
    
    
    set languageKey(languageKey: string) {
        if (IS_NOT(languageKey)) {
            localStorage.removeItem("CBLanguageKey")
        }
        localStorage.setItem("CBLanguageKey", JSON.stringify(languageKey))
        this.didSetLanguageKey()
    }
    
    get languageKey() {
        return FIRST(localStorage.getItem("CBLanguageKey"), CBLanguageService.defaultLanguageKey).replace(
            "\"",
            ""
        ).replace("\"", "")
    }
    
    didSetLanguageKey() {
        UIRoute.currentRoute.routeWithComponent(
            "settings",
            { "language": this.languageKey },
            YES
        ).applyByReplacingCurrentRouteInHistory()
    }
    
    
    reloadSocketConnection() {
        
        // @ts-ignore
        this.socketClient.socket.disconnect()
        
        const messagesToBeSent = this.socketClient._messagesToBeSent.filter(function (messageItem, index, array) {
            
            return (!messageItem.isBoundToUserWithID || messageItem.isBoundToUserWithID ==
                CBCore.sharedInstance.userProfile?._id)
            
        })
        
        this._socketClient = new CBSocketClient(this)
        this._socketClient._messagesToBeSent = messagesToBeSent
        
        const socketClient = this._socketClient
        
        this._models.forEach(function (model, index, array) {
            
            model.setSocketClient(socketClient)
            
        })
        
        this._functionsToCallForEachSocketClient.forEach(function (functionToCall, index, array) {
            
            functionToCall()
            
        })
        
        
    }
    
    
    callFunctionForEachSocketClient(functionToCall: () => void) {
        this._functionsToCallForEachSocketClient.push(functionToCall)
        functionToCall()
    }
    
    
}




















