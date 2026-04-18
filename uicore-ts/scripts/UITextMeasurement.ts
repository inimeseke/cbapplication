// UITextMeasurement.ts - Efficient text measurement without DOM reflows

// ─── Optional pretext integration ────────────────────────────────────────────
// pretext (https://github.com/chenglou/pretext) is used for the fast path when:
//   1. The package is present in the bundle (require does not throw), AND
//   2. The text has no letter-spacing (pretext does not model it).
//
// If either condition fails the hand-rolled canvas path is used instead.
// This runs synchronously at module load time — no async needed.

type PretextPrepareFn = (text: string, font: string, options?: { whiteSpace?: "normal" | "pre-wrap" }) => any
type PretextLayoutFn  = (prepared: any, maxWidth: number, lineHeight: number) => { height: number; lineCount: number }

let _pretextPrepare: PretextPrepareFn | null = null
let _pretextLayout:  PretextLayoutFn  | null = null

try {
    // Static require — if @chenglou/pretext is absent the bundler throws here
    // and we fall through to the null values above.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@chenglou/pretext") as { prepare: PretextPrepareFn; layout: PretextLayoutFn }
    _pretextPrepare = mod.prepare
    _pretextLayout  = mod.layout
} catch {
    // Package not available — hand-rolled path will be used for everything.
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TextMeasurementStyle {
    font: string
    fontSize: number
    lineHeight: number
    whiteSpace: string
    paddingLeft: number
    paddingRight: number
    paddingTop: number
    paddingBottom: number
    letterSpacing: number
    textTransform: string
}

export class UITextMeasurement {
    
    // ─── Pretext prepared-text cache ─────────────────────────────────────────────
    // Key: `${text}|${font}|${whiteSpaceOption}`, value: the PreparedText handle.
    // prepare() is the expensive one-time pass (~19 ms / 500 texts in batch).
    // layout() is pure arithmetic after that (~0.09 ms / call).
    private static _preparedCache = new Map<string, any>()
    
    // ─── Style cache ─────────────────────────────────────────────────────────────
    private static globalStyleCache = new Map<string, TextMeasurementStyle>()
    private static elementToCacheKey = new WeakMap<HTMLElement, string>()
    
    // ─── Shared canvas (hand-rolled path + measureTextWidth compat shim) ─────────
    private static _canvas:  HTMLCanvasElement       | null = null
    private static _context: CanvasRenderingContext2D | null = null
    
    // Temporary element for the DOM slow-path
    private static measurementElement: HTMLDivElement | null = null
    
    // ─── Private helpers ──────────────────────────────────────────────────────────
    
    private static generateStyleCacheKey(computed: CSSStyleDeclaration): string {
        return [
            computed.fontFamily,
            computed.fontSize,
            computed.fontWeight,
            computed.fontStyle,
            computed.fontVariant,
            computed.lineHeight,
            computed.letterSpacing,
            computed.wordSpacing,
            computed.textTransform,
            computed.whiteSpace,
            computed.wordBreak,
            computed.wordWrap,
            computed.paddingLeft,
            computed.paddingRight,
            computed.paddingTop,
            computed.paddingBottom,
            computed.borderLeftWidth,
            computed.borderRightWidth,
            computed.borderTopWidth,
            computed.borderBottomWidth,
            computed.boxSizing
        ].join("|")
    }
    
    private static getSemanticCacheKey(element: HTMLElement): string {
        const existingKey = this.elementToCacheKey.get(element)
        if (existingKey) {
            return existingKey
        }
        
        const classList  = Array.from(element.classList).sort().join(" ")
        const semanticKey = `${element.tagName.toLowerCase()}::${classList}`
        
        if (this.globalStyleCache.has(semanticKey)) {
            this.elementToCacheKey.set(element, semanticKey)
            return semanticKey
        }
        
        const styleCacheKey = this.generateStyleCacheKey(window.getComputedStyle(element))
        this.elementToCacheKey.set(element, styleCacheKey)
        return styleCacheKey
    }
    
    private static getCanvasContext(): CanvasRenderingContext2D {
        if (!this._context) {
            this._canvas  = document.createElement("canvas")
            this._context = this._canvas.getContext("2d")!
        }
        return this._context
    }
    
    private static getMeasurementElement(): HTMLDivElement {
        if (!this.measurementElement) {
            this.measurementElement = document.createElement("div")
            this.measurementElement.style.cssText = `
                position: absolute;
                visibility: hidden;
                pointer-events: none;
                top: -9999px;
                left: -9999px;
                width: auto;
                height: auto;
            `
        }
        return this.measurementElement
    }
    
    private static applyTextTransform(text: string, transform: string): string {
        switch (transform) {
            case "uppercase":  return text.toUpperCase()
            case "lowercase":  return text.toLowerCase()
            case "capitalize": return text.replace(/\b\w/g, c => c.toUpperCase())
            default:           return text
        }
    }
    
    private static parseLineHeight(lineHeight: string, fontSize: number): number {
        if (lineHeight === "normal") {
            return fontSize * 1.2
        }
        if (lineHeight.endsWith("px")) {
            return parseFloat(lineHeight)
        }
        const numeric = parseFloat(lineHeight)
        return isNaN(numeric) ? fontSize * 1.2 : fontSize * numeric
    }
    
    private static isPlainText(content: string): boolean {
        return !/<(?!\/?(b|i|em|strong|span|br)\b)[^>]+>/i.test(content)
    }
    
    private static hasSimpleFormatting(content: string): boolean {
        return /^[^<]*(?:<\/?(?:b|i|em|strong|span)(?:\s+style="[^"]*")?>[^<]*)*$/i.test(content)
    }
    
    // ─── Pretext fast path ────────────────────────────────────────────────────────
    
    private static getPreparedText(text: string, font: string, whiteSpace: string): any {
        const whiteSpaceOption = whiteSpace === "pre-wrap" ? "pre-wrap" : "normal"
        const cacheKey = `${text}|${font}|${whiteSpaceOption}`
        
        let prepared = this._preparedCache.get(cacheKey)
        if (!prepared) {
            prepared = _pretextPrepare!(text, font, { whiteSpace: whiteSpaceOption })
            this._preparedCache.set(cacheKey, prepared)
        }
        return prepared
    }
    
    private static calculatePlainTextSizeViaPretext(
        styles: TextMeasurementStyle,
        text: string,
        constrainingWidth?: number
    ): { width: number; height: number } {
        const paddingH = styles.paddingLeft + styles.paddingRight
        const paddingV = styles.paddingTop  + styles.paddingBottom
        
        const transformedText = this.applyTextTransform(text, styles.textTransform)
        
        if (styles.whiteSpace === "nowrap" || styles.whiteSpace === "pre" || !constrainingWidth) {
            // Single-line: layout with Infinity gives us lineCount == 1 and
            // height == lineHeight. Width is not needed by height-only callers.
            const prepared = this.getPreparedText(transformedText, styles.font, styles.whiteSpace)
            const result   = _pretextLayout!(prepared, Infinity, styles.lineHeight)
            if (isNaN(result.height)) {
                return { width: NaN, height: NaN }
            }
            return {
                width:  result.height + paddingH,
                height: styles.lineHeight + paddingV
            }
        }
        
        const availableWidth = constrainingWidth - paddingH
        const prepared = this.getPreparedText(transformedText, styles.font, styles.whiteSpace)
        const result   = _pretextLayout!(prepared, availableWidth, styles.lineHeight)
        
        // pretext propagates NaN when the canvas font hasn't loaded yet.
        // The documentFontsDidLoad hook will trigger a re-layout.
        if (isNaN(result.height)) {
            return { width: NaN, height: NaN }
        }
        
        return {
            width:  constrainingWidth,
            height: result.height + paddingV
        }
    }
    
    // ─── Hand-rolled canvas fallback ──────────────────────────────────────────────
    // Used when pretext is unavailable OR when letter-spacing is non-zero
    // (pretext does not model letter-spacing).
    
    // Tracks fonts already requested for loading to avoid redundant calls.
    private static _fontsLoadingSet = new Set<string>()
    
    static measureTextWidth(text: string, font: string, letterSpacing: number = 0): number {
        const ctx = this.getCanvasContext()
        ctx.font = font
        
        // If the normalised ctx.font doesn't contain the requested family the font
        // hasn't been loaded into the canvas font system yet. Request a load and
        // return NaN so callers know not to cache this result.
        if (!ctx.font.includes(font.split(",")[0].split(" ").pop()!.trim())) {
            if (!this._fontsLoadingSet.has(font)) {
                this._fontsLoadingSet.add(font)
                document.fonts.load(font).then(() => {
                    this._fontsLoadingSet.delete(font)
                })
            }
            return NaN
        }
        
        const baseWidth = ctx.measureText(text).width
        // Canvas measureText does not apply letter-spacing; add it manually.
        return baseWidth + letterSpacing * text.length
    }
    
    private static wrapNormal(
        text: string,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): string[] {
        const words = text.split(/\s+/).filter(w => w.length > 0)
        const lines: string[] = []
        let currentLine = ""
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine)
                currentLine = word
            } else {
                currentLine = testLine
            }
        }
        
        if (currentLine) {
            lines.push(currentLine)
        }
        
        return lines.length > 0 ? lines : [""]
    }
    
    private static wrapPreservingWhitespace(
        text: string,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): string[] {
        const lines: string[] = []
        let currentLine = ""
        
        for (let i = 0; i < text.length; i++) {
            const testLine = currentLine + text[i]
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine)
                currentLine = text[i]
            } else {
                currentLine = testLine
            }
        }
        
        if (currentLine) {
            lines.push(currentLine)
        }
        
        return lines.length > 0 ? lines : [""]
    }
    
    private static wrapText(
        text: string,
        maxWidth: number,
        font: string,
        whiteSpace: string
    ): string[] | null {
        if (whiteSpace === "nowrap" || whiteSpace === "pre") {
            return [text]
        }
        
        const ctx = this.getCanvasContext()
        ctx.font = font
        
        // Font not yet loaded into canvas — signal caller not to cache
        if (!ctx.font.includes(font.split(",")[0].split(" ").pop()!.trim())) {
            return null
        }
        
        const lines: string[] = []
        for (const paragraph of text.split("\n")) {
            if (whiteSpace === "pre-wrap") {
                lines.push(...this.wrapPreservingWhitespace(paragraph, maxWidth, ctx))
            } else {
                lines.push(...this.wrapNormal(paragraph, maxWidth, ctx))
            }
        }
        return lines
    }
    
    private static calculatePlainTextSizeViaCanvas(
        styles: TextMeasurementStyle,
        text: string,
        constrainingWidth?: number
    ): { width: number; height: number } {
        const paddingH = styles.paddingLeft + styles.paddingRight
        const paddingV = styles.paddingTop  + styles.paddingBottom
        
        const transformedText = this.applyTextTransform(text, styles.textTransform)
        
        if (styles.whiteSpace === "nowrap" || styles.whiteSpace === "pre" || !constrainingWidth) {
            const width  = this.measureTextWidth(transformedText, styles.font, styles.letterSpacing) + paddingH
            const height = styles.lineHeight + paddingV
            return { width, height }
        }
        
        const availableWidth = constrainingWidth - paddingH
        const lines = this.wrapText(transformedText, availableWidth, styles.font, styles.whiteSpace)
        
        // null means the font hasn't been loaded into the canvas yet
        if (!lines) {
            return { width: NaN, height: NaN }
        }
        
        const width  = Math.max(...lines.map(l => this.measureTextWidth(l, styles.font, styles.letterSpacing))) + paddingH
        const height = lines.length * styles.lineHeight + paddingV
        return { width, height }
    }
    
    // ─── Route between pretext and hand-rolled canvas ─────────────────────────────
    
    private static calculatePlainTextSize(
        element: HTMLElement,
        text: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        const styles = this.getElementStyles(element, providedStyles)
        
        // Use pretext when available AND letter-spacing is zero.
        // pretext does not model letter-spacing, so non-zero values require the
        // hand-rolled canvas path for correctness.
        if (_pretextPrepare !== null && _pretextLayout !== null && styles.letterSpacing === 0) {
            return this.calculatePlainTextSizeViaPretext(styles, text, constrainingWidth)
        }
        
        return this.calculatePlainTextSizeViaCanvas(styles, text, constrainingWidth)
    }
    
    // ─── DOM slow path (complex HTML) ─────────────────────────────────────────────
    
    private static measureWithDOM(
        element: HTMLElement,
        content: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        const measureEl = this.getMeasurementElement()
        const styles    = this.getElementStyles(element, providedStyles)
        
        measureEl.style.font          = styles.font
        measureEl.style.lineHeight    = styles.lineHeight + "px"
        measureEl.style.whiteSpace    = styles.whiteSpace
        measureEl.style.padding       = `${styles.paddingTop}px ${styles.paddingRight}px ${styles.paddingBottom}px ${styles.paddingLeft}px`
        measureEl.style.letterSpacing = styles.letterSpacing ? styles.letterSpacing + "px" : ""
        measureEl.style.textTransform = styles.textTransform || ""
        
        if (constrainingWidth) {
            measureEl.style.width    = constrainingWidth + "px"
            measureEl.style.maxWidth = constrainingWidth + "px"
        } else {
            measureEl.style.width    = "auto"
            measureEl.style.maxWidth = "none"
        }
        
        if (constrainingHeight) {
            measureEl.style.height    = constrainingHeight + "px"
            measureEl.style.maxHeight = constrainingHeight + "px"
        } else {
            measureEl.style.height    = "auto"
            measureEl.style.maxHeight = "none"
        }
        
        measureEl.innerHTML = content
        
        if (!measureEl.parentElement) {
            document.body.appendChild(measureEl)
        }
        
        const rect = measureEl.getBoundingClientRect()
        return {
            width:  rect.width  || measureEl.scrollWidth,
            height: rect.height || measureEl.scrollHeight
        }
    }
    
    // ─── Public API ───────────────────────────────────────────────────────────────
    
    static getElementStyles(element: HTMLElement, providedStyles?: TextMeasurementStyle): TextMeasurementStyle {
        if (providedStyles) {
            return providedStyles
        }
        
        const cacheKey = this.getSemanticCacheKey(element)
        const cached   = this.globalStyleCache.get(cacheKey)
        if (cached) {
            return cached
        }
        
        const computed = window.getComputedStyle(element)
        const fontSize = parseFloat(computed.fontSize)
        
        const styles: TextMeasurementStyle = {
            font: [
                computed.fontStyle   || "normal",
                computed.fontVariant || "normal",
                computed.fontWeight  || "normal",
                computed.fontSize,
                computed.fontFamily  || "sans-serif"
            ].join(" "),
            fontSize,
            lineHeight:    this.parseLineHeight(computed.lineHeight, fontSize),
            whiteSpace:    computed.whiteSpace,
            paddingLeft:   parseFloat(computed.paddingLeft)   || 0,
            paddingRight:  parseFloat(computed.paddingRight)  || 0,
            paddingTop:    parseFloat(computed.paddingTop)    || 0,
            paddingBottom: parseFloat(computed.paddingBottom) || 0,
            letterSpacing: parseFloat(computed.letterSpacing) || 0,
            textTransform: computed.textTransform || "none"
        }
        
        this.globalStyleCache.set(cacheKey, styles)
        return styles
    }
    
    /**
     * Calculate intrinsic content size for text.
     *
     * Routing:
     *   plain text, no letter-spacing, pretext available  → pretext (best accuracy + speed)
     *   plain text, letter-spacing or no pretext          → hand-rolled canvas
     *   simple inline HTML (<b>/<i>/etc.)                 → same as above, tags stripped first
     *   complex HTML                                       → DOM measurement
     */
    static calculateTextSize(
        element: HTMLElement,
        content: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        if (!content || content.length === 0) {
            const styles = this.getElementStyles(element, providedStyles)
            return {
                width:  styles.paddingLeft + styles.paddingRight,
                height: styles.paddingTop  + styles.paddingBottom
            }
        }
        
        const isPlain   = this.isPlainText(content)
        const hasSimple = this.hasSimpleFormatting(content)
        
        if (isPlain) {
            return this.calculatePlainTextSize(element, content, constrainingWidth, constrainingHeight, providedStyles)
        }
        
        if (hasSimple) {
            const plainText = content.replace(/<[^>]+>/g, "")
            return this.calculatePlainTextSize(element, plainText, constrainingWidth, constrainingHeight, providedStyles)
        }
        
        return this.measureWithDOM(element, content, constrainingWidth, constrainingHeight, providedStyles)
    }
    
    /**
     * Clears all caches (prepared text, style, element, and canvas context).
     * Call on documentFontsDidLoad or app cleanup.
     */
    static clearCaches(): void {
        this._preparedCache.clear()
        this.globalStyleCache.clear()
        this.elementToCacheKey = new WeakMap()
        this._context = null
        this._canvas  = null
    }
    
    /**
     * Invalidate cached styles for a specific element.
     * Also clears the pretext prepared-text cache conservatively since the
     * font string may have changed.
     */
    static invalidateElement(element: HTMLElement): void {
        const cacheKey = this.elementToCacheKey.get(element)
        if (cacheKey) {
            this.globalStyleCache.delete(cacheKey)
            this.elementToCacheKey.delete(element)
        }
        // Clear the prepared cache — font may have changed and we no longer know
        // which entries are stale. This only fires on style changes, not text changes.
        this._preparedCache.clear()
    }
    
    /**
     * Invalidate cache for elements with a specific CSS class.
     */
    static invalidateClass(className: string): void {
        for (const [key] of this.globalStyleCache.entries()) {
            if (key.includes(className)) {
                this.globalStyleCache.delete(key)
            }
        }
        this._preparedCache.clear()
    }
    
    /**
     * Pre-warm the style cache by reading styles from representative elements.
     */
    static prewarmCache(elements: HTMLElement[]): void {
        for (const el of elements) {
            this.getElementStyles(el)
        }
    }
    
    /**
     * Clean up all resources (call on app teardown).
     */
    static cleanup(): void {
        if (this.measurementElement?.parentElement) {
            document.body.removeChild(this.measurementElement)
        }
        this.measurementElement = null
        this.clearCaches()
    }
}

// Extension interface — unchanged, consumed by d.ts declarations
export interface UITextViewMeasurementMethods {
    intrinsicContentSizeEfficient(
        constrainingWidth?: number,
        constrainingHeight?: number
    ): { width: number; height: number }
}
