import "./UICoreExtensions"
import { UILanguageService } from "./UIInterfaces"
import { nil, NO, UIObject } from "./UIObject"
import { UIRoute } from "./UIRoute"
import { UIView } from "./UIView"
import { UIViewController } from "./UIViewController"



export class UICore extends UIObject {
    
    rootViewController: UIViewController = nil
    
    paddingLength = 20
    
    static RootViewControllerClass: typeof UIViewController = nil
    static main: UICore
    
    static languageService: UILanguageService = nil
    
    static readonly broadcastEventName = {
        
        "RouteDidChange": "RouteDidChange",
        "WindowDidResize": "WindowDidResize"
        
    }
    
    constructor(rootDivElementID: string, rootViewControllerClass: typeof UIViewController) {
        
        super()
    
        UICore.RootViewControllerClass = rootViewControllerClass
        UICore.main = UICore.main || this
        
        const rootViewElement = document.getElementById(rootDivElementID)
        const rootView = new UIView(rootDivElementID, rootViewElement)
        rootView.pausesPointerEvents = NO //YES;
        rootView.core = this
        
        if (UICore.RootViewControllerClass) {
            
            if (!(UICore.RootViewControllerClass.prototype instanceof UIViewController) ||
                (UICore.RootViewControllerClass as any) === UIViewController) {
                
                console.log(
                    "Error, UICore.RootViewControllerClass must be UIViewController or a subclass of UIViewController, " +
                    "falling back to UIViewController."
                )
                
                UICore.RootViewControllerClass = UIViewController
                
            }
            
            this.rootViewController = new UICore.RootViewControllerClass(rootView)
            
        }
        else {
            
            this.rootViewController = new UIViewController(rootView)
            
        }
        
        this.rootViewController.viewWillAppear()
        this.rootViewController.viewDidAppear()
        
        
        this.rootViewController.view.addTargetForControlEvent(
            UIView.controlEvent.PointerUpInside,
            function (sender, event) {
                
                (document.activeElement as HTMLElement).blur()
                
            }
        )
        
        
        
        const windowDidResize = function (this: UICore) {
            
            // Doing layout two times to prevent page scrollbars from confusing the layout
            this.rootViewController._triggerLayoutViewSubviews()
            UIView.layoutViewsIfNeeded()
            
            this.rootViewController._triggerLayoutViewSubviews()
            //UIView.layoutViewsIfNeeded()
            
            this.rootViewController.view.broadcastEventInSubtree({
                
                name: UICore.broadcastEventName.WindowDidResize,
                parameters: nil
                
            })
            
        }
        
        window.addEventListener("resize", windowDidResize.bind(this))
        
        const didScroll = function (this: UICore) {
            
            //code
            
            this.rootViewController.view.broadcastEventInSubtree({
                
                name: UIView.broadcastEventName.PageDidScroll,
                parameters: nil
                
            })
            
            
            
        }.bind(this)
        
        window.addEventListener("scroll", didScroll, false)
        
        const hashDidChange = function (this: UICore) {
            
            //code
            
            this.rootViewController.handleRouteRecursively(UIRoute.currentRoute)
            
            this.rootViewController.view.broadcastEventInSubtree({
                
                name: UICore.broadcastEventName.RouteDidChange,
                parameters: nil
                
            })
            
            
        }.bind(this)
    
        window.addEventListener("hashchange", hashDidChange.bind(this), false)
    
        hashDidChange()
    
    
    
    }
    
    
}





Array.prototype.indexOf || (Array.prototype.indexOf = function (d, e) {
    var a
    if (null == this) {
        throw new TypeError("\"this\" is null or not defined")
    }
    const c = Object(this),
        b = c.length >>> 0
    if (0 === b) {
        return -1
    }
    a = +e || 0
    Infinity === Math.abs(a) && (a = 0)
    if (a >= b) {
        return -1
    }
    for (a = Math.max(0 <= a ? a : b - Math.abs(a), 0); a < b;) {
        if (a in c && c[a] === d) {
            return a
        }
        a++
    }
    return -1
})










