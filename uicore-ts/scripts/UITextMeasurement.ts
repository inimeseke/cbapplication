// UITextMeasurement.ts - Efficient text measurement without DOM reflows

export interface TextMeasurementStyle {
    font: string;
    fontSize: number;
    lineHeight: number;
    whiteSpace: string;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
}

export class UITextMeasurement {
    private static canvas: HTMLCanvasElement | null = null;
    private static context: CanvasRenderingContext2D | null = null;
    
    // Global cache for style objects using semantic cache key
    private static globalStyleCache = new Map<string, TextMeasurementStyle>();
    
    // Per-element cache to map element -> cache key
    private static elementToCacheKey = new WeakMap<HTMLElement, string>();
    
    // Temporary element for complex HTML measurements (reused to avoid allocations)
    private static measurementElement: HTMLDivElement | null = null;
    
    /**
     * Generate a cache key based only on styles that affect text measurement
     * Ignores position, color, transform, etc.
     */
    private static generateStyleCacheKey(computed: CSSStyleDeclaration): string {
        // Only include properties that affect text layout
        const relevantProps = [
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
        ];
        
        // Create a hash-like key from relevant properties
        return relevantProps.join('|');
    }
    
    /**
     * Extract cache key from element's classList
     * Elements with same classes likely have same text measurement styles
     */
    private static getSemanticCacheKey(element: HTMLElement): string {
        // Check if we already computed a cache key for this element
        const existingKey = this.elementToCacheKey.get(element);
        if (existingKey) {
            return existingKey;
        }
        
        // Try to use class-based caching first (fastest)
        const classList = Array.from(element.classList).sort().join(' ');
        const tagName = element.tagName.toLowerCase();
        
        // Semantic key based on tag + classes
        const semanticKey = `${tagName}::${classList}`;
        
        // Check if we have styles for this semantic key
        if (this.globalStyleCache.has(semanticKey)) {
            this.elementToCacheKey.set(element, semanticKey);
            return semanticKey;
        }
        
        // If not cached, compute and use style-based key
        const computed = window.getComputedStyle(element);
        const styleCacheKey = this.generateStyleCacheKey(computed);
        
        // Use the style-based key
        this.elementToCacheKey.set(element, styleCacheKey);
        
        return styleCacheKey;
    }
    
    /**
     * Get or create the canvas context for text measurement
     */
    private static getContext(): CanvasRenderingContext2D {
        if (!this.context) {
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d')!;
        }
        return this.context;
    }
    
    /**
     * Detect if content is plain text or complex HTML
     */
    private static isPlainText(content: string): boolean {
        // Check for HTML tags (excluding simple formatting like <b>, <i>, <span>)
        const hasComplexHTML = /<(?!\/?(b|i|em|strong|span|br)\b)[^>]+>/i.test(content);
        return !hasComplexHTML;
    }
    
