import { UIColor } from "./UIColor"
import { UILocalizedTextObject } from "./UIInterfaces"
import { EXTEND, FIRST, IS_LIKE_NULL, nil, NO, UIObject, ValueOf, YES } from "./UIObject"
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
        "left": "left",
        "center": "center",
        "right": "right",
        "justify": "justify"
    } as const
    
    //#endregion
    
    //#region Constructor
    
    
    constructor(
        elementID?: string,
        textViewType: string | ValueOf<typeof UITextView.type> = UITextView.type.paragraph,
        viewHTMLElement = null
    ) {
        
        // Create inner text element as a UIView
        const innerElementID = elementID ? `${elementID}_textElement` : undefined
        const _textElementView = new UIView(innerElementID, null, textViewType)
        
        // Create outer container (wrapper) - this is the main viewHTMLElement
        super(elementID, viewHTMLElement, "span", { _textElementView })
        
        // Configure outer container for vertical centering using direct property access
        
        this.configureWithObject({
            // @ts-ignore
            viewHTMLElement: {
                style: {
                    display: "flex",
                    alignItems: "center", // Vertical centering
                    overflow: "hidden"
                }
            }
        })
        
        this.text = ""
        
        this._textElementView = _textElementView
        
        // Configure inner text element for ellipsis and positioning
        this._textElementView.configureWithObject({
            style: {
                position: "relative",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
                margin: "0",
                padding: "0"
            },
            // Forward control events from text element to the container
            sendControlEventForKey: EXTEND(this.sendControlEventForKey.bind(this))
        })
        
        // Add text element as a subview
        this.addSubview(this._textElementView)
        
        
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
    
    //#endregion
    
    //#region Text Element View Property
    
    private _textElementView: UIView
    
    /**
     * The inner text element that holds the actual text content
     */
    get textElementView(): UIView {
        return this._textElementView
    }
    
    /**
     * Override style to apply to the text element instead of the container
     */
    // override get style() {
    //     return this._textElementView.style
    // }
    //
    // /**
    //  * Override computedStyle to get computed styles from the text element
    //  */
    // override get computedStyle() {
    //     return this._textElementView.computedStyle
    // }
    
    /**
     * Access the outer container's style (for positioning, layout, etc.)
     */
    get containerStyle() {
        return this.viewHTMLElement.style
    }
    
    /**
     * Override styleClasses to apply to the text element
     */
    override get styleClasses() {
        return this._textElementView.styleClasses
    }
    
    override set styleClasses(styleClasses: string[]) {
        this._textElementView.styleClasses = styleClasses
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
                new UIRectangle(
                    0,
                    0,
                    this.textElementView.viewHTMLElement.offsetHeight,
                    this.textElementView.viewHTMLElement.offsetWidth
                ),
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
        UITextMeasurement.invalidateElement(this.textElementView.viewHTMLElement)
        this._intrinsicSizesCache = {}
    }
    
    private _getMeasurementStyles(): TextMeasurementStyle | null {
        if (this._cachedMeasurementStyles) {
            return this._cachedMeasurementStyles
        }
        
        // Ensure element is in document
        if (!this.textElementView.viewHTMLElement.isConnected) {
            return null
        }
        
        // Force a layout flush ONCE to ensure computed styles are available
        // This is only paid once per style change, then we use cached values
        this.textElementView.viewHTMLElement.offsetHeight
        
        const computed = window.getComputedStyle(this.textElementView.viewHTMLElement)
        const fontSizeStr = computed.fontSize
        const fontSize = parseFloat(fontSizeStr)
        
        if (!fontSize || isNaN(fontSize)) {
            return null
        }
        
        const lineHeight = this._parseLineHeight(computed.lineHeight, fontSize)
        
        if (isNaN(lineHeight)) {
            return null
        }
        
        const font = [
            computed.fontStyle || "normal",
            computed.fontVariant || "normal",
            computed.fontWeight || "normal",
            fontSize + "px",
            computed.fontFamily || "sans-serif"
        ].join(" ")
        
        this._cachedMeasurementStyles = {
            font: font,
            fontSize: fontSize,
            lineHeight: lineHeight,
            whiteSpace: computed.whiteSpace || "normal",
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
        const content = this.text || this.textElementView.innerHTML
        
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
        return this._textElementView.style.textAlign as ValueOf<typeof UITextView.textAlignment>
    }
    
    set textAlignment(textAlignment: ValueOf<typeof UITextView.textAlignment>) {
        this._textAlignment = textAlignment
        this._textElementView.style.textAlign = textAlignment
    }
    
    //#endregion
    
    //#region Getters & Setters - Text Color
    
    get textColor() {
        return this._textColor
    }
    
    set textColor(color: UIColor) {
        this._textColor = color || UITextView.defaultTextColor
        this._textElementView.style.color = this._textColor.stringValue
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
            // Single line: use nowrap with ellipsis
            this._textElementView.style.whiteSpace = "nowrap"
            this._textElementView.style.textOverflow = "ellipsis"
            this._textElementView.style.display = ""
            this._textElementView.style.webkitLineClamp = ""
            this._textElementView.style.webkitBoxOrient = ""
            return
        }
        
        // Multiline: allow wrapping, but still show ellipsis if content overflows the container
        // This uses the -webkit-line-clamp approach which works for multiline ellipsis
        this._textElementView.style.whiteSpace = "normal"
        this._textElementView.style.textOverflow = "ellipsis"
        this._textElementView.style.display = "-webkit-box"
        this._textElementView.style.webkitBoxOrient = "vertical"
        // Don't set line-clamp to a specific number - let it fill available space
        // The overflow: hidden from the constructor will clip content that exceeds the height
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
        return (this._text || this.textElementView.viewHTMLElement.innerHTML)
    }
    
    set text(text) {
        this._text = text
        var notificationText = ""
        if (this.notificationAmount) {
            notificationText = "<span style=\"color: " + UITextView.notificationTextColor.stringValue + ";\">" +
                (" (" + this.notificationAmount + ")").bold() + "</span>"
        }
        
        if (this.textElementView.viewHTMLElement.innerHTML != this.textPrefix + text + this.textSuffix + notificationText) {
            this.textElementView.viewHTMLElement.innerHTML = this.textPrefix + FIRST(
                text, "") + this.textSuffix + notificationText
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
        this.textElementView.setInnerHTML(key, defaultString, parameters)
        this.invalidateMeasurementStrategy()
    }
    
    //#endregion
    
    //#region Getters & Setters - Font Size
    
    get fontSize() {
        const style = this._textElementView.style.fontSize || window.getComputedStyle(this._textElementView.viewHTMLElement, null).fontSize
        const result = (parseFloat(style) * UITextView._pxToPt)
        return result
    }
    
    set fontSize(fontSize: number) {
        if (fontSize != this.fontSize) {
            this._textElementView.style.fontSize = "" + fontSize + "pt"
            
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
            fontSize: this._textElementView.style.fontSize || "",
            fontFamily: this._textElementView.style.fontFamily || "",
            fontWeight: this._textElementView.style.fontWeight || "",
            fontStyle: this._textElementView.style.fontStyle || "",
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
            const computed = this._textElementView.computedStyle
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
        fontSize: "",
        fontFamily: "",
        fontWeight: "",
        fontStyle: "",
        styleClasses: ""
    }
    
    //#endregion
    
    //#region Instance Properties - Caching & Performance
    
    changesOften = NO
    
    // Local cache for this instance if the label changes often
    _intrinsicHeightCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    _intrinsicWidthCache: { [x: string]: { [x: string]: number; }; } & UIObject = new UIObject() as any
    
    private _useFastMeasurement: boolean | undefined
    private _cachedMeasurementStyles: TextMeasurementStyle | undefined | null
    
    override usesVirtualLayoutingForIntrinsicSizing = NO
    
    //#endregion
    
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
    
    // Override focus to focus the text element
    override focus() {
        this._textElementView.focus()
    }
    
    // Override blur to blur the text element
    override blur() {
        this._textElementView.blur()
    }
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        const keyPath = ((this.textElementView.viewHTMLElement.innerHTML || this.text) + "_csf_" + this._getFontCacheKey()) + "." +
            ("" + constrainingWidth).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicHeightCache
        
        if (this.changesOften) {
            cacheObject = this._intrinsicHeightCache
        }
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        if (IS_LIKE_NULL(result)) {
            // Determine if we should use fast measurement
            const shouldUseFastPath = this._useFastMeasurement ?? this._shouldUseFastMeasurement()
            
            if (shouldUseFastPath) {
                // Fast path: use UITextMeasurement with pre-extracted styles
                const styles = this._getMeasurementStyles()
                
                // If styles are invalid (element not properly initialized), fall back to DOM
                if (styles) {
                    const size = UITextMeasurement.calculateTextSize(
                        this.textElementView.viewHTMLElement,
                        this.text || this.textElementView.innerHTML,
                        constrainingWidth || undefined,
                        undefined,
                        styles
                    )
                    result = size.height
                }
                else {
                    // Styles not ready, use DOM measurement
                    result = super.intrinsicContentHeight(constrainingWidth)
                }
            }
            else {
                // Fallback: DOM-based measurement for complex content
                result = super.intrinsicContentHeight(constrainingWidth)
            }
            
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        if (isNaN(result) || (!result && !this.text)) {
            result = super.intrinsicContentHeight(constrainingWidth)
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        return result
    }
    
    override intrinsicContentWidth(constrainingHeight = 0) {
        
        const keyPath = ((this.textElementView.viewHTMLElement.innerHTML || this.text) + "_csf_" + this._getFontCacheKey()) + "." +
            ("" + constrainingHeight).replace(new RegExp("\\.", "g"), "_")
        
        let cacheObject = UITextView._intrinsicWidthCache
        
        if (this.changesOften) {
            cacheObject = this._intrinsicWidthCache
        }
        
        var result = cacheObject.valueForKeyPath(keyPath)
        
        if (IS_LIKE_NULL(result)) {
            // Determine if we should use fast measurement
            const shouldUseFastPath = this._useFastMeasurement ?? this._shouldUseFastMeasurement()
            
            if (shouldUseFastPath) {
                // Fast path: use UITextMeasurement with pre-extracted styles
                const styles = this._getMeasurementStyles()
                
                // If styles are invalid (element not properly initialized), fall back to DOM
                if (styles) {
                    const size = UITextMeasurement.calculateTextSize(
                        this.textElementView.viewHTMLElement,
                        this.text || this.textElementView.innerHTML,
                        undefined,
                        constrainingHeight || undefined,
                        styles
                    )
                    result = size.width
                }
                else {
                    // Styles not ready, use DOM measurement
                    result = super.intrinsicContentWidth(constrainingHeight)
                }
            }
            else {
                // Fallback: DOM-based measurement for complex content
                result = super.intrinsicContentWidth(constrainingHeight)
            }
            
            cacheObject.setValueForKeyPath(keyPath, result)
        }
        
        return result
    }
    
    
    override intrinsicContentSizeWithConstraints(constrainingHeight: number = 0, constrainingWidth: number = 0) {
        
        const cacheKey = this._getIntrinsicSizeCacheKey(constrainingHeight, constrainingWidth)
        const cachedResult = this._getCachedIntrinsicSize(cacheKey)
        if (cachedResult) {
            return cachedResult
        }
        
        // UITextView needs to measure the text element, not the outer container
        const result = new UIRectangle(0, 0, 0, 0)
        if (this.rootView.forceIntrinsicSizeZero) {
            return result
        }
        
        let temporarilyInViewTree = NO
        let nodeAboveThisView: Node | null = null
        if (!this.isMemberOfViewTree) {
            document.body.appendChild(this.viewHTMLElement)
            temporarilyInViewTree = YES
            nodeAboveThisView = this.viewHTMLElement.nextSibling
        }
        
        // Save and clear styles on the TEXT ELEMENT (not the container)
        const height = this._textElementView.style.height
        const width = this._textElementView.style.width
        
        this._textElementView.style.height = "" + constrainingHeight
        this._textElementView.style.width = "" + constrainingWidth
        
        const left = this._textElementView.style.left
        const right = this._textElementView.style.right
        const bottom = this._textElementView.style.bottom
        const top = this._textElementView.style.top
        
        this._textElementView.style.left = ""
        this._textElementView.style.right = ""
        this._textElementView.style.bottom = ""
        this._textElementView.style.top = ""
        
        // Measure height with the text element
        const resultHeight = this._textElementView.viewHTMLElement.scrollHeight
        
        // Measure width by temporarily setting nowrap
        const whiteSpace = this._textElementView.style.whiteSpace
        this._textElementView.style.whiteSpace = "nowrap"
        
        const resultWidth = this._textElementView.viewHTMLElement.scrollWidth
        
        this._textElementView.style.whiteSpace = whiteSpace
        
        // Restore styles on the TEXT ELEMENT
        this._textElementView.style.height = height
        this._textElementView.style.width = width
        
        this._textElementView.style.left = left
        this._textElementView.style.right = right
        this._textElementView.style.bottom = bottom
        this._textElementView.style.top = top
        
        if (temporarilyInViewTree) {
            document.body.removeChild(this.viewHTMLElement)
            if (this.superview) {
                if (nodeAboveThisView) {
                    this.superview.viewHTMLElement.insertBefore(this.viewHTMLElement, nodeAboveThisView)
                }
                else {
                    this.superview.viewHTMLElement.appendChild(this.viewHTMLElement)
                }
            }
        }
        
        result.height = resultHeight
        result.width = resultWidth
        
        this._setCachedIntrinsicSize(cacheKey, result)
        
        return result
    }
    
    
}
