import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { nil, NO, ValueOf, YES } from "./UIObject"
import { UITextView } from "./UITextView"
import { UIView, UIViewAddControlEventTargetObject, UIViewBroadcastEvent } from "./UIView"


export class UITextField extends UITextView {
    
    _placeholderTextKey?: string
    _defaultPlaceholderText?: string
    
    override _viewHTMLElement!: HTMLInputElement
    
    constructor(
        elementID?: string,
        viewHTMLElement = null,
        type: string | ValueOf<typeof UITextView.type> = UITextView.type.textField
    ) {
        
        super(elementID, type, viewHTMLElement)
        
        this.textElementView.viewHTMLElement.setAttribute("type", "text")
        this.backgroundColor = UIColor.whiteColor
        this.addTargetForControlEvent(
            UIView.controlEvent.PointerUpInside,
            (sender, event) => sender.focus()
        )
        this.textElementView.viewHTMLElement.oninput = (event) => {
            this.sendControlEventForKey(UITextField.controlEvent.TextChange, event)
        }
        this.textElementView.style.webkitUserSelect = "text"
        this.nativeSelectionEnabled = YES
        this.pausesPointerEvents = NO
        this.changesOften = YES
        
    }
    
    
    static override controlEvent = Object.assign({}, UITextView.controlEvent, {
        
        "TextChange": "TextChange"
        
    })
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof UITextField> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    public override get viewHTMLElement() {
        return this._viewHTMLElement
    }
    
    
    public override set text(text: string) {
        this.textElementView.viewHTMLElement.value = text
    }
    
    public override get text(): string {
        return this.textElementView.viewHTMLElement.value
    }
    
    
    public set placeholderText(text: string) {
        this.textElementView.viewHTMLElement.placeholder = text
    }
    
    public get placeholderText(): string {
        return this.textElementView.viewHTMLElement.placeholder
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
        const result = (this.textElementView.viewHTMLElement.type == "password")
        return result
    }
    
    public set isSecure(secure: boolean) {
        let type = "text"
        if (secure) {
            type = "password"
        }
        this.textElementView.viewHTMLElement.type = type
    }
    
    
}
