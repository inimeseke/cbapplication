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


export class UIRoute extends Array<UIRouteComponent> {
    
    static shouldApplyRouteChange?: UIRouteShouldApplyRouteChangeCallbackFunction
    
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
        
        return this._applyRouteAfterRouteApplicationCheck(forcefully, NO)
        
    }
    
    
    /**
     * Applies this route without consulting `UIRoute.routeApplicationShouldProceed`.
     * Use this only for route changes that are internal bookkeeping or that already
     * passed a higher-level confirmation flow.
     */
    applyWithoutRouteApplicationCheck(forcefully = NO): boolean {
        
        return this._applyRouteWithoutRouteApplicationCheck(forcefully, NO)
        
    }
    
    
    /**
     * @param forcefully When `true`, replaces the current history entry with
     * this route even when the route is identical to the current URL hash.
     * Defaults to `false`.
     */
    applyByReplacingCurrentRouteInHistory(forcefully = NO): boolean | Promise<boolean> {
        
        return this._applyRouteAfterRouteApplicationCheck(forcefully, YES)
        
    }
    
    
    /**
     * Replaces the current history entry without consulting
     * `UIRoute.routeApplicationShouldProceed`.
     */
    applyByReplacingCurrentRouteInHistoryWithoutRouteApplicationCheck(forcefully = NO): boolean {
        
        return this._applyRouteWithoutRouteApplicationCheck(forcefully, YES)
        
    }
    
    
    _applyRouteAfterRouteApplicationCheck(
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean | Promise<boolean> {
        
        if (!this._needsRouteApplication(forcefully)) {
            return NO
        }
        
        const routeApplicationShouldProceed = UIRoute.shouldApplyRouteChange
        if (!routeApplicationShouldProceed) {
            return this._applyRouteWithoutRouteApplicationCheck(forcefully, replacesCurrentRouteInHistory)
        }
        
        const shouldProceed = routeApplicationShouldProceed(
            this._routeApplication(forcefully, replacesCurrentRouteInHistory)
        )
        
        if (shouldProceed instanceof Promise) {
            return shouldProceed.then(routeApplicationShouldProceed => {
                return this._applyRouteIfAllowed(
                    routeApplicationShouldProceed,
                    forcefully,
                    replacesCurrentRouteInHistory
                )
            })
        }
        
        return this._applyRouteIfAllowed(shouldProceed, forcefully, replacesCurrentRouteInHistory)
        
    }
    
    
    _applyRouteIfAllowed(
        routeApplicationShouldProceed: boolean,
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean {
        
        if (!routeApplicationShouldProceed) {
            return NO
        }
        
        return this._applyRouteWithoutRouteApplicationCheck(forcefully, replacesCurrentRouteInHistory)
        
    }
    
    
    _applyRouteWithoutRouteApplicationCheck(
        forcefully: boolean,
        replacesCurrentRouteInHistory: boolean
    ): boolean {
        
        if (!this._needsRouteApplication(forcefully)) {
            return NO
        }
        
        if (replacesCurrentRouteInHistory) {
            window.location.replace(this.linkRepresentation)
        }
        else {
            window.location.hash = this.stringRepresentation
        }
        
        return YES
        
    }
    
    
    _needsRouteApplication(forcefully: boolean): boolean {
        
        if (!forcefully && new UIRoute(window.location.hash).stringRepresentation == this.stringRepresentation) {
            return NO
        }
        
        return YES
        
    }
    
    
    _routeApplication(forcefully: boolean, replacesCurrentRouteInHistory: boolean): UIRouteChangeDescriptor {
        
        return {
            currentRoute: UIRoute.currentRoute,
            targetRoute: this.copy(),
            forcefully: forcefully,
            replacesCurrentRouteInHistory: replacesCurrentRouteInHistory
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
