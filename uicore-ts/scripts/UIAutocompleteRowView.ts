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
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this.titleLabel.textAlignment = UITextView.textAlignment.left
        this.userInteractionEnabled = YES
        this.style.outline = "none"
        this.viewHTMLElement.setAttribute("tabindex", "-1")
        
        this.colors = {
            titleLabel: {
                normal: UIColor.blackColor,
                highlighted: UIColor.blackColor,
                selected: UIColor.whiteColor
            },
            background: {
                normal: UIColor.whiteColor,
                hovered: UIColor.lightGreyColor,
                highlighted: UIColor.lightGreyColor,
                selected: UIColor.greyColor
            }
        }
        
    }
    
    
    set item(item: UIAutocompleteItem<T>) {
        this._item = item
        this.titleLabel.text = item.label
    }
    
    get item(): UIAutocompleteItem<T> | undefined {
        return this._item
    }
    
    
}

