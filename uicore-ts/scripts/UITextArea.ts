import { NO } from "./UIObject"
import { UITextField } from "./UITextField"
import { UITextView } from "./UITextView"
import { UIViewAddControlEventTargetObject } from "./UIView"





export class UITextArea extends UITextField {
    
    
    
    
    
    constructor(elementID, viewHTMLElement = null) {
        
        super(elementID, viewHTMLElement, UITextView.type.textArea)
        
        this.viewHTMLElement.removeAttribute("type")
        
        this.style.overflow = "auto"
        this.style.webkitUserSelect = "text"
        
        this.pausesPointerEvents = NO
    
    }
    
    
    get addControlEventTarget(): UIViewAddControlEventTargetObject<typeof UITextArea.controlEvent> {
        
        return super.addControlEventTarget as any
        
    }
    
    
    get viewHTMLElement(): HTMLTextAreaElement & HTMLInputElement {
        
        // @ts-ignore
        return super.viewHTMLElement
        
    }
    
    
    
    
    
}







