    /**
     * Check if content has only simple inline formatting
     */
    private static hasSimpleFormatting(content: string): boolean {
        // Only <b>, <i>, <strong>, <em>, <span> with inline styles
        const simpleTagPattern = /^[^<]*(?:<\/?(?:b|i|em|strong|span)(?:\s+style="[^"]*")?>[^<]*)*$/i;
        return simpleTagPattern.test(content);
    }
    
    /**
     * Get or create measurement element for complex HTML
     */
    private static getMeasurementElement(): HTMLDivElement {
        if (!this.measurementElement) {
            this.measurementElement = document.createElement('div');
            this.measurementElement.style.cssText = `
                position: absolute;
                visibility: hidden;
                pointer-events: none;
                top: -9999px;
                left: -9999px;
                width: auto;
                height: auto;
            `;
        }
        return this.measurementElement;
    }
    
    /**
     * Fast measurement using DOM (but optimized to minimize reflows)
     */
    private static measureWithDOM(
        element: HTMLElement,
        content: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        const measureEl = this.getMeasurementElement();
        const styles = this.getElementStyles(element, providedStyles);
        
        // Copy relevant styles
        measureEl.style.font = styles.font;
        measureEl.style.lineHeight = styles.lineHeight + 'px';
        measureEl.style.whiteSpace = styles.whiteSpace;
        measureEl.style.padding = `${styles.paddingTop}px ${styles.paddingRight}px ${styles.paddingBottom}px ${styles.paddingLeft}px`;
        
        // Set constraints
        if (constrainingWidth) {
            measureEl.style.width = constrainingWidth + 'px';
            measureEl.style.maxWidth = constrainingWidth + 'px';
        } else {
            measureEl.style.width = 'auto';
            measureEl.style.maxWidth = 'none';
        }
        
        if (constrainingHeight) {
            measureEl.style.height = constrainingHeight + 'px';
            measureEl.style.maxHeight = constrainingHeight + 'px';
        } else {
            measureEl.style.height = 'auto';
            measureEl.style.maxHeight = 'none';
        }
        
        // Set content
        measureEl.innerHTML = content;
        
        // Add to DOM only if not already there
        if (!measureEl.parentElement) {
            document.body.appendChild(measureEl);
        }
        
        // Single reflow for both measurements
        const rect = measureEl.getBoundingClientRect();
        const result = {
            width: rect.width || measureEl.scrollWidth,
            height: rect.height || measureEl.scrollHeight
        };
        
        return result;
    }
    
    /**
     * Get or extract styles from element (with smart global caching)
     * Returns cached styles if available, otherwise computes once and caches globally
     */
    private static getElementStyles(element: HTMLElement, providedStyles?: TextMeasurementStyle): TextMeasurementStyle {
        // Use provided styles if available (avoids getComputedStyle entirely)
        if (providedStyles) {
            return providedStyles;
        }
        
        // Get semantic cache key
        const cacheKey = this.getSemanticCacheKey(element);
        
        // Check global cache
        const cached = this.globalStyleCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        
        // Compute once and cache globally (this is the only getComputedStyle call)
        const computed = window.getComputedStyle(element);
        const fontSize = parseFloat(computed.fontSize);
        
        const styles: TextMeasurementStyle = {
            font: [
                computed.fontStyle,
                computed.fontVariant,
                computed.fontWeight,
                computed.fontSize,
                computed.fontFamily
            ].join(' '),
            fontSize: fontSize,
            lineHeight: this.parseLineHeight(computed.lineHeight, fontSize),
            whiteSpace: computed.whiteSpace,
            paddingLeft: parseFloat(computed.paddingLeft) || 0,
            paddingRight: parseFloat(computed.paddingRight) || 0,
            paddingTop: parseFloat(computed.paddingTop) || 0,
            paddingBottom: parseFloat(computed.paddingBottom) || 0
        };
        
        this.globalStyleCache.set(cacheKey, styles);
        return styles;
    }
    
    /**
     * Parse line height from computed style
     */
    private static parseLineHeight(lineHeight: string, fontSize: number): number {
        if (lineHeight === 'normal') {
            return fontSize * 1.2;
        }
        
        if (lineHeight.endsWith('px')) {
            return parseFloat(lineHeight);
        }
        
        const numericLineHeight = parseFloat(lineHeight);
        if (!isNaN(numericLineHeight)) {
            return fontSize * numericLineHeight;
        }
        
        return fontSize * 1.2;
    }
    
    /**
     * Measure text width using Canvas API
     */
    static measureTextWidth(text: string, font: string): number {
        const ctx = this.getContext();
        ctx.font = font;
        return ctx.measureText(text).width;
    }
    
    /**
     * Split text into lines based on width constraint
     */
    private static wrapText(
        text: string,
        maxWidth: number,
        font: string,
        whiteSpace: string
    ): string[] {
        // No wrapping needed
        if (whiteSpace === 'nowrap' || whiteSpace === 'pre') {
            return [text];
        }
        
        const ctx = this.getContext();
        ctx.font = font;
        
        const lines: string[] = [];
        const paragraphs = text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (whiteSpace === 'pre-wrap') {
                // Preserve whitespace but wrap at maxWidth
                lines.push(...this.wrapPreservingWhitespace(paragraph, maxWidth, ctx));
            } else {
                // Normal wrapping (collapse whitespace)
                lines.push(...this.wrapNormal(paragraph, maxWidth, ctx));
            }
        }
        
        return lines;
    }
    
    private static wrapNormal(
        text: string,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): string[] {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
    }
    
    private static wrapPreservingWhitespace(
        text: string,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): string[] {
        const lines: string[] = [];
        let currentLine = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
    }
    
    /**
     * Calculate intrinsic content size for text - SMART METHOD
     * Automatically chooses the most efficient measurement technique
     */
    static calculateTextSize(
        element: HTMLElement,
        content: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        // Empty content
        if (!content || content.length === 0) {
            const styles = this.getElementStyles(element, providedStyles);
            return {
                width: styles.paddingLeft + styles.paddingRight,
                height: styles.paddingTop + styles.paddingBottom
            };
        }
        
        // Check complexity of content
        const isPlain = this.isPlainText(content);
        const hasSimple = this.hasSimpleFormatting(content);
        
        // Strategy 1: Pure canvas for plain text (fastest)
        if (isPlain) {
            return this.calculatePlainTextSize(
                element,
                content,
                constrainingWidth,
                constrainingHeight,
                providedStyles
            );
        }
        
        // Strategy 2: Optimized DOM for simple formatting (fast)
        if (hasSimple) {
            // For simple formatting, we can still use canvas but need to strip tags
            const plainText = content.replace(/<[^>]+>/g, '');
            return this.calculatePlainTextSize(
                element,
                plainText,
                constrainingWidth,
                constrainingHeight,
                providedStyles
            );
        }
        
        // Strategy 3: DOM measurement for complex HTML (slower but accurate)
        return this.measureWithDOM(
            element,
            content,
            constrainingWidth,
            constrainingHeight,
            providedStyles
        );
    }
    
