import { nil, UIView, UIViewAddControlEventTargetObject } from "uicore-ts"


export class SearchTextField extends UIView {
    
    private readonly _textField: UIView
    private readonly _searchButton: UIView
    
    constructor(elementID: string) {
        
        super(elementID)
        
        
        this.viewHTMLElement.classList.add("input", "input--search")
        
        
        this.viewHTMLElement.innerHTML = "\
            <button type=\"button\" class=\"input__button\">\
                <i class=\"material-icons\">search</i>\
            </button>\
            <input type=\"search\" class=\"input__field\" placeholder=\"Search\">"
        
        
        this._textField = new UIView(nil, this.textFieldElement)
        this._searchButton = new UIView(nil, this.searchButtonElement)
        
        
        this._searchButton.addTargetForControlEvents([
            UIView.controlEvent.EnterDown, UIView.controlEvent.PointerUpInside
        ], function (this: SearchTextField, sender: UIView, event: Event) {
            
            this.performSearch()
            
        }.bind(this))
        
        this._textField.addTargetForControlEvent(
            UIView.controlEvent.EnterDown,
            function (this: SearchTextField, sender: UIView, event: Event) {
                
                this.performSearch()
                
            }.bind(this)
        )
        
        
        this._textField.viewHTMLElement.oninput = (event) => {
            
            this.sendControlEventForKey(SearchTextField.controlEvent.TextChange, event)
            
        }
        
        
    }
    
    
    static controlEvent = Object.assign({}, UIView.controlEvent, {
        
        "TextChange": "TextChange"
        
    })
    
    // @ts-ignore
    get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof SearchTextField> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    get searchButton(): UIView {
        return this._searchButton
    }
    
    get textField(): UIView {
        return this._textField
    }
    
    get searchButtonElement() {
        
        return this.viewHTMLElement.querySelector("button") as HTMLButtonElement
        
        
    }
    
    get textFieldElement() {
        
        return this.viewHTMLElement.querySelector("input") as HTMLInputElement
        
        
    }
    
    
    
    set placeholderText(placeholderText: string) {
        
        this.textFieldElement.setAttribute("placeholder", placeholderText)
        
    }
    
    get placeholderText() {
    
        return this.textFieldElement.getAttribute("placeholder") ?? ""
        
    }
    
    
    
    
    
    get text() {
        
        return this.textFieldElement.value
        
    }
    
    set text(text: string) {
        
        this.textFieldElement.value = text
        
    }
    
    
    
    focus() {
        
        this.textFieldElement.focus()
        
    }
    
    blur() {
        
        this.textFieldElement.blur()
        
    }
    
    
    
    
    
    performSearch(): any {
    
    
    
    }
    
    
    
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        
        
        
        
    }
    
    
    
    
    
}























