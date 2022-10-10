import { UIButton, UIButtonColorSpecifier } from "./UIButton"
import { UILink } from "./UILink"


export class UILinkButton extends UILink {
    
    button: UIButton
    
    constructor(elementID?: string, elementType?: string, titleType?: string) {
    
        super(elementID, { "elementType": elementType, "titleType": titleType })
    
        // Instance variables
        this.button = new UIButton(this.elementID + "Button", elementType, titleType)
        this.addSubview(this.button)
    
        this.style.position = "absolute"
        this.button.controlEventTargetAccumulator.EnterDown.PointerUpInside = () => window.location = this.target as any
        
    }
    
    
    get titleLabel() {
        return this.button.titleLabel
    }
    
    get imageView() {
        return this.button.imageView
    }
    
    
    set colors(colors: UIButtonColorSpecifier) {
        this.button.colors = colors
    }
    
    get colors(): UIButtonColorSpecifier {
        return this.button.colors
    }
    
    
    get viewHTMLElement() {
        return super.viewHTMLElement as HTMLLinkElement
    }
    
    
    set target(target: string) {
        this.viewHTMLElement.setAttribute("href", target)
    }
    
    get target() {
        return this.viewHTMLElement.getAttribute("href") ?? ""
    }
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
    
        const bounds = this.bounds
    
        this.button.frame = bounds
        this.button.layoutSubviews()
        
    }
    
    
}





























































