    /**
     * Calculate size for plain text using canvas (no HTML)
     */
    private static calculatePlainTextSize(
        element: HTMLElement,
        text: string,
        constrainingWidth?: number,
        constrainingHeight?: number,
        providedStyles?: TextMeasurementStyle
    ): { width: number; height: number } {
        const styles = this.getElementStyles(element, providedStyles);
        
        // Adjust constraining width for padding
        const availableWidth = constrainingWidth
                               ? constrainingWidth - styles.paddingLeft - styles.paddingRight
                               : Infinity;
        
        // Calculate dimensions
        let width: number;
        let height: number;
        
        if (styles.whiteSpace === 'nowrap' || styles.whiteSpace === 'pre' || !constrainingWidth) {
            // Single line or no width constraint
            width = this.measureTextWidth(text, styles.font) + styles.paddingLeft + styles.paddingRight;
            height = styles.lineHeight + styles.paddingTop + styles.paddingBottom;
        } else {
            // Multi-line text
            const lines = this.wrapText(text, availableWidth, styles.font, styles.whiteSpace);
            
            // Find the widest line
            width = Math.max(
                ...lines.map(line => this.measureTextWidth(line, styles.font))
            ) + styles.paddingLeft + styles.paddingRight;
            
            height = (lines.length * styles.lineHeight) + styles.paddingTop + styles.paddingBottom;
        }
        
        return { width, height };
    }
    
    /**
     * Clear all caches (call when fonts change or for cleanup)
     */
    static clearCaches(): void {
        this.globalStyleCache.clear();
        this.elementToCacheKey = new WeakMap();
    }
    
    /**
     * Invalidate cached styles for a specific element
     */
    static invalidateElement(element: HTMLElement): void {
        const cacheKey = this.elementToCacheKey.get(element);
        if (cacheKey) {
            this.globalStyleCache.delete(cacheKey);
            this.elementToCacheKey.delete(element);
        }
    }
    
    /**
     * Invalidate cache for elements with specific class
     * Useful when you change a CSS class definition
     */
    static invalidateClass(className: string): void {
        // Clear all cache keys that contain this class
        for (const [key] of this.globalStyleCache.entries()) {
            if (key.includes(className)) {
                this.globalStyleCache.delete(key);
            }
        }
    }
    
    /**
     * Pre-warm the cache by measuring a representative element
     * Useful at app startup to avoid first-paint delays
     */
    static prewarmCache(elements: HTMLElement[]): void {
        elements.forEach(el => {
            this.getElementStyles(el);
        });
    }
    
    /**
     * Clean up measurement element (call on app cleanup)
     */
    static cleanup(): void {
        if (this.measurementElement && this.measurementElement.parentElement) {
            document.body.removeChild(this.measurementElement);
        }
        this.measurementElement = null;
        this.canvas = null;
        this.context = null;
        this.clearCaches();
    }
}

// Extension methods to add to UITextView
export interface UITextViewMeasurementMethods {
    intrinsicContentSizeEfficient(
        constrainingWidth?: number,
        constrainingHeight?: number
    ): { width: number; height: number };
}

// ==================== INTEGRATION CODE ====================
// Add these methods to UITextView class:

