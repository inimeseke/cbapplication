import { IS_NOT, UIButton, UIColor } from "uicore-ts"
import { CBColor } from "./CBColor"


export class CBButton extends UIButton {
    
    
    constructor(elementID?: string, elementType?: string) {
        
        super(elementID, elementType)
        
        this.style.outline = "none"
        
        this.colors.titleLabel.normal = CBColor.whiteColor
        this.setBackgroundColorsWithNormalColor(CBColor.primaryTintColor)
        
        this.colors.titleLabel.selected = CBColor.primaryTintColor
        
    }
    
    
    setBackgroundColorsWithNormalColor(normalBackgroundColor: UIColor) {
    
        this.colors.background.normal = normalBackgroundColor
        this.colors.background.hovered = UIColor.colorWithRGBA(40, 168, 183)
        this.colors.background.focused = normalBackgroundColor
        this.colors.background.highlighted = UIColor.colorWithRGBA(48, 196, 212)
        this.colors.background.selected = UIColor.whiteColor
    
        this.updateContentForCurrentState()
    
    }
    
    
    updateContentForNormalState() {
        
        super.updateContentForNormalState()
        
        this.setBorder(0, 0)
        
    }
    
    
    updateContentForHoveredState() {
        
        super.updateContentForHoveredState()
        
        this.setBorder(0, 0)
        
    }
    
    updateContentForFocusedState() {
        
        super.updateContentForFocusedState()
        
        this.setBorder(0, 1, CBColor.primaryContentColor)
        
    }
    
    
    updateContentForHighlightedState() {
        
        super.updateContentForHighlightedState()
        
        this.setBorder(0, 0)
        
    }
    
    
    updateContentForCurrentEnabledState() {
        
        super.updateContentForCurrentEnabledState()
        
        if (IS_NOT(this.enabled)) {
            
            this.titleLabel.textColor = new UIColor("#adadad")
            
            this.backgroundColor = new UIColor("#e5e5e5")
            
            this.alpha = 1
            
        }
        
    }
    
    
}



























