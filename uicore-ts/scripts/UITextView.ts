import { UIColor } from "./UIColor"
import { UILocalizedTextObject } from "./UIInterfaces"
import { FIRST, IS_LIKE_NULL, nil, NO, UIObject, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import type { ValueOf } from "./UIObject"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UITextView extends UIView {
    
    
    _textColor: UIColor = UITextView.defaultTextColor
    _textAlignment?: ValueOf<typeof UITextView.textAlignment>
    
    _isSingleLine = YES
    
    textPrefix = ""
    textSuffix = ""
    
    _notificationAmount = 0
    
    _minFontSize?: number
    _maxFontSize?: number
    
    _automaticFontSizeSelection = NO
    
    changesOften = NO
    
    static defaultTextColor = UIColor.blackColor
    static notificationTextColor = UIColor.redColor
    
    static _intrinsicHeightCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    static _intrinsicWidthCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    
    _intrinsicHeightCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    _intrinsicWidthCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    
    
    static _ptToPx: number
    static _pxToPt: number
    _text?: string
    
    
    constructor(
        elementID?: string,
        textViewType: string | ValueOf<typeof UITextView.type> = UITextView.type.paragraph,
        viewHTMLElement = null
    ) {
        
        super(elementID, viewHTMLElement, textViewType)
        
        this.text = ""
        
        this.style.overflow = "hidden"
        this.style.textOverflow = "ellipsis"
        this.isSingleLine = YES
        
        this.textColor = this.textColor
        
        this.userInteractionEnabled = YES
        
        
        if (textViewType == UITextView.type.textArea) {
            
            this.pausesPointerEvents = YES
            
            this.addTargetForControlEvent(
                UIView.controlEvent.PointerUpInside,
                (sender, event) => sender.focus()
            )
            
            
        }
        
        
    }
    
    
    static _determinePXAndPTRatios() {
        
        if (UITextView._ptToPx) {
            return
        }
        
        const o = document.createElement("div")
        o.style.width = "1000pt"
        document.body.appendChild(o)
        UITextView._ptToPx = o.clientWidth / 1000
        document.body.removeChild(o)
        UITextView._pxToPt = 1 / UITextView._ptToPx
        
    }
    
    
    static type = {
        
        "paragraph": "p",
        "header1": "h1",
        "header2": "h2",
        "header3": "h3",
        "header4": "h4",
        "header5": "h5",
        "header6": "h6",
        "textArea": "textarea",
        "textField": "input",
        "span": "span",
        "label": "label"
        
    } as const
    
    
    static textAlignment = {
        
        "left": "left",
        "center": "center",
        "right": "right",
        "justify": "justify"
        
    } as const
    
    get textAlignment() {
        // @ts-ignore
        return this.style.textAlign
    }
    
    set textAlignment(textAlignment: ValueOf<typeof UITextView.textAlignment>) {
        this._textAlignment = textAlignment
        this.style.textAlign = textAlignment
    }
    
    
    get textColor() {
        return this._textColor
    }
    
    set textColor(color: UIColor) {
        
        this._textColor = color || UITextView.defaultTextColor
        this.style.color = this._textColor.stringValue
        
    }
    
    
    get isSingleLine() {
        
        return this._isSingleLine
        
    }
    
    set isSingleLine(isSingleLine: boolean) {
        
        this._isSingleLine = isSingleLine
        
        this._intrinsicHeightCache = new UIObject() as any
        this._intrinsicWidthCache = new UIObject() as any
        
        if (isSingleLine) {
            
            this.style.whiteSpace = "pre"
            
            return
            
        }
        
        this.style.whiteSpace = "pre-wrap"
        
    }
    
    
    get notificationAmount() {
        
        return this._notificationAmount
        
    }
    
    set notificationAmount(notificationAmount: number) {
        
        if (this._notificationAmount == notificationAmount) {
            
            return
            
        }
        
        this._notificationAmount = notificationAmount
        
        this.text = this.text
        
        this.setNeedsLayoutUpToRootView()
        
        this.notificationAmountDidChange(notificationAmount)
        
    }
    
    notificationAmountDidChange(notificationAmount: number) {
    
    
    }
    
    
    get text() {
        
        return (this._text || this.viewHTMLElement.innerHTML)
        
    }
    
    set text(text) {
        
        this._text = text
        
        var notificationText = ""
        
        if (this.notificationAmount) {
            
            notificationText = "<span style=\"color: " + UITextView.notificationTextColor.stringValue + ";\">" +
                (" (" + this.notificationAmount + ")").bold() + "</span>"
            
        }
        
        if (this.viewHTMLElement.innerHTML != this.textPrefix + text + this.textSuffix + notificationText) {
            
            this.viewHTMLElement.innerHTML = this.textPrefix + FIRST(text, "") + this.textSuffix + notificationText
            
        }
        
        if (this.changesOften) {
            
            this._intrinsicHeightCache = new UIObject() as any
            this._intrinsicWidthCache = new UIObject() as any
            
        }
        
        this.setNeedsLayout()
        
    }
    
    override set innerHTML(innerHTML: string) {
        
        this.text = innerHTML
        
    }
    
    override get innerHTML() {
        
        return this.viewHTMLElement.innerHTML
        
    }
    
    
    setText(key: string, defaultString: string, parameters?: { [x: string]: string | UILocalizedTextObject }) {
        
        this.setInnerHTML(key, defaultString, parameters)
        
    }
    
    
    get fontSize() {
        
        const style = window.getComputedStyle(this.viewHTMLElement, null).fontSize
        
        const result = (parseFloat(style) * UITextView._pxToPt)
        
        return result
        
    }
    
    set fontSize(fontSize: number) {
        
        
        this.style.fontSize = "" + fontSize + "pt"
        
        this._intrinsicHeightCache = new UIObject() as any
        this._intrinsicWidthCache = new UIObject() as any // MEETOD LUUA!!!!
        
        
    }
    
    
    useAutomaticFontSize(minFontSize: number = nil, maxFontSize: number = nil) {
        
        
        this._automaticFontSizeSelection = YES
        
        
        this._minFontSize = minFontSize
        
        this._maxFontSize = maxFontSize
        
        this.setNeedsLayout()
        
        
    }
    
    
    static automaticallyCalculatedFontSize(
        bounds: UIRectangle,
        currentSize: UIRectangle,
        currentFontSize: number,
        minFontSize?: number,
        maxFontSize?: number
    ) {
        
        minFontSize = FIRST(minFontSize, 1)
        
        maxFontSize = FIRST(maxFontSize, 100000000000)
        
        
        const heightMultiplier = bounds.height / (currentSize.height + 1)
        
        const widthMultiplier = bounds.width / (currentSize.width + 1)
        
        
        var multiplier = heightMultiplier
        
        if (heightMultiplier > widthMultiplier) {
            
            multiplier = widthMultiplier
            
            
        }
        
        
        const maxFittingFontSize = currentFontSize * multiplier
        
        
        if (maxFittingFontSize > maxFontSize) {
            
            return maxFontSize
            
        }
        
        if (minFontSize > maxFittingFontSize) {
            
            return minFontSize
            
        }
        
        
        return maxFittingFontSize
        
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
    }
    
    
    override willMoveToSuperview(superview: UIView) {
        
        super.willMoveToSuperview(superview)
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        
        if (this._automaticFontSizeSelection) {
            
            this.fontSize = UITextView.automaticallyCalculatedFontSize(
                new UIRectangle(0, 0, 1 *
                    this.viewHTMLElement.offsetHeight, 1 *
                    this.viewHTMLElement.offsetWidth),
                this.intrinsicContentSize(),
                this.fontSize,
                this._minFontSize,
                this._maxFontSize
            )
            
            
        }
        
        
    }
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        const keyPath = (this.viewHTMLElement.innerHTML + "_csf_" + this.computedStyle.font).replace(new RegExp(
                "\\.",
                "g"
            ), "_") + "." +
            ("" + constrainingWidth).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicHeightCache
        
        if (this.changesOften) {
            
            // @ts-ignore
            cacheObject = this._intrinsicHeightCache
            
            
        }
        
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        
        if (IS_LIKE_NULL(result)) {
            
            result = super.intrinsicContentHeight(constrainingWidth)
            
            cacheObject.setValueForKeyPath(keyPath, result)
            
            
        }
        
        
        return result
        
    }
    
    override intrinsicContentWidth(constrainingHeight = 0) {
        
        const keyPath = (this.viewHTMLElement.innerHTML + "_csf_" + this.computedStyle.font).replace(new RegExp(
                "\\.",
                "g"
            ), "_") + "." +
            ("" + constrainingHeight).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicWidthCache
        
        if (this.changesOften) {
            
            // @ts-ignore
            cacheObject = this._intrinsicWidthCache
            
            
        }
        
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        
        if (IS_LIKE_NULL(result)) {
            
            result = super.intrinsicContentWidth(constrainingHeight)
            
            cacheObject.setValueForKeyPath(keyPath, result)
            
            
        }
        
        
        return result
        
    }
    
    
    override intrinsicContentSize() {
        
        // This works but is slow
        const result = this.intrinsicContentSizeWithConstraints(nil, nil)
        
        return result
        
    }
    
    
}


UITextView._determinePXAndPTRatios()


// /**
//  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
//  * 
//  * @param {String} text The text to be rendered.
//  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
//  * 
//  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
//  */
// function getTextMetrics(text, font) {
//     // re-use canvas object for better performance
//     var canvas = getTextMetrics.canvas || (getTextMetrics.canvas = document.createElement("canvas"));
//     var context = canvas.getContext("2d");
//     context.font = font;
//     var metrics = context.measureText(text);
//     return metrics;
// }
































