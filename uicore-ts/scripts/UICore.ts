import "./UICoreExtensions"
import { UILanguageService } from "./UIInterfaces"
import { nil, NO, UIObject } from "./UIObject"
import { UIRoute } from "./UIRoute"
import { UIView } from "./UIView"
import { UIViewController } from "./UIViewController"


export class UICore extends UIObject {

    rootViewController: UIViewController



    static RootViewControllerClass: typeof UIViewController
    static main: UICore

    static languageService: UILanguageService = nil

    static readonly broadcastEventName = {

        "RouteDidChange": "RouteDidChange",
        "WindowDidResize": "WindowDidResize"

    }

    // See `reapplyCurrentRoute` for why these exist and why route application
    // must always go through it rather than calling `rootViewController.handleRoute`
    // or `handleRouteRecursively` directly.
    _isApplyingRoute = false
    _hasQueuedRouteChangeWhileApplying = false
    _currentRouteApplicationPromise?: Promise<void>

    constructor(rootDivElementID: string, rootViewControllerClass: typeof UIViewController, public paddingLength = 20) {
        
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
        
        this.rootViewController.viewWillAppear().then(() =>
            this.rootViewController.viewDidAppear()
        )
        
        
        this.rootViewController.view.addTargetForControlEvent(
            UIView.controlEvent.PointerUpInside,
            (sender, event) => {

                // Only dismiss focus for taps genuinely outside the focused element - not for
                // the tap that just focused it (or a tap on one of its own children). Native
                // controls like <select> gain focus on mousedown and open their own popup; if
                // this handler blurs them on the very next PointerUpInside regardless of target,
                // it closes that popup before the user can pick an option (macOS Chrome renders
                // <select> popups as a native control that closes as soon as its anchor blurs).
                const activeElement = document.activeElement as HTMLElement | null
                const eventTarget = event?.target as Node | null

                if (activeElement && eventTarget &&
                    (activeElement === eventTarget || activeElement.contains(eventTarget))) {
                    return
                }

                activeElement?.blur?.()

            }
        )
        
        
        const windowDidResize = () => {
            
            UIView.resetLayoutCycleTrackingForAllViews()
            
            this.rootViewController.view.forEachViewInSubtree((view) => {
                
                view._frameCache = undefined
                
            })
            // Doing layout two times to prevent page scrollbars from confusing the layout
            this.rootViewController.view.setNeedsLayout()
            this.rootViewController._triggerLayoutViewSubviews()
            UIView.layoutViewsIfNeeded()
            
            this.rootViewController._triggerLayoutViewSubviews()
            UIView.layoutViewsIfNeeded()
            
            this.rootViewController.view.broadcastEventInSubtree({
                
                name: UICore.broadcastEventName.WindowDidResize,
                parameters: nil
                
            })
            
        }
        
        window.addEventListener("resize", windowDidResize)
        
        const didScroll = () => {
            
            //code
            
            this.rootViewController.view.broadcastEventInSubtree({
                
                name: UIView.broadcastEventName.PageDidScroll,
                parameters: nil
                
            })
            
            
        }
        
        window.addEventListener("scroll", didScroll, false)

        const hashDidChange = () => {

            //code

            this.reapplyCurrentRoute()

        }

        window.addEventListener("hashchange", hashDidChange, false)

        hashDidChange()


    }


    /**
     * Re-runs route handling for `UIRoute.currentRoute` against `rootViewController`,
     * serialized against every other caller of this method (including the
     * `hashchange` listener installed in the constructor).
     *
     * This is the ONLY correct way to force route handling to (re-)run - never
     * call `rootViewController.handleRoute(...)` or `handleRouteRecursively(...)`
     * directly. A route change can legitimately be requested twice in quick
     * succession from independent, uncoordinated places (e.g. two related
     * server-pushed broadcasts derived from one real-world event, each
     * triggering its own re-apply). Without serialization, two concurrent,
     * un-synchronized route applications race on shared root-view-controller
     * state (`contentViewController`, `detailsViewController`) and whichever
     * finishes last wins - regardless of which request was actually last, or
     * which request even reflects the current, settled state. Serializing here
     * instead coalesces a request that arrives mid-application into a single
     * trailing re-run rather than starting a second, overlapping one, and that
     * re-run re-reads `UIRoute.currentRoute` fresh once the burst has settled,
     * so the final state always matches the truly-last route.
     */
    async reapplyCurrentRoute(): Promise<void> {

        if (this._isApplyingRoute) {

            // Joining an in-flight application: request one more loop pass
            // (guaranteed to observe `UIRoute.currentRoute` fresh, since the
            // owner below re-reads it at the top of every pass) and await the
            // SAME promise the owner is already awaiting, rather than
            // returning early - a caller of this method expects route
            // handling to have actually run by the time it resolves.
            this._hasQueuedRouteChangeWhileApplying = true
            return this._currentRouteApplicationPromise

        }

        this._isApplyingRoute = true

        this._currentRouteApplicationPromise = (async () => {

            try {

                do {

                    this._hasQueuedRouteChangeWhileApplying = false

                    await this.rootViewController.handleRouteRecursively(UIRoute.currentRoute)

                    this.rootViewController.view.broadcastEventInSubtree({

                        name: UICore.broadcastEventName.RouteDidChange,
                        parameters: nil

                    })

                } while (this._hasQueuedRouteChangeWhileApplying)

            }
            finally {

                this._isApplyingRoute = false
                this._currentRouteApplicationPromise = undefined

            }

        })()

        return this._currentRouteApplicationPromise

    }


}


Array.prototype.indexOf || (Array.prototype.indexOf = function (d, e) {
    let a
    if (null == this) {
        throw new TypeError("\"this\" is null or not defined")
    }
    const c = Object(this),
        b = c.length >>> 0
    if (0 === b) {
        return -1
    }
    // @ts-ignore
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










