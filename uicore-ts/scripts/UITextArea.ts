import { NO } from "./UIObject"
import { UITextField } from "./UITextField"
import { UITextView } from "./UITextView"


export class UITextArea extends UITextField {
    
    
    constructor(elementID?: string, viewHTMLElement = null) {
    
        super(elementID, viewHTMLElement, UITextView.type.textArea)
    
        this.viewHTMLElement.removeAttribute("type")
    
        this.style.overflow = "auto"
        this.style.webkitUserSelect = "text"
    
        this.pausesPointerEvents = NO
    
    }
    
    
    override get viewHTMLElement(): HTMLTextAreaElement & HTMLInputElement {
    
        // @ts-ignore
        return super.viewHTMLElement
    
    }
    
    
}







































