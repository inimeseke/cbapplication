import { CBDropdownDataItem } from "cbcore-ts"
import {
    IS,
    IS_NOT,
    nil,
    NO,
    UIColor,
    UIRectangle,
    UITextView,
    UIViewAddControlEventTargetObject,
    YES
} from "uicore-ts"
import { SearchableDropdown } from "./SearchableDropdown"


export class CBColorSelector<T> extends SearchableDropdown<T> {
    
    private readonly _inputHTMLElement: HTMLInputElement
    
    constructor(elementID?: string, elementType?: string) {
        
        super(elementID)
        
        this._inputHTMLElement = document.createElement("input")
        this._inputHTMLElement.setAttribute("type", "color")
        this._inputHTMLElement.id = this.elementID + "InputElement"
        this._inputHTMLElement.style.visibility = "hidden"
        this.viewHTMLElement.appendChild(this._inputHTMLElement)
        
        this.imageView.hiddenWhenEmpty = NO
        this.imageView.hidden = NO
        
        //this.imageView.backgroundColor = this.backgroundColor
        
        this.isSingleSelection = YES
        this.allowsCustomItem = YES
        
        this.controlEventTargetAccumulator.SelectionDidChange = () => {
            
            if (this.selectedData.firstElement?.itemCode == "customValue") {
                
                this.inputHTMLElement.click()
                
                //this.selectedData = []
                
                //this._tableView.viewForRowWithIndex(0)
                
            }
            else {
                
                // @ts-ignore
                const value = UIColor[this.selectedData.firstElement.attachedObject.propertyKey]
                this.inputHTMLElement.value = "" + value
                
                this.sendControlEventForKey(CBColorSelector.controlEvent.ValueChange, nil)
                
                
            }
            
            
        }
        
        this.controlEventTargetAccumulator.PointerUpInside.EnterDown = () => {
            
            this.setNeedsLayout()
            this._dialogView.setNeedsLayout()
            this._dialogView.layoutIfNeeded()
            //this.inputHTMLElement.click()
            
        }
        
        this._inputHTMLElement.onchange = (event) => {
            
            this.imageView.backgroundColor = this.selectedColor
            
            this.sendControlEventForKey(CBColorSelector.controlEvent.ValueChange, event)
            
        }
        
        this._inputHTMLElement.oninput = (event) => {
            
            this.imageView.backgroundColor = this.selectedColor
            
            this.sendControlEventForKey(CBColorSelector.controlEvent.ValueInput, event)
            
        }
        
    }
    
    
    static override controlEvent = Object.assign({}, SearchableDropdown.controlEvent, {
        
        "ValueChange": "ValueChange",
        "ValueInput": "ValueInput"
        
    })
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof CBColorSelector> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    
    get inputHTMLElement(): HTMLInputElement {
        return this._inputHTMLElement
    }
    
    
    get selectedColor() {
        
        let result
        
        if (this.selectedData.firstElement?.itemCode == "customValue") {
            
            this.inputHTMLElement.click()
            
            result = new UIColor(this.inputHTMLElement.value)
            
            //this._tableView.viewForRowWithIndex(0)
            
        }
        else {
            
            // @ts-ignore
            result = UIColor[this.selectedData.firstElement.attachedObject.propertyKey]
            
        }
        
        return result
        
    }
    
    
    get selectedColorStringValueForEditor() {
        
        let result
        
        if (this.selectedData.firstElement?.itemCode == "customValue") {
            
            result = "" + new UIColor(this.inputHTMLElement.value)
            
        }
        else {
            
            result = this.selectedData.firstElement.itemCode
            
        }
        
        return result
        
    }
    
    override set data(data: CBDropdownDataItem<T>[]) {
        
        data.unshift({
            _id: "customValue",
            title: { en: "Select custom value" },
            isADropdownDataSection: false,
            isADropdownDataRow: true,
            // @ts-ignore
            attachedObject: undefined,
            itemCode: "customValue",
            dropdownCode: ""
        })
        
        super.data = data
        
    }
    
    override get data(): CBDropdownDataItem<T>[] {
        return super.data
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



























