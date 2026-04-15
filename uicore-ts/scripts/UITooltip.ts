import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { UIView } from "./UIView"


/**
 * UITooltip
 *
 * Framework-level mouse-following tooltip singleton.
 *
 * The default implementation uses a plain HTML element for its content —
 * no UIView layout system involved. This keeps the base tooltip simple and
 * allocation-free.
 *
 * To use a UIView-based content view instead (e.g. for complex layouts),
 * override createContentView() to return a UIView subclass. The sizing and
 * positioning logic in calculateAndSetViewFrame works identically for both
 * cases since it only calls intrinsicContentHeight/Width on the content view.
 *
 * Subclass to provide app-level styling:
 *   - Override createContentView() to return a custom UIView (optional)
 *   - Override applyStyles()        to style the default plain-HTML content
 *   - Set UITooltip.sharedInstance  to your instance at app startup
 *
 * Usage:
 *   UITooltip.sharedInstance.attach(someView, "Tooltip text")
 *   UITooltip.sharedInstance.detach(someView)
 */
export class UITooltip {
    
    // ── Singleton ─────────────────────────────────────────────────────────────
    
    static sharedInstance: UITooltip = new UITooltip()
    
    // ── Positioning config ────────────────────────────────────────────────────
    
    offsetX: number = 14
    offsetY: number = 20
    maxWidth: number = 320
    
    // ── Content view ──────────────────────────────────────────────────────────
    
    /**
     * The view that is measured and positioned by calculateAndSetViewFrame.
     * In the default implementation this is a lightweight UIView wrapper around
     * a plain HTML label element. Subclasses may replace it with any UIView.
     */
    readonly contentView: UIView
    
    // ── Private state ─────────────────────────────────────────────────────────
    
    private _isVisible: boolean = false
    private _mouseX: number = 0
    private _mouseY: number = 0
    private _isInitialized: boolean = false
    
    /** The plain HTML label element used by the default implementation. */
    protected _labelElement?: HTMLElement
    
    private _attachedHandlers = new WeakMap<UIView, {
        enter: (sender: UIView, event: Event) => void
        leave: (sender: UIView, event: Event) => void
    }>()
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    constructor() {
        const { contentView, labelElement } = this.createContentView()
        this.contentView = contentView
        this._labelElement = labelElement
        
        const element = this.contentView.viewHTMLElement
        element.style.position = "fixed"
        element.style.pointerEvents = "none"
        element.style.display = "none"
        
        this.contentView.calculateAndSetViewFrame = () => {
            this._recalculateFrame()
        }
        
        this.applyStyles()
    }
    
    // ── Override points ───────────────────────────────────────────────────────
    
    /**
     * Creates the content view and optionally a plain HTML label element.
     *
     * Default: returns a UIView containing a single <span> whose text is set
     * directly via innerHTML. The label element is returned so that setText()
     * can update it without going through the UIView system.
     *
     * Override to return a UIView-layout-based content view. In that case,
     * return labelElement: undefined — setText() will call the UIView's own
     * text-setting mechanism instead (override setText() too if needed).
     */
    protected createContentView(): { contentView: UIView; labelElement?: HTMLElement } {
        const labelElement = document.createElement("span")
        labelElement.style.display = "block"
        labelElement.style.whiteSpace = "pre-wrap"
        labelElement.style.wordBreak = "break-word"
        labelElement.style.lineHeight = "1.4"
        labelElement.style.color = "#ffffff"
        labelElement.style.fontSize = "12px"
        labelElement.style.fontWeight = "400"
        // Padding is applied to the label element so it sits inset from the
        // container edges. The measurement in _measureHTMLLabelSize accounts
        // for this by adding padding * 2 to the measured width and height.
        const paddingPx = `${(UICore.main?.paddingLength ?? 16) * 0.5}px`
        labelElement.style.padding = paddingPx
        labelElement.style.boxSizing = "border-box"
        
        const contentView = new UIView()
        contentView.configureWithObject({
            backgroundColor: new UIColor("rgba(30, 30, 40, 0.96)"),
            style: {
                borderRadius: "5px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
            }
        })
        contentView.viewHTMLElement.appendChild(labelElement)
        
        return { contentView, labelElement }
    }
    
    /**
     * Apply styles to the default plain-HTML content view.
     * Only called when using the default createContentView() implementation.
     * Override alongside createContentView() if you provide a UIView-based
     * content view that handles its own styling.
     */
    protected applyStyles() {}
    
    /**
     * Sets the tooltip text. Override if using a UIView-based content view
     * that exposes its own text-setting API.
     */
    setText(text: string) {
        if (this._labelElement) {
            this._labelElement.textContent = text
        }
    }
    
    // ── Sizing — two-pass ─────────────────────────────────────────────────────
    
