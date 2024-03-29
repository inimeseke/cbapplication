import { IS, NO, UIButton, UIColor, YES } from "uicore-ts"
import { LanguageService } from "../LanguageService"
import { CBCheckbox } from "./CBCheckbox"
import { CBColor } from "./CBColor"


export class SearchableDropdownRow extends UIButton {
    
    _checkbox: CBCheckbox
    
    type = SearchableDropdownRow.type.selectableItem
    _SearchableDropdownRowWasHoveredFunction: any
    
    constructor(elementID: string) {
        
        super(elementID)
        
        this._checkbox = new CBCheckbox(elementID + "Checkbox")
        this._checkbox.userInteractionEnabled = NO
        this.addSubview(this._checkbox)
        
        this.style.outline = "none"
        
    }
    
    
    set titleText(titleText: string) {
        this.titleLabel.text = titleText
        this._checkbox.titleLabel.text = titleText
    }
    
    get titleText() {
        return this.titleLabel.text
    }
    
    
    override set selected(selected: boolean) {
        super.selected = selected
        this._checkbox.selected = selected
    }
    
    override get selected() {
        return super.selected
    }
    
    
    override set focused(focused: boolean) {
        this._focused = focused
        this.updateContentForCurrentState()
    }
    
    override get focused() {
        return this._focused ?? NO
    }
    
    
    static type = {
        
        "sectionTitle": "SectionTitle",
        "selectedItem": "SelectedItem",
        "selectableItem": "SelectableItem",
        "customItem": "CustomItem"
        
    }
    
    
    override updateContentForNormalState() {
        
        
        if (this.type == SearchableDropdownRow.type.sectionTitle) {
            
            
            this.backgroundColor = UIColor.transparentColor
            this.titleLabel.textColor = CBColor.primaryContentColor.colorWithAlpha(0.5)
            
            this.style.borderTop = "1px solid rgba(0, 0, 0, 0.3)"
            
            this.titleLabel.style.marginLeft = ""
            
            this.textSuffix = ""
            
            if (this._checkbox) {
                
                this._checkbox.hidden = YES
                
            }
            
            this.titleLabel.hidden = NO
            
            
        }
        else if (this.type == SearchableDropdownRow.type.selectedItem) {
            
            this.backgroundColor = UIColor.transparentColor
            this.titleLabel.textColor = CBColor.primaryTintColor
            
            this.style.borderTop = ""
            
            //this.titleLabel.style.marginLeft = "20px"
            
            this.textSuffix = ""
            
            if (this._checkbox) {
                
                this._checkbox.hidden = NO
                
                this._checkbox.titleLabel.textColor = CBColor.primaryContentColor
                
            }
            
            this.titleLabel.hidden = YES
            
            
        }
        else if (this.type == SearchableDropdownRow.type.customItem) {
            
            this.backgroundColor = UIColor.transparentColor
            this.titleLabel.textColor = CBColor.primaryTintColor
            
            this.style.borderTop = "1px solid rgba(0, 0, 0, 0.3)"
            
            this.titleLabel.style.marginLeft = ""
            
            this.textSuffix = LanguageService.stringForKey(
                "searchableDropdownCustomItem",
                LanguageService.currentLanguageKey,
                "-Custom item"
            )
            
            if (this._checkbox) {
                
                this._checkbox.hidden = YES
                
            }
            
            this.titleLabel.hidden = NO
            
            
        }
        else {
            
            
            this.backgroundColor = UIColor.transparentColor
            this.titleLabel.textColor = CBColor.primaryTintColor
            
            this.style.borderTop = ""
            
            this.titleLabel.style.marginLeft = "20px"
            
            this.textSuffix = ""
            
            if (this._checkbox) {
                
                this._checkbox.hidden = YES
                
            }
            
            this.titleLabel.hidden = NO
            
            
        }
        
        this.userInteractionEnabled = YES
        
        
    }
    
    
    get textSuffix() {
        
        return this.titleLabel.textSuffix
        
    }
    
    set textSuffix(textSuffix: string) {
        
        this.titleLabel.textSuffix = textSuffix
        
        this._checkbox.titleLabel.textSuffix = textSuffix
        
    }
    
    
    override updateContentForHoveredState() {
        
        
        this.backgroundColor = CBColor.primaryContentColor.colorWithAlpha(0.05)
        
        
    }
    
    
    override updateContentForHighlightedState() {
        
        
        this.backgroundColor = CBColor.primaryContentColor.colorWithAlpha(0.08)
        
        
    }
    
    override updateContentForFocusedState() {
        
        
        this.backgroundColor = CBColor.primaryContentColor.colorWithAlpha(0.08)
        
        
    }
    
    
    override updateContentForSelectedState() {
        
        
        this.updateContentForNormalState()
        
        if (this.type == SearchableDropdownRow.type.selectableItem || this.type ==
            SearchableDropdownRow.type.customItem) {
    
            this._checkbox.hidden = NO
            //this._checkbox.titleLabel.hidden = YES;
    
            this._checkbox.titleLabel.textColor = CBColor.primaryTintColor
    
            if (IS(this._titleLabel)) {
        
                this._titleLabel.hidden = YES
        
            }
    
        }
        
        
    }
    
    
    override wasRemovedFromViewTree() {
        
        super.wasRemovedFromViewTree()
        
        this.highlighted = NO
        this.hovered = NO
        
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        
        if (this._checkbox) {
            
            
            this._checkbox.style.top = "25%"
            this._checkbox.style.height = "30px"
            
            
            this._checkbox.style.left = "" + this.contentPadding + "px"
            this._checkbox.style.right = "" + this.contentPadding + "px"
            
            
        }
        
        
    }
    
    
}































