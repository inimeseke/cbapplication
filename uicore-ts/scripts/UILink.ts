import { UIBaseButton } from "./UIBaseButton"
import { UIButtonColorSpecifier } from "./UIButton"
import { UICore } from "./UICore"
import { NO } from "./UIObject"
import { UIRoute } from "./UIRoute"
import { UIViewBroadcastEvent } from "./UIView"


export class UILink extends UIBaseButton {
    
    private _colors?: UIButtonColorSpecifier | undefined
    
    constructor(elementID?: string) {
    
        super(elementID, "a")
    
        this.stopsPointerEventPropagation = NO
        this.pausesPointerEvents = NO
    
        this.viewHTMLElement.onclick = this.blur.bind(this)
    
    }
    
    
    get colors(): UIButtonColorSpecifier | undefined {
        return this._colors
    }
    
    set colors(value: UIButtonColorSpecifier | undefined) {
        this._colors = value
    }
    
    
    override get viewHTMLElement() {
    
        // @ts-ignore
        return super.viewHTMLElement as HTMLLinkElement
    
    }
    
    set text(text: string) {
        this.viewHTMLElement.textContent = text
    }
    
    get text() {
        return this.viewHTMLElement.textContent ?? ""
    }
    
    
    set target(target: string) {
        this.viewHTMLElement.setAttribute("href", target)
    }
    
    get target() {
        return this.viewHTMLElement.getAttribute("href") ?? ""
    }
    
    
    set targetRouteForCurrentState(targetRouteForCurrentState: () => (UIRoute | string)) {
        this._targetRouteForCurrentState = targetRouteForCurrentState
        this.updateTarget()
    }
    
    get targetRouteForCurrentState() {
        return this._targetRouteForCurrentState
    }
    
    
    _targetRouteForCurrentState() {
        return UIRoute.currentRoute.routeByRemovingComponentsOtherThanOnesNamed(["settings"]) as (UIRoute | string)
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UICore.broadcastEventName.RouteDidChange) {
            
            this.updateTarget()
            
        }
        
    }
    
    
    override wasAddedToViewTree() {
        
        super.wasAddedToViewTree()
        
        this.updateTarget()
        
        
    }
    
    
    updateTarget() {
        
        const route = this.targetRouteForCurrentState()
        
        if (route instanceof UIRoute) {
            
            this.target = route.linkRepresentation
            
            return
            
        }
        
        this.target = route
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const bounds = this.bounds
        
    }
    
    
}





























































































