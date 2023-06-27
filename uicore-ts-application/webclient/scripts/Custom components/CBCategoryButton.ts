import { IS, nil, NO, UIButton, UIColor, UITextView, YES } from "uicore-ts"
import { CBColor } from "./CBColor"


export class CBCategoryButton extends UIButton {
    
    
    constructor(elementID: string) {
        
        super(elementID, nil, UITextView.type.header3)
        
    }
    
    
    override updateContentForNormalState() {
        
        this.backgroundColor = UIColor.transparentColor
        this.titleLabel.textColor = CBColor.primaryContentColor
        
        this.imageView.style.filter = ""
        this.imageView.alpha = 0.87
        
    }
    
    override updateContentForHoveredState() {
    
        this.titleLabel.textColor = CBColor.primaryContentColor
        
    }
    
    override updateContentForHighlightedState() {
    
        this.style.color = "#7dadef"
        this.titleLabel.textColor = CBColor.primaryTintColor
        
        this.backgroundColor = CBColor.primaryTintColor
        this.titleLabel.textColor = CBColor.whiteColor
        
        this.imageView.style.filter = "invert(1)"
        this.imageView.alpha = 1
        
    }
    
    
    override layoutSubviews() {
        
        //super.layoutSubviews();
    
        const padding = this.core.paddingLength
        const labelHeight = padding * 1.5
    
        const bounds = this.bounds.rectangleWithInset(padding)
    
        this.titleLabel.text = this.titleLabel.text.toUpperCase()
        
        if (this.imageView.imageSource) {
            
            this.titleLabel.setPosition(padding, padding, padding, nil, labelHeight)
            
            this.titleLabel.style.maxHeight = ""
            this.titleLabel.style.transform = ""
            this.titleLabel.style.top = ""
            
            this.imageView.frame = this.bounds.rectangleWithInset(padding * 0.5).rectangleWithInsets(0, 0, labelHeight +
                padding, 0)
            
            this.imageView.hidden = NO
            
        }
        else {
            
            this.imageView.hidden = YES
            
        }
        
        this.imageView.hidden = IS(this.bounds.height < 50)
        
        if (this.imageView.hidden) {
            
            this.titleLabel.centerInContainer()
            this.titleLabel.style.maxHeight = "" + this.bounds.height.integerValue + "px"
            this.titleLabel.style.maxWidth = "" + bounds.width.integerValue + "px"
            
        }
        
    }
    
    
}





