/*
 // In UITextView class:
 
 // Add this property to track content complexity and cached styles
 private _useFastMeasurement: boolean | undefined;
 private _cachedMeasurementStyles: TextMeasurementStyle | undefined;
 
 // Call this when styles change (fontSize, padding, etc.)
 private _invalidateMeasurementStyles(): void {
 this._cachedMeasurementStyles = undefined;
 UITextMeasurement.invalidateElement(this.viewHTMLElement);
 this._intrinsicSizesCache = {};
 }
 
 // Extract styles ONCE and cache them (avoids getComputedStyle)
 private _getMeasurementStyles(): TextMeasurementStyle {
 if (this._cachedMeasurementStyles) {
 return this._cachedMeasurementStyles;
 }
 
 // Only call getComputedStyle once and cache the result
 const computed = window.getComputedStyle(this.viewHTMLElement);
 const fontSize = parseFloat(computed.fontSize);
 
 this._cachedMeasurementStyles = {
 font: [
 computed.fontStyle,
 computed.fontVariant,
 computed.fontWeight,
 computed.fontSize,
 computed.fontFamily
 ].join(' '),
 fontSize: fontSize,
 lineHeight: this._parseLineHeight(computed.lineHeight, fontSize),
 whiteSpace: computed.whiteSpace,
 paddingLeft: parseFloat(computed.paddingLeft) || 0,
 paddingRight: parseFloat(computed.paddingRight) || 0,
 paddingTop: parseFloat(computed.paddingTop) || 0,
 paddingBottom: parseFloat(computed.paddingBottom) || 0
 };
 
 return this._cachedMeasurementStyles;
 }
 
 private _parseLineHeight(lineHeight: string, fontSize: number): number {
 if (lineHeight === 'normal') {
 return fontSize * 1.2;
 }
 if (lineHeight.endsWith('px')) {
 return parseFloat(lineHeight);
 }
 const numericLineHeight = parseFloat(lineHeight);
 if (!isNaN(numericLineHeight)) {
 return fontSize * numericLineHeight;
 }
 return fontSize * 1.2;
 }
 
 // Override the intrinsic size method
 override intrinsicContentSizeWithConstraints(
 constrainingHeight: number = 0,
 constrainingWidth: number = 0
 ): UIRectangle {
 const cacheKey = "h_" + constrainingHeight + "__w_" + constrainingWidth;
 const cachedResult = this._intrinsicSizesCache[cacheKey];
 if (cachedResult) {
 return cachedResult;
 }
 
 // Determine measurement strategy
 const shouldUseFastPath = this._useFastMeasurement ?? this._shouldUseFastMeasurement();
 
 let result: UIRectangle;
 
 if (shouldUseFastPath) {
 // Fast path: canvas-based measurement with pre-extracted styles
 const styles = this._getMeasurementStyles();
 const size = UITextMeasurement.calculateTextSize(
 this.viewHTMLElement,
 this.text || this.innerHTML,
 constrainingWidth || undefined,
 constrainingHeight || undefined,
 styles  // Pass pre-computed styles to avoid getComputedStyle!
 );
 result = new UIRectangle(0, 0, size.height, size.width);
 } else {
 // Fallback: original DOM-based measurement for complex content
 result = super.intrinsicContentSizeWithConstraints(constrainingHeight, constrainingWidth);
 }
 
 this._intrinsicSizesCache[cacheKey] = result.copy();
 return result;
 }
 
 // Helper to determine if we can use fast measurement
 private _shouldUseFastMeasurement(): boolean {
 const content = this.text || this.innerHTML;
 
 // If using dynamic innerHTML with parameters, use DOM measurement
 if (this._innerHTMLKey || this._localizedTextObject) {
 return false;
 }
 
 // Check for notification badges
 if (this.notificationAmount > 0) {
 return false; // Has span with colored text
 }
 
 // Check content complexity
 const hasComplexHTML = /<(?!\/?(b|i|em|strong|span|br)\b)[^>]+>/i.test(content);
 
 return !hasComplexHTML;
 }
 
 // Optional: Allow manual override for specific instances
 setUseFastMeasurement(useFast: boolean): void {
 this._useFastMeasurement = useFast;
 this._intrinsicSizesCache = {};
 }
 
 // Optional: Force re-evaluation of measurement strategy
 invalidateMeasurementStrategy(): void {
 this._useFastMeasurement = undefined;
 this._invalidateMeasurementStyles();
 }
 
 // Update fontSize setter to invalidate cached styles
 override set fontSize(fontSize: number) {
 this.style.fontSize = "" + fontSize + "pt";
 this._intrinsicHeightCache = new UIObject() as any;
 this._intrinsicWidthCache = new UIObject() as any;
 this._invalidateMeasurementStyles();  // Invalidate when font changes
 }
 
 // Update the text setter to invalidate measurement strategy
 override set text(text: string) {
 this._text = text;
 
 var notificationText = "";
 
 if (this.notificationAmount) {
 notificationText = "<span style=\"color: " + UITextView.notificationTextColor.stringValue + ";\">" +
 (" (" + this.notificationAmount + ")").bold() + "</span>";
 }
 
 if (this.viewHTMLElement.innerHTML != this.textPrefix + text + this.textSuffix + notificationText) {
 this.viewHTMLElement.innerHTML = this.textPrefix + FIRST(text, "") + this.textSuffix + notificationText;
 }
 
 if (this.changesOften) {
 this._intrinsicHeightCache = new UIObject() as any;
 this._intrinsicWidthCache = new UIObject() as any;
 }
 
 // Invalidate measurement strategy when text changes significantly
 this._useFastMeasurement = undefined;
 this._intrinsicSizesCache = {};
 
 this.setNeedsLayout();
 }
 */
