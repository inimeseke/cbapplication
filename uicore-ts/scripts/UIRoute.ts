import { IS_NIL, IS_NOT, NO, ValueOf, YES } from "./UIObject"
import { UIViewController } from "./UIViewController"


export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type UIRouteParameters<T = any> = {
    
    [key: string]: string;
    
} | T;


export interface UIRouteComponent<T = any> {
    
    name: string;
    parameters: UIRouteParameters<T>;
    
}


export interface UIRouteChangeDescriptor {
    
    currentRoute: UIRoute;
    targetRoute: UIRoute;
    forcefully: boolean;
    replacesCurrentRouteInHistory: boolean;
    
}


export type UIRouteShouldApplyRouteChangeCallbackFunction = (
    routeChangeDescriptor: UIRouteChangeDescriptor
) => boolean | Promise<boolean>;


const historyPositionStateKey = "uiRouteHistoryPosition"


export class UIRoute extends Array<UIRouteComponent> {
    
    static shouldApplyRouteChange?: UIRouteShouldApplyRouteChangeCallbackFunction
    
    // Native Back/Forward navigation fires `hashchange` directly, bypassing
    // `apply()` and therefore `shouldApplyRouteChange` - the fields and
    // methods below (installed via `_installNativeHistoryNavigationGuard`)
    // close that gap by tagging every history entry with a running position,
    // so a native traversal can be told apart from this class's own hash
    // mutations and, when declined, undone with `history.go(...)`.
    static _presentedRoute: UIRoute = new UIRoute()
    static _presentedHistoryPosition = 0
    static _recordedHistoryLength = 0
    static _selfInitiatedRouteChange?: UIRouteChangeDescriptor
    static _nativeHistoryNavigationGeneration = 0
    
    constructor(hash?: string) {
        
        super()
        
        if (!hash || !hash.startsWith) {
            
            return
            
        }
        
        if (hash.startsWith("#")) {
            hash = hash.slice(1)
        }
        
        hash = decodeURIComponent(hash)
        
        const components = hash.split("]")
        components.forEach(component => {
            
            const componentName = component.split("[")[0]
            const parameters: Record<string, string> = {}
            
            if (!componentName) {
                return
            }
            
            const parametersString = component.split("[")[1] || ""
            const parameterPairStrings = parametersString.split(",") || []
            
            parameterPairStrings.forEach(pairString => {
                
                const keyAndValueArray = pairString.split(":")
                const key = decodeURIComponent(keyAndValueArray[0])
                const value = decodeURIComponent(keyAndValueArray[1])
                
                if (key) {
                    parameters[key] = value
                }
                
            })
            
            
            this.push({
                name: componentName,
                parameters: parameters
            })
            
        })
        
        
    }
    
    
    static get currentRoute() {

        return new UIRoute(window.location.hash)

    }


