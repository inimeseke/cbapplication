import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { nil, NO, YES } from "./UIObject"
import { UITextView } from "./UITextView"
import { UIView, UIViewAddControlEventTargetObject, UIViewBroadcastEvent } from "./UIView"


export class UITextField extends UITextView {
    
    _placeholderTextKey?: string
    _defaultPlaceholderText?: string
    
    override _viewHTMLElement!: HTMLInputElement
    
    constructor(elementID?: string, viewHTMLElement = null, type = UITextView.type.textField) {
        
        super(elementID, type, viewHTMLElement)
        
        this.viewHTMLElement.setAttribute("type", "text")
        
        this.backgroundColor = UIColor.whiteColor
    
        this.addTargetForControlEvent(
            UIView.controlEvent.PointerUpInside,
            (sender, event) => sender.focus()
        )
        
        this.viewHTMLElement.oninput = (event) => {
            this.sendControlEventForKey(UITextField.controlEvent.TextChange, event)
        }
    
    
        this.style.webkitUserSelect = "text"
    
        this.nativeSelectionEnabled = YES
        
        this.pausesPointerEvents = NO
    
    
    }
    
    
    static override controlEvent = Object.assign({}, UITextView.controlEvent, {
        
        "TextChange": "TextChange"
        
    })
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<UITextField> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    public override get viewHTMLElement() {
        return this._viewHTMLElement
    }
    
    
    public override set text(text: string) {
        
        this.viewHTMLElement.value = text
        
    }
    
    
    public override get text(): string {
        
        return this.viewHTMLElement.value
        
    }
    
    
    public set placeholderText(text: string) {
        
        this.viewHTMLElement.placeholder = text
        
    }
    
    
    public get placeholderText(): string {
        
        return this.viewHTMLElement.placeholder
        
    }
    
    
    setPlaceholderText(key: string, defaultString: string) {
        
        this._placeholderTextKey = key
        this._defaultPlaceholderText = defaultString
        
        const languageName = UICore.languageService.currentLanguageKey
        this.placeholderText = UICore.languageService.stringForKey(key, languageName, defaultString, nil)
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.LanguageChanged || event.name ==
            UIView.broadcastEventName.AddedToViewTree) {
            
            this._setPlaceholderFromKeyIfPossible()
            
        }
        
    }
    
    
    override willMoveToSuperview(superview: UIView) {
        
        super.willMoveToSuperview(superview)
        
        this._setPlaceholderFromKeyIfPossible()
        
    }
    
    _setPlaceholderFromKeyIfPossible() {
        
        if (this._placeholderTextKey && this._defaultPlaceholderText) {
            
            this.setPlaceholderText(this._placeholderTextKey, this._defaultPlaceholderText)
            
        }
        
    }
    
    
    public get isSecure(): boolean {
        
        const result = (this.viewHTMLElement.type == "password")
        
        return result
        
    }
    
    
    
    public set isSecure(secure: boolean) {
        
        var type = "text"
        
        if (secure) {
            
            type = "password"
            
        }
        
        this.viewHTMLElement.type = type
        
    }
    
    
    
    
    
}




































