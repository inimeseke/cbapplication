import { UIButton, UIButtonColorSpecifier } from "./UIButton"
import { UILink } from "./UILink"
import { UIView, UIViewAddControlEventTargetObject } from "./UIView"


export class UILinkButton extends UILink {
    
    button: UIButton
    
    constructor(elementID?: string, elementType?: string, titleType?: string) {
        
        super(elementID)
        
        // Instance variables
        this.button = new UIButton(this.elementID + "Button", elementType, titleType)
        this.addSubview(this.button)
        
        this.style.position = "absolute"
        this.button.controlEventTargetAccumulator.PrimaryActionTriggered = (sender: UIView, event: Event) => {
            window.location = this.target as any
            this.sendControlEventForKey(UIButton.controlEvent.PrimaryActionTriggered, event)
        }
        
    }
    
    
    static override controlEvent = Object.assign({}, UILink.controlEvent, {
        "PrimaryActionTriggered": "PrimaryActionTriggered"
    } as const)
    
    override controlEvent = UILinkButton.controlEvent
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof UILinkButton> {
        return super.controlEventTargetAccumulator as any
    }
    
    
    get titleLabel() {
        return this.button.titleLabel
    }
    
    get imageView() {
        return this.button.imageView
    }
    
    
    override set colors(colors: UIButtonColorSpecifier) {
        this.button.colors = colors
    }
    
    override get colors(): UIButtonColorSpecifier {
        return this.button.colors
    }
    
    
    override get viewHTMLElement() {
        return super.viewHTMLElement as HTMLLinkElement
    }
    
    
    override set target(target: string) {
        this.viewHTMLElement.setAttribute("href", target)
    }
    
    override get target() {
        return this.viewHTMLElement.getAttribute("href") ?? ""
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const bounds = this.bounds
        
        this.button.frame = bounds
        this.button.layoutSubviews()
        
    }
    
    
}