    /**
     * Returns the display size for the content view given the current text.
     *
     * For UIView-based content: delegates to intrinsicContentHeight/Width.
     * For plain-HTML content: measures the label element directly.
     *
     * Two passes:
     *   1. Height at maxWidth  — determines how the text wraps
     *   2. Width  at that height — finds the minimum width that fits the
     *      wrapped text, so short text doesn't leave empty space on the right
     */
    protected measureContentSize(): { width: number; height: number } {
        if (this._labelElement) {
            return this._measureHTMLLabelSize()
        }
        const height = this.contentView.intrinsicContentHeight(this.maxWidth)
        const width = Math.min(this.contentView.intrinsicContentWidth(height), this.maxWidth)
        return { width, height }
    }
    
    private _measureHTMLLabelSize(): { width: number; height: number } {
        const label = this._labelElement!
        const prevMaxWidth = label.style.maxWidth
        const prevWidth = label.style.width
        
        // Force into DOM briefly if not connected
        let wasDetached = false
        if (!label.isConnected) {
            document.body.appendChild(label)
            wasDetached = true
        }
        
        // Pass 1: constrain to maxWidth to get the wrapped height.
        label.style.maxWidth = `${this.maxWidth}px`
        label.style.width = ""
        const wrappedHeight = label.scrollHeight
        
        // Pass 2: set both width:fit-content and max-width:innerMax together.
        // The browser reports the minimum width that fits the content without
        // exceeding the same constraint used in pass 1 — giving us the width
        // of the longest wrapped line rather than the full single-line width.
        label.style.maxWidth = `${this.maxWidth}px`
        label.style.width = "fit-content"
        const naturalWidth = label.getBoundingClientRect().width
        
        if (wasDetached) {
            document.body.removeChild(label)
        }
        
        label.style.maxWidth = prevMaxWidth
        label.style.width = prevWidth
        
        // The label has CSS padding applied (box-sizing: border-box), so
        // scrollHeight and getBoundingClientRect already include it.
        return {
            width: Math.min(Math.ceil(naturalWidth), this.maxWidth),
            height: wrappedHeight
        }
    }
    
    private get core() {
        return UICore.main
    }
    
    // ── Frame calculation ─────────────────────────────────────────────────────
    
    private _recalculateFrame() {
        const { width, height } = this.measureContentSize()
        
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const margin = 8
        
        let left = this._mouseX + this.offsetX
        let top = this._mouseY + this.offsetY
        
        if (left + width > viewportWidth - margin) {
            left = this._mouseX - width - this.offsetX
        }
        if (top + height > viewportHeight - margin) {
            top = this._mouseY - height - this.offsetY * 0.5
        }
        
        left = Math.max(margin, left)
        top = Math.max(margin, top)
        
        this.contentView.setFrame(
            this.contentView.frame
                .rectangleWithX(Math.round(left))
                .rectangleWithY(Math.round(top))
                .rectangleWithWidth(width)
                .rectangleWithHeight(height),
            99999
        )
    }
    
    // ── Init ──────────────────────────────────────────────────────────────────
    
    private _ensureInitialized() {
        if (this._isInitialized) {
            return
        }
        this._isInitialized = true
        
        this.contentView.addedAsSubviewToView(UICore.main.rootViewController.view)
        
        window.addEventListener("mousemove", (event: MouseEvent) => {
            this._mouseX = event.clientX
            this._mouseY = event.clientY
            if (this._isVisible) {
                this.contentView.calculateAndSetViewFrame()
            }
        }, { passive: true })
    }
    
    // ── Public API ────────────────────────────────────────────────────────────
    
    show(text: string) {
        this._ensureInitialized()
        this.setText(text)
        this.contentView.viewHTMLElement.style.display = "block"
        if (!this._labelElement) {
            // UIView-based content needs a layout pass before measuring
            this.contentView.setNeedsLayout()
            UIView.layoutViewsIfNeeded()
        }
        this._isVisible = true
        this.contentView.calculateAndSetViewFrame()
    }
    
    hide() {
        this._isVisible = false
        this.contentView.viewHTMLElement.style.display = "none"
    }
    
    // ── Attach / detach ───────────────────────────────────────────────────────
    
    attach(view: UIView, text: string) {
        this.detach(view)
        
        const enterHandler = (_sender: UIView, _event: Event) => {
            this.show(text)
        }
        const leaveHandler = (_sender: UIView, _event: Event) => {
            this.hide()
        }
        
        view.controlEventTargetAccumulator.PointerHover = enterHandler
        view.controlEventTargetAccumulator.PointerLeave = leaveHandler
        
        this._attachedHandlers.set(view, { enter: enterHandler, leave: leaveHandler })
    }
    
    detach(view: UIView) {
        const handlers = this._attachedHandlers.get(view)
        if (!handlers) {
            return
        }
        
        view.removeTargetForControlEvent(UIView.controlEvent.PointerHover, handlers.enter)
        view.removeTargetForControlEvent(UIView.controlEvent.PointerLeave, handlers.leave)
        
        this._attachedHandlers.delete(view)
        
        if (this._isVisible) {
            this.hide()
        }
    }
    
}