    /**
     * @param forcefully When `true`, applies the route even if its string
     * representation is identical to the current URL hash, causing the browser
     * to fire a `hashchange` event and re-run the full `handleRoute` flow.
     * Use this only when you explicitly need re-entrant navigation (e.g. the
     * "tap the already-active tab to reset to root" feature in TopBarView).
     * Defaults to `false`.
     */
    apply(forcefully = NO): boolean | Promise<boolean> {
        
        return this._applyRouteAfterRouteChangeApproval(forcefully, NO)
        
    }
    
    
    /**
     * Applies this route without consulting `UIRoute.shouldApplyRouteChange`.
     * Use this only for route changes that are internal bookkeeping or that already
     * passed a higher-level confirmation flow.
     */
    applyWithoutRouteChangeApproval(forcefully = NO): boolean {
        
        return this._applyRouteWithoutRouteChangeApproval(forcefully, NO)
        
    }
    
    
    /**
     * @param forcefully When `true`, replaces the current history entry with
     * this route even when the route is identical to the current URL hash.
     * Defaults to `false`.
     */
    applyByReplacingCurrentRouteInHistory(forcefully = NO): boolean | Promise<boolean> {
        
        return this._applyRouteAfterRouteChangeApproval(forcefully, YES)
        
    }
    
    
    /**
     * Replaces the current history entry without consulting
     * `UIRoute.shouldApplyRouteChange`.
     */
    applyByReplacingCurrentRouteInHistoryWithoutRouteChangeApproval(forcefully = NO): boolean {
        
        return this._applyRouteWithoutRouteChangeApproval(forcefully, YES)
        
    }
    
    
    _applyRouteAfterRouteChangeApproval(
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean | Promise<boolean> {
        
        if (!this._needsRouteChange(forcefully)) {
            return NO
        }
        
        const shouldApplyRouteChange = UIRoute.shouldApplyRouteChange
        if (!shouldApplyRouteChange) {
            return this._applyRouteWithoutRouteChangeApproval(forcefully, replacesCurrentRouteInHistory)
        }
        
        const shouldProceed = shouldApplyRouteChange(
            this._routeChangeDescriptor(forcefully, replacesCurrentRouteInHistory)
        )
        
        if (shouldProceed instanceof Promise) {
            return shouldProceed.then(isRouteChangeApproved => {
                return this._applyRouteIfAllowed(
                    isRouteChangeApproved,
                    forcefully,
                    replacesCurrentRouteInHistory
                )
            })
        }
        
        return this._applyRouteIfAllowed(shouldProceed, forcefully, replacesCurrentRouteInHistory)
        
    }
    
    
    _applyRouteIfAllowed(
        isRouteChangeApproved: boolean,
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean {
        
        if (!isRouteChangeApproved) {
            return NO
        }
        
        return this._applyRouteWithoutRouteChangeApproval(forcefully, replacesCurrentRouteInHistory)
        
    }
    
    
    _applyRouteWithoutRouteChangeApproval(
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean {
        
        if (!this._needsRouteChange(forcefully)) {
            return NO
        }

        // Tags the hashchange this is about to cause as this class's own
        // doing, so `_hashDidChange` can tell it apart from a native
        // Back/Forward traversal instead of falling back to guessing from
        // `window.history.length`.
        UIRoute._selfInitiatedRouteChange = this._routeChangeDescriptor(forcefully, replacesCurrentRouteInHistory)

        if (replacesCurrentRouteInHistory) {
            window.location.replace(this.linkRepresentation)
        }
        else {
            window.location.hash = this.stringRepresentation
        }

        return YES

    }
    
    
    _needsRouteChange(forcefully: boolean): boolean {
        
        if (!forcefully && new UIRoute(window.location.hash).stringRepresentation == this.stringRepresentation) {
            return NO
        }
        
        return YES
        
    }
    
    
    _routeChangeDescriptor(forcefully: boolean, replacesCurrentRouteInHistory: boolean): UIRouteChangeDescriptor {
        
        return {
            currentRoute: UIRoute.currentRoute,
            targetRoute: this.copy(),
            forcefully: forcefully,
            replacesCurrentRouteInHistory: replacesCurrentRouteInHistory
        }

    }


    /**
     * Installs handling so that native browser Back/Forward navigation
     * consults `shouldApplyRouteChange` the same way `apply()` does, instead
     * of silently bypassing it. Call exactly once, from `UICore`'s
     * constructor.
     *
     * @param reapplyCurrentRoute Re-runs route handling for `UIRoute.currentRoute`.
     * Called once a native navigation is allowed to proceed (or is self-initiated),
     * so its effect actually appears on screen.
     */
    static _installNativeHistoryNavigationGuard(reapplyCurrentRoute: () => void | Promise<void>) {

        UIRoute._recordPresentedRouteAtHistoryPosition(
            UIRoute.currentRoute,
            UIRoute._historyPositionFromCurrentEntry() ?? 0
        )

        window.addEventListener("hashchange", event =>
            UIRoute._hashDidChange(event, reapplyCurrentRoute)
        )

    }


    static _historyPositionFromCurrentEntry(): number | undefined {

        const historyPosition = (window.history.state as Record<string, unknown> | null)?.[historyPositionStateKey]
        if (typeof historyPosition !== "number") {
            return undefined
        }
        return historyPosition

    }


    static _recordPresentedRouteAtHistoryPosition(route: UIRoute, historyPosition: number) {

        const historyState = Object.assign({}, window.history.state)
        historyState[historyPositionStateKey] = historyPosition
        window.history.replaceState(historyState, "")

        UIRoute._presentedRoute = route.copy()
        UIRoute._presentedHistoryPosition = historyPosition
        UIRoute._recordedHistoryLength = window.history.length

    }


    /**
     * The single listener installed for every `hashchange` - self-initiated,
     * native Back/Forward, or an untagged bypass (see the class-level comment
     * above `_presentedRoute`) - and the point where those three cases are
     * told apart.
     *
     * @param event The native event. Only used to call
     * `stopImmediatePropagation()` when a native traversal needs to be held
     * back pending `shouldApplyRouteChange`, so `UICore`'s own route handling
     * doesn't run before that check settles.
     * @param reapplyCurrentRoute Forwarded to `_applyHistoryNavigationToRouteAtPositionIfAllowed`
     * - see its own doc comment.
     */
    static _hashDidChange(event: HashChangeEvent, reapplyCurrentRoute: () => void | Promise<void>) {

        const targetRoute = UIRoute.currentRoute
        const selfInitiatedRouteChange = UIRoute._selfInitiatedRouteChange
        UIRoute._selfInitiatedRouteChange = undefined

        if (
            selfInitiatedRouteChange &&
            selfInitiatedRouteChange.targetRoute.stringRepresentation === targetRoute.stringRepresentation
        ) {

            let targetHistoryPosition = UIRoute._presentedHistoryPosition
            if (!selfInitiatedRouteChange.replacesCurrentRouteInHistory) {
                targetHistoryPosition = targetHistoryPosition + 1
            }
            UIRoute._recordPresentedRouteAtHistoryPosition(targetRoute, targetHistoryPosition)
            return

        }

        const targetHistoryPosition = UIRoute._historyPositionFromCurrentEntry()
        if (targetHistoryPosition === undefined) {

            // A hash mutation that bypassed this class entirely (e.g. a
            // direct `window.location.hash = ...` assignment) produces an
            // untagged entry. A larger native history length means it was
            // pushed; an unchanged length means the current entry was
            // replaced. Preserve both established escape hatches while
            // bringing the entry into this sequence.
            let untaggedHistoryPosition = UIRoute._presentedHistoryPosition
            if (window.history.length > UIRoute._recordedHistoryLength) {
                untaggedHistoryPosition = untaggedHistoryPosition + 1
            }
            UIRoute._recordPresentedRouteAtHistoryPosition(targetRoute, untaggedHistoryPosition)
            return

        }
        if (targetHistoryPosition === UIRoute._presentedHistoryPosition) {
            UIRoute._recordPresentedRouteAtHistoryPosition(targetRoute, targetHistoryPosition)
            return
        }

        event.stopImmediatePropagation()
        const navigationGeneration = ++UIRoute._nativeHistoryNavigationGeneration
        UIRoute._applyHistoryNavigationToRouteAtPositionIfAllowed(
            targetRoute,
            targetHistoryPosition,
            navigationGeneration,
            reapplyCurrentRoute
        ).catch(error => {
            console.error("UIRoute: native history navigation check failed", error)
        })

    }


    /**
     * Consults `shouldApplyRouteChange` for a native Back/Forward traversal,
     * exactly like `apply()` does for a programmatic one, then either lets it
     * through or reverts it with `history.go(...)`.
     *
     * @param targetRoute The route the native traversal is asking to move to.
     * @param targetHistoryPosition That route's tagged position, used both to
     * revert (`history.go`) and to detect a newer navigation arriving mid-check.
     * @param navigationGeneration A token captured by the caller at dispatch
     * time. If it no longer matches `_nativeHistoryNavigationGeneration` by
     * the time `shouldApplyRouteChange` resolves, a newer navigation has
     * superseded this one and this check's result is discarded.
     * @param reapplyCurrentRoute Called once the navigation is approved, so
     * `UIRoute.currentRoute`'s new value actually takes effect on screen.
     */
    static async _applyHistoryNavigationToRouteAtPositionIfAllowed(
        targetRoute: UIRoute,
        targetHistoryPosition: number,
        navigationGeneration: number,
        reapplyCurrentRoute: () => void | Promise<void>
    ) {

        const shouldApplyRouteChange = UIRoute.shouldApplyRouteChange
        const isRouteChangeApproved = shouldApplyRouteChange
            ? await shouldApplyRouteChange({
                currentRoute: UIRoute._presentedRoute.copy(),
                targetRoute: targetRoute.copy(),
                forcefully: NO,
                replacesCurrentRouteInHistory: NO
            })
            : YES

        if (navigationGeneration !== UIRoute._nativeHistoryNavigationGeneration) {
            return
        }
        if (
            UIRoute.currentRoute.stringRepresentation !== targetRoute.stringRepresentation ||
            UIRoute._historyPositionFromCurrentEntry() !== targetHistoryPosition
        ) {
            return
        }

        if (isRouteChangeApproved) {
            UIRoute._recordPresentedRouteAtHistoryPosition(targetRoute, targetHistoryPosition)
            await reapplyCurrentRoute()
            return
        }

        const historyDelta = UIRoute._presentedHistoryPosition - targetHistoryPosition
        if (historyDelta !== 0) {
            window.history.go(historyDelta)
        }

    }


    override copy() {
        const result = new UIRoute(this.stringRepresentation)
        return result
    }
    
    
    routeByRemovingComponentsOtherThanOnesNamed(componentNames: string[]) {
        const result = this.copy()
        const indexesToRemove: number[] = []
        result.forEach(function (component, index, array) {
            if (!componentNames.contains(component.name)) {
                indexesToRemove.push(index)
            }
        })
        indexesToRemove.forEach(function (indexToRemove, index, array) {
            result.removeElementAtIndex(indexToRemove)
        })
        return result
    }
    
    
    routeByRemovingComponentNamed(componentName: string) {
        const result = this.copy()
        const componentIndex = result.findIndex(function (component, index) {
            return (component.name == componentName)
        })
        if (componentIndex != -1) {
            result.splice(componentIndex, 1)
        }
        return result
    }
    
    
    routeByRemovingParameterInComponent(componentName: string, parameterName: string, removeComponentIfEmpty = NO) {
        let result = this.copy()
        let parameters = result.componentWithName(componentName)?.parameters ?? {}
        delete parameters[parameterName]
        result = result.routeWithComponent(componentName, parameters)
        if (removeComponentIfEmpty && Object.keys(parameters).length == 0) {
            result = result.routeByRemovingComponentNamed(componentName)
        }
        return result
    }
    
    routeBySettingParameterInComponent(componentName: string, parameterName: string, valueToSet: string) {
        let result = this.copy()
        if (IS_NIL(valueToSet) || IS_NIL(parameterName)) {
            return result
        }
        let parameters = result.componentWithName(componentName)?.parameters
        if (IS_NOT(parameters)) {
            parameters = {}
        }
        parameters[parameterName] = valueToSet
        result = result.routeWithComponent(componentName, parameters)
        return result
    }
    
    
    routeWithViewControllerComponent<T extends typeof UIViewController>(
        viewController: T,
        parameters: UIRouteParameters<{ [P in keyof T["ParameterIdentifierName"]]: string }>,
        extendParameters: boolean = NO
    ) {
        
        return this.routeWithComponent(viewController.routeComponentName, parameters, extendParameters)
        
    }
    
    routeWithComponent(name: string, parameters: UIRouteParameters, extendParameters: boolean = NO) {
        
        const result = this.copy()
        let component = result.componentWithName(name)
        if (IS_NOT(component)) {
            component = {
                name: name,
                parameters: {}
            }
            result.push(component)
        }
        
        if (IS_NOT(parameters)) {
            
            parameters = {}
            
        }
        
        if (extendParameters) {
            component.parameters = Object.assign(component.parameters, parameters)
        }
        else {
            component.parameters = parameters
        }
        
        return result
        
    }
    
    navigateBySettingComponent(name: string, parameters: UIRouteParameters, extendParameters: boolean = NO) {
        
        return this.routeWithComponent(name, parameters, extendParameters).apply()
        
    }
    
    
    componentWithViewController<T extends typeof UIViewController>(viewController: T): UIRouteComponent<{ [P in ValueOf<T["ParameterIdentifierName"]>]: string }> | undefined {
        
        return this.componentWithName(viewController.routeComponentName)
        
    }
    
    componentWithName(name: string): UIRouteComponent | undefined {
        let result
        this.forEach(function (component, index, self) {
            if (component.name == name) {
                result = component
            }
        })
        return result
    }
    
    
    get linkRepresentation() {
        return "#" + this.stringRepresentation
    }
    
    
    get stringRepresentation() {
        
        let result = ""
        this.forEach(function (component, index, self) {
            result = result + component.name
            const parameters = component.parameters
            result = result + "["
            Object.keys(parameters).forEach(function (key, index, keys) {
                if (index) {
                    result = result + ","
                }
                result = result + encodeURIComponent(key) + ":" + encodeURIComponent(parameters[key])
            })
            result = result + "]"
        })
        
        return result
        
    }
    
    
}
