import { UIColor } from "./UIColor"
import { UILocalizedTextObject } from "./UIInterfaces"
import { FIRST, IS_LIKE_NULL, nil, NO, UIObject, ValueOf, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { TextMeasurementStyle, UITextMeasurement } from "./UITextMeasurement"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UITextView extends UIView {
    
    //#region Static Properties
    
    static defaultTextColor = UIColor.blackColor
    static notificationTextColor = UIColor.redColor
    
    // Global caches for all UILabels
    static _intrinsicHeightCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    static _intrinsicWidthCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    
    static _ptToPx: number
    static _pxToPt: number
    
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
        "left": "flex-start",
        "center": "center",
        "right": "flex-end",
        "justify": "stretch"
    } as const
    
    //#endregion
    
    //#region Constructor
    
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
        
        this.userInteractionEnabled = YES;
        
        (this as UITextView).configureWithObject({
            style: {
                display: "flex",
                flexDirection: "column", // Ensures vertical stacking logic
                
                // 'safe' ensures that if content overflows, it aligns to the start (top)
                // instead of overflowing upwards or downwards equally.
                justifyContent: "safe center",
                alignItems: "flex-start",  // Keeps text left-aligned (change to "center" for horizontal center)
                
                // Optional: ensure text wraps if it gets too long
                whiteSpace: "normal",
                wordWrap: "break-word",
                overflowWrap: "break-word"
            }
        })
        
        if (textViewType == UITextView.type.textArea) {
            this.pausesPointerEvents = YES
            this.addTargetForControlEvent(
                UIView.controlEvent.PointerUpInside,
                (sender, event) => sender.focus()
            )
        }
    }
    
    //#endregion
    
    //#region Lifecycle Methods
    
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
    
    //#endregion
    
    //#region Measurement & Sizing - Private Methods
    
    private _invalidateMeasurementStyles(): void {
        this._cachedMeasurementStyles = undefined
        UITextMeasurement.invalidateElement(this.viewHTMLElement)
        this._intrinsicSizesCache = {}
    }
    
    private _getMeasurementStyles(): TextMeasurementStyle {
        if (this._cachedMeasurementStyles) {
            return this._cachedMeasurementStyles
        }
        
        const computed = window.getComputedStyle(this.viewHTMLElement)
        const fontSize = parseFloat(computed.fontSize)
        
        this._cachedMeasurementStyles = {
            font: [
                computed.fontStyle,
                computed.fontVariant,
                computed.fontWeight,
                computed.fontSize,
                computed.fontFamily
            ].join(" "),
            fontSize: fontSize,
            lineHeight: this._parseLineHeight(computed.lineHeight, fontSize),
            whiteSpace: computed.whiteSpace,
            paddingLeft: parseFloat(computed.paddingLeft) || 0,
            paddingRight: parseFloat(computed.paddingRight) || 0,
            paddingTop: parseFloat(computed.paddingTop) || 0,
            paddingBottom: parseFloat(computed.paddingBottom) || 0
        }
        
        return this._cachedMeasurementStyles
    }
    
    private _parseLineHeight(lineHeight: string, fontSize: number): number {
        if (lineHeight === "normal") {
            return fontSize * 1.2
        }
        if (lineHeight.endsWith("px")) {
            return parseFloat(lineHeight)
        }
        const numericLineHeight = parseFloat(lineHeight)
        if (!isNaN(numericLineHeight)) {
            return fontSize * numericLineHeight
        }
        return fontSize * 1.2
    }
    
    private _shouldUseFastMeasurement(): boolean {
        const content = this.text || this.innerHTML
        
        if (this._innerHTMLKey || this._localizedTextObject) {
            return false
        }
        
        if (this.notificationAmount > 0) {
            return false
        }
        
        const hasComplexHTML = /<(?!\/?(b|i|em|strong|span|br)\b)[^>]+>/i.test(content)
        
        return !hasComplexHTML
    }
    
    //#endregion
    
    //#region Measurement & Sizing - Public Methods
    
    setUseFastMeasurement(useFast: boolean): void {
        this._useFastMeasurement = useFast
        this._intrinsicSizesCache = {}
    }
    
    invalidateMeasurementStrategy(): void {
        this._useFastMeasurement = undefined
        this._invalidateMeasurementStyles()
    }
    
    //#endregion
    
    //#region Getters & Setters - Text Alignment
    
    get textAlignment() {
        // @ts-ignore
        return this.style.alignItems
    }
    
    set textAlignment(textAlignment: ValueOf<typeof UITextView.textAlignment>) {
        this.style.alignItems = textAlignment
    }
    
    //#endregion
    
    //#region Getters & Setters - Text Color
    
    get textColor() {
        return this._textColor
    }
    
    set textColor(color: UIColor) {
        this._textColor = color || UITextView.defaultTextColor
        this.style.color = this._textColor.stringValue
    }
    
    //#endregion
    
    //#region Getters & Setters - Single Line
    
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
        this.invalidateMeasurementStrategy()
    }
    
    //#endregion
    
    //#region Getters & Setters - Notification Amount
    
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
    
    //#endregion
    
    //#region Getters & Setters - Text Content
    
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
        
        this._useFastMeasurement = undefined
        this._intrinsicSizesCache = {}
        this.invalidateMeasurementStrategy()
        this._invalidateMeasurementStyles()
        this.clearIntrinsicSizeCache()
        
        this.setNeedsLayout()
    }
    
    override set innerHTML(innerHTML: string) {
        this.text = innerHTML
        this.invalidateMeasurementStrategy()
    }
    
    override get innerHTML() {
        return this.viewHTMLElement.innerHTML
    }
    
    setText(key: string, defaultString: string, parameters?: { [x: string]: string | UILocalizedTextObject }) {
        this.setInnerHTML(key, defaultString, parameters)
        this.invalidateMeasurementStrategy()
    }
    
    //#endregion
    
    //#region Getters & Setters - Font Size
    
    get fontSize() {
        const style = this.style.fontSize || window.getComputedStyle(this.viewHTMLElement, null).fontSize
        const result = (parseFloat(style) * UITextView._pxToPt)
        return result
    }
    
    set fontSize(fontSize: number) {
        if (fontSize != this.fontSize) {
            this.style.fontSize = "" + fontSize + "pt"
            
            this._intrinsicHeightCache = new UIObject() as any
            this._intrinsicWidthCache = new UIObject() as any
            
            this._invalidateFontCache()
            this._invalidateMeasurementStyles()
            this.clearIntrinsicSizeCache()
        }
    }
    
    useAutomaticFontSize(minFontSize: number = nil, maxFontSize: number = nil) {
        this._automaticFontSizeSelection = YES
        this._minFontSize = minFontSize
        this._maxFontSize = maxFontSize
        this.setNeedsLayout()
    }
    
    //#endregion
    
    //#region Font Caching - Private Methods
    
    /**
     * Get a stable cache key for the font without triggering reflow.
     * Only computes font on first access or when font properties change.
     */
    private _getFontCacheKey(): string {
        // Check if font-related properties have changed
        const currentTriggers = {
            fontSize: this.style.fontSize || "",
            fontFamily: this.style.fontFamily || "",
            fontWeight: this.style.fontWeight || "",
            fontStyle: this.style.fontStyle || "",
            styleClasses: this.styleClasses.join(",")
        }
        
        const hasChanged =
            currentTriggers.fontSize !== this._fontInvalidationTriggers.fontSize ||
            currentTriggers.fontFamily !== this._fontInvalidationTriggers.fontFamily ||
            currentTriggers.fontWeight !== this._fontInvalidationTriggers.fontWeight ||
            currentTriggers.fontStyle !== this._fontInvalidationTriggers.fontStyle ||
            currentTriggers.styleClasses !== this._fontInvalidationTriggers.styleClasses
        
        if (!this._cachedFontKey || hasChanged) {
            // Only access computedStyle when we know something changed
            const computed = this.computedStyle
            this._cachedFontKey = [
                computed.fontStyle,
                computed.fontVariant,
                computed.fontWeight,
                computed.fontSize,
                computed.fontFamily
            ].join("_").replace(/[.\s]/g, "_")
            
            this._fontInvalidationTriggers = currentTriggers
        }
        
        return this._cachedFontKey
    }
    
    /**
     * Invalidate font cache when font properties change
     */
    private _invalidateFontCache(): void {
        this._cachedFontKey = undefined
    }
    
    //#endregion
    
    //#region Static Methods
    
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
    
    //#endregion
    
    //#region Instance Properties - Text Content
    
    _text?: string
    textPrefix = ""
    textSuffix = ""
    _notificationAmount = 0
    
    //#endregion
    
    //#region Instance Properties - Styling
    
    _textColor: UIColor = UITextView.defaultTextColor
    _textAlignment?: ValueOf<typeof UITextView.textAlignment>
    _isSingleLine = YES
    
    //#endregion
    
    //#region Instance Properties - Font & Sizing
    
    _minFontSize?: number
    _maxFontSize?: number
    _automaticFontSizeSelection = NO
    
    // Cache for the computed font string
    private _cachedFontKey?: string
    private _fontInvalidationTriggers = {
        fontSize: this.style.fontSize || "",
        fontFamily: this.style.fontFamily || "",
        fontWeight: this.style.fontWeight || "",
        fontStyle: this.style.fontStyle || "",
        styleClasses: this.styleClasses.join(",")
    }
    
    //#endregion
    
    //#region Instance Properties - Caching & Performance
    
    changesOften = NO
    
    // Local cache for this instance if the label changes often
    _intrinsicHeightCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    _intrinsicWidthCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    
    private _useFastMeasurement: boolean | undefined
    private _cachedMeasurementStyles: TextMeasurementStyle | undefined
    
    override usesVirtualLayoutingForIntrinsicSizing = NO
    
    //#endregion
    
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        const keyPath = (this.viewHTMLElement.innerHTML + "_csf_" + this._getFontCacheKey()) + "." +
            ("" + constrainingWidth).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicHeightCache
        
        if (this.changesOften) {
            cacheObject = this._intrinsicHeightCache
        }
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        if (IS_LIKE_NULL(result)) {
            result = super.intrinsicContentHeight(constrainingWidth)
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        if (isNaN(result) || (!result && !this.text)) {
            result = super.intrinsicContentHeight(constrainingWidth)
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        return result
    }
    
    override intrinsicContentWidth(constrainingHeight = 0) {
        
        const keyPath = (this.viewHTMLElement.innerHTML + "_csf_" + this._getFontCacheKey()) + "." +
            ("" + constrainingHeight).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicWidthCache
        
        if (this.changesOften) {
            cacheObject = this._intrinsicWidthCache
        }
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        if (IS_LIKE_NULL(result)) {
            result = super.intrinsicContentWidth(constrainingHeight)
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        return result
    }
    
    
    // Override addStyleClass to invalidate font cache
    override addStyleClass(styleClass: string) {
        super.addStyleClass(styleClass)
        this._invalidateFontCache()
    }
    
    // Override removeStyleClass to invalidate font cache
    override removeStyleClass(styleClass: string) {
        super.removeStyleClass(styleClass)
        this._invalidateFontCache()
    }
    
    
}
