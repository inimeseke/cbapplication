import { UIButton } from "./UIButton"
import { UIColor } from "./UIColor"
import { NO, YES } from "./UIObject"
import { UITextView } from "./UITextView"


export interface UIAutocompleteItem<T> {
    label: string
    value: T
}


export class UIAutocompleteRowView<T> extends UIButton {
    
    _item?: UIAutocompleteItem<T>
    isKeyboardHighlighted: boolean = NO
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this.titleLabel.textAlignment = UITextView.textAlignment.left
        this.userInteractionEnabled = YES
        this.style.outline = "none"
        this.viewHTMLElement.setAttribute("tabindex", "-1")
        
    }
    
    
    set item(item: UIAutocompleteItem<T>) {
        this._item = item
        this.titleLabel.text = item.label
    }
    
    get item(): UIAutocompleteItem<T> | undefined {
        return this._item
    }
    
    
    override updateContentForNormalState() {
        
        super.updateContentForNormalState()
        
        this.backgroundColor = this.isKeyboardHighlighted
                               ? UIColor.lightGreyColor
                               : UIColor.whiteColor
        this.titleLabel.textColor = UIColor.blackColor
        
    }
    
    override updateContentForHoveredState() {
        
        super.updateContentForHoveredState()
        
        this.backgroundColor = this.isKeyboardHighlighted
                               ? UIColor.lightGreyColor
                               : UIColor.whiteColor
        
    }
    
    override updateContentForHighlightedState() {
        
        super.updateContentForHighlightedState()
        
        this.backgroundColor = UIColor.lightGreyColor
        
    }
    
    
}
