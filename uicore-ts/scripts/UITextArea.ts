import { NO } from "./UIObject"
import { UITextField } from "./UITextField"
import { UITextView } from "./UITextView"


export class UITextArea extends UITextField {
    
    
    constructor(elementID?: string, viewHTMLElement = null) {
        
        super(elementID, viewHTMLElement, UITextView.type.textArea)
        
        this.viewHTMLElement.removeAttribute("type");
        
        // Remove the centering flex layout and disable resize handles on the outer container.
        (this as UITextArea).configureWithObject({
            style: {
                alignItems: "stretch",
                resize: "none",
                overflow: "hidden",
                padding: "0"
            }
        })
        
        // Make the actual <textarea> fill its parent with padding restored at this level.
        this.textElementView.viewHTMLElement.style.cssText += [
            "resize: none",
            "overflow: auto",
            "padding: 0.375rem 0.75rem",
            "box-sizing: border-box",
            "-webkit-user-select: text"
        ].join("; ")
        
        this.pausesPointerEvents = NO
        
    }
    
    
    override layoutSubviews() {
        super.layoutSubviews()
        this.textElementView.frame = this.contentBounds
    }
    
    
    override get viewHTMLElement(): HTMLTextAreaElement & HTMLInputElement {
        
        // @ts-ignore
        return super.viewHTMLElement
        
    }
    
    
}
