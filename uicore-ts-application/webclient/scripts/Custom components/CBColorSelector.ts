import {
    IS,
    IS_NOT,
    nil,
    NO,
    UIButton,
    UIColor,
    UIRectangle, UITextView,
    UIView,
    UIViewAddControlEventTargetObject,
    YES
} from "uicore-ts"
import { CBButton } from "./CBButton"
import { CBColor } from "./CBColor"


export class CBColorSelector extends CBButton {
    
    private readonly _inputHTMLElement: HTMLInputElement
    
    constructor(elementID?: string, elementType?: string) {
        
        super(elementID, elementType)
        
        this._inputHTMLElement = document.createElement("input")
        this._inputHTMLElement.setAttribute("type", "color")
        this._inputHTMLElement.id = this.elementID + "InputElement"
        this._inputHTMLElement.style.visibility = "hidden"
        this.viewHTMLElement.appendChild(this._inputHTMLElement)
        
        this.imageView.hiddenWhenEmpty = NO
        this.imageView.hidden = NO
        
        //this.imageView.backgroundColor = this.backgroundColor
        
        this.controlEventTargetAccumulator.PointerUpInside.EnterDown = () => this.inputHTMLElement.click()
        
        this._inputHTMLElement.onchange = (event) => {
            
            this.imageView.backgroundColor = new UIColor(this.inputHTMLElement.value)
            
            this.sendControlEventForKey(CBColorSelector.controlEvent.ValueChange, event)
            
        }
        
        this._inputHTMLElement.oninput = (event) => {
            
            this.imageView.backgroundColor = new UIColor(this.inputHTMLElement.value)
            
            this.sendControlEventForKey(CBColorSelector.controlEvent.ValueInput, event)
            
        }
        
    }
    
    
    static override controlEvent = Object.assign({}, CBButton.controlEvent, {
        
        "ValueChange": "ValueChange",
        "ValueInput": "ValueInput"
        
    })
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof CBColorSelector> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    
    get inputHTMLElement(): HTMLInputElement {
        return this._inputHTMLElement
    }
    
    
    override layoutSubviews() {
        
        let bounds = this.bounds
        
        this.hoverText = this.titleLabel.text
        
        
        // Image and text both present
        if (IS_NOT(this.imageView.hidden) && IS(this.titleLabel.text)) {
            
            //const imageShareOfWidth = 0.25
            
            bounds = bounds.rectangleWithInset(this.contentPadding)
            
            const imageFrame = bounds.copy()
            imageFrame.width = (bounds.height - this.contentPadding * 0.5) * 2
            this.imageView.frame = imageFrame
            
            this.titleLabel.style.left = imageFrame.max.x + this.contentPadding + "px"
            this.titleLabel.style.right = this.contentPadding + "px"
            this.titleLabel.style.top = "50%"
            this.titleLabel.style.transform = "translateY(-50%)"
            
            if (this.usesAutomaticTitleFontSize) {
                
                const hidden = this.titleLabel.hidden
                
                this.titleLabel.hidden = YES
                
                this.titleLabel.fontSize = 15
                
                this.titleLabel.fontSize = UITextView.automaticallyCalculatedFontSize(
                    new UIRectangle(
                        0,
                        0,
                        this.bounds.height,
                        this.titleLabel.viewHTMLElement.offsetWidth
                    ),
                    this.titleLabel.intrinsicContentSize(),
                    this.titleLabel.fontSize,
                    this.minAutomaticFontSize,
                    this.maxAutomaticFontSize
                )
                
                this.titleLabel.hidden = hidden
                
            }
            
        }
        
        this.applyClassesAndStyles()
        
    }
    
    
}



























