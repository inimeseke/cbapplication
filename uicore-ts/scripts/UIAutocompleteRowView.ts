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
    _filterWords: string[] = []
    
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
        this._updateLabelContent()
    }
    
    get item(): UIAutocompleteItem<T> | undefined {
        return this._item
    }
    
    
    set filterWords(words: string[]) {
        this._filterWords = words
        this._updateLabelContent()
    }
    
    get filterWords(): string[] {
        return this._filterWords
    }
    
    
    _updateLabelContent() {
        
        if (!this._item) {
            return
        }
        
        const label = this._item.label
        
        if (this._filterWords.length === 0) {
            this.titleLabel.text = label
            return
        }
        
        // Build a regex that matches any of the filter words (case-insensitive).
        // Words are escaped so special regex characters in the label are treated literally.
        const escapedWords = this._filterWords.map(
            word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        )
        const pattern = new RegExp(`(${escapedWords.join("|")})`, "gi")
        
        // HTML-escape the label first, then re-insert <strong> tags around matches.
        const escaped = label
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
        
        const highlighted = escaped.replace(pattern, "<strong>$1</strong>")
        
        this.titleLabel.innerHTML = highlighted
        
    }
    
    
}

