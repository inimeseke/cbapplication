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


/**
 * CBCore — Application session model and library entry point.
 *
 * CBCore is a general-purpose library class. It must not contain any
 * project-specific business logic. To extend it for a specific project,
 * subclass CBCore and register the subclass as the singleton before any
 * other code accesses `CBCore.sharedInstance`.
 *
 * ## Extension pattern
 *
 * 1. Subclass CBCore in your project:
 *
 *    ```typescript
 *    class MyAppCore extends CBCore {
 *
 *        // Additional session-level state goes here.
 *        mySessionData: MySessionData | undefined = undefined
 *
 *        // Override didSetUserProfile to fetch session data before the
 *        // userDidLogIn broadcast fires. Call super only after your data
 *        // is ready so that every listener receives a fully populated core.
 *        override async didSetUserProfile() {
 *            if (IS(this.userProfile)) {
 *                this.mySessionData = await fetchMySessionData()
 *            }
 *            else {
 *                this.mySessionData = undefined
 *            }
 *            super.didSetUserProfile()
 *        }
 *
 *        // Expose a typed singleton so callers never need CBCore.sharedInstance.
 *        static override get sharedInstance(): MyAppCore {
 *            return CBCore.sharedInstance as MyAppCore
 *        }
 *
 *    }
 *    ```
 *
 * 2. Register the subclass at app startup, before UICore is initialised:
 *
 *    ```typescript
 *    CBCore.setSharedInstance(new MyAppCore())
 *    CBCore.initIfNeededWithViewCore(new UICore(...))
 *    ```
 *
 * 3. From that point on, every call to `CBCore.sharedInstance` — including
 *    calls made internally by the library — returns the MyAppCore instance.
 *    Project code should call `MyAppCore.sharedInstance` for the typed version.
 */
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
            
            if (event.key == "CBLanguageKey") {
                this.didSetLanguageKey()
            }
            
        }.bind(this))
        
        
        this.didSetLanguageKey()
        
        
    }
    
    
    static initIfNeededWithViewCore(
        viewCore: UICore
    ) {
        CBCore.sharedInstance.viewCores.push(viewCore)
    }
    
    
    /**
     * Returns the shared singleton instance.
     *
     * If `setSharedInstance` was called before this getter was first accessed,
     * that instance is returned. Otherwise a default `CBCore` is created.
     * Library-internal code always goes through this getter, so registering a
     * subclass via `setSharedInstance` is sufficient to replace the singleton
     * for the entire session.
     */
    static get sharedInstance() {
        if (!CBCore._sharedInstance) {
            CBCore._sharedInstance = new CBCore()
        }
        return CBCore._sharedInstance
    }
    
    
    /**
     * Registers a subclass instance as the application singleton.
     *
     * Call this once at app startup, before `CBCore.sharedInstance` or
     * `CBCore.initIfNeededWithViewCore` are first accessed. Calling it after
     * the singleton has already been created has no effect and will throw in
     * development to catch accidental misuse.
     *
     * ```typescript
     * // App entry point — must be the very first thing that runs.
     * CBCore.setSharedInstance(new MyAppCore())
     * CBCore.initIfNeededWithViewCore(new UICore("root", RootViewController))
     * ```
     */
    static setSharedInstance(instance: CBCore) {
        
        if (CBCore._sharedInstance) {
            /// #if DEV
            throw new Error(
                "CBCore.setSharedInstance must be called before sharedInstance is first accessed. " +
                "Move the call to the very top of your app entry point."
            )
            /// #endif
            return
        }
        
        CBCore._sharedInstance = instance
        
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
    
    /**
     * Called whenever `userProfile` is assigned.
     *
     * The default implementation derives `isUserLoggedIn` from the profile
     * and triggers the login/logout broadcast via `didSetIsUserLoggedIn`.
     *
     * Subclasses may override this to fetch additional session data before
     * the broadcast fires. The override must be `async` and must call
     * `super.didSetUserProfile()` after it has finished populating any
     * extra state, so that all broadcast listeners receive a complete core:
     *
     * ```typescript
     * override async didSetUserProfile() {
     *     if (IS(this.userProfile)) {
     *         this.companyStatus = (await SocketClient.CurrentUserStatusInCompany()).result
     *     }
     *     else {
     *         this.companyStatus = undefined
     *     }
     *     super.didSetUserProfile()   // broadcast fires here
     * }
     * ```
     */
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

