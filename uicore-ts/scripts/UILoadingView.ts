import { UIColor } from "./UIColor"
import { IS_DEFINED, NO, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { IUILoadingView, UIView } from "./UIView"

export class UILoadingView extends UIView implements IUILoadingView {
    
    private spinnerView: UIView
    private isPulsing: boolean = NO
    private _theme: "light" | "dark" = "light"
    
    override set loading(loading: boolean) {
        // cannot set loading on loading view
    }
    
    override get loading() {
        return NO
    }
    
    /**
     * Sets the visual theme of the loader.
     * 'light' (default): Suitable for light backgrounds. Dark spinner, white-ish overlay.
     * 'dark': Suitable for dark backgrounds. Light spinner, black-ish overlay.
     */
    set theme(theme: "light" | "dark") {
        this._theme = theme
        this.updateColors()
    }
    
    get theme() {
        return this._theme
    }
    
    constructor(elementID?: string) {
        super(elementID)
        
        // 1. Initialize Spinner (Custom Bootstrap-like implementation)
        this.spinnerView = new UIView(this.elementID + "_Spinner")
        this.spinnerView.addStyleClass("UILoadingViewSpinnerContainer")
        this.addSubview(this.spinnerView);
        
        // 2. Configure defaults
        (this as UILoadingView).configureWithObject({
            backgroundColor: UIColor.transparentColor,
            userInteractionEnabled: YES, // Blocks touches to underlying view
            pausesPointerEvents: YES,     // Prevents events from passing through
            style: { height: "100%", width: "100%" }
        })
        
        // 3. Initialize CSS
        this.initViewStyleSelectors()
        this.updateColors()
    }
    
    
    override initViewStyleSelectors() {
        super.initViewStyleSelectors()
        
        // 1. Pulsing Animation
        const pulseKeyframe = "UILoadingViewPulse"
        UIView.injectCSS(`
            @keyframes ${pulseKeyframe} {
                0% { background-color: rgba(0, 0, 0, 0.15); }
                50% { background-color: rgba(0, 0, 0, 0.35); }
                100% { background-color: rgba(0, 0, 0, 0.15); }
            }
        `, "UILoadingViewPulseCSS")
        UIView.createStyleSelector(".UILoadingViewPulsing", `animation: ${pulseKeyframe} 1.2s infinite ease-in-out;`)
        
        // 2. Spinner Rotation (Bootstrap style)
        const spinKeyframe = "UILoadingViewSpin"
        UIView.injectCSS(`
            @keyframes ${spinKeyframe} {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
            }
        `, "UILoadingViewSpinCSS")
        
        // We apply the animation to the ::after pseudo-element
        // to avoid conflicts with the framework's positioning on the element itself.
        UIView.createStyleSelector(".UILoadingViewSpinnerContainer::after", `
            content: "";
            display: block;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border-style: solid;
            border-width: 5px;
            border-color: inherit;
            border-right-color: transparent !important;
            animation: ${spinKeyframe} 1.5s linear infinite;
            box-sizing: border-box;
        `)
    }
    
    private updateColors() {
        // --- Indicator Mode Styling ---
        const isLightTheme = this._theme === "light"
        
        // Background Overlay
        // Light Theme -> UI is light -> Use White overlay with high alpha
        // Dark Theme -> UI is dark -> Use Black overlay with medium alpha
        const overlayColor = isLightTheme
                             ? new UIColor("rgba(255, 255, 255, 0.7)")
                             : new UIColor("rgba(0, 0, 0, 0.5)")
        
        // Spinner Color
        // Light Theme -> UI is light -> Spinner should be Dark (e.g. Bootstrap text-body-emphasis #212529 or primary)
        // Dark Theme -> UI is dark -> Spinner should be Light (e.g. #f8f9fa)
        const spinnerColor = isLightTheme
                             ? new UIColor("#343a40") // Dark Grey
                             : new UIColor("#f8f9fa") // Light/White
        
        if (!this.isPulsing) {
            this.backgroundColor = overlayColor
        }
        
        // Apply colors to spinner borders
        // We set Top, Bottom, Left. Right is forced transparent by CSS class.
        this.spinnerView.style.borderTopColor = spinnerColor.stringValue
        this.spinnerView.style.borderBottomColor = spinnerColor.stringValue
        this.spinnerView.style.borderLeftColor = spinnerColor.stringValue
        
        // --- Pulsing Mode Styling ---
        // We could switch animations here, but simply clearing the background
        // allows the CSS animation to take over if the class is active.
        if (this.isPulsing) {
            this.style.backgroundColor = ""
        }
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews();
        
        // 1. Always fill the parent view
        (this as UILoadingView).configureWithObject({
            style: { height: "100%", width: "100%" }
        })
        
        const bounds = this.bounds
        const minDimension = Math.min(bounds.width, bounds.height)
        
        // 2. Adaptive Logic
        // If smaller than 40px, use pulsing. Otherwise spinner.
        if (minDimension < 40) {
            this.enablePulsingMode()
        }
        else {
            this.enableIndicatorMode()
        }
    }
    
    private enablePulsingMode() {
        if (this.isPulsing) {
            return
        }
        
        this.spinnerView.hidden = YES
        this.addStyleClass("UILoadingViewPulsing")
        
        // Clear manual background so CSS animation visible
        this.style.backgroundColor = ""
        
        this.isPulsing = YES
    }
    
    private enableIndicatorMode() {
        // Remove pulsing class
        this.removeStyleClass("UILoadingViewPulsing")
        this.isPulsing = NO
        
        this.spinnerView.hidden = NO
        
        // Apply Overlay Color immediately
        this.updateColors()
        
        // Layout Spinner
        // Bootstrap standard is ~2rem (32px). We can scale it slightly based on available space if we wanted,
        // but a fixed "neutral" size usually looks best unless very restricted.
        const spinnerSize = 32
        const borderWidth = 4 // 0.25em approx
        
        const bounds = this.bounds
        
        // Center the spinner
        const x = (bounds.width - spinnerSize) / 2
        const y = (bounds.height - spinnerSize) / 2
        
        this.spinnerView.frame = new UIRectangle(x, y, spinnerSize, spinnerSize)
        this.spinnerView.style.borderWidth = borderWidth + "px"
    }
    
}

UIView.LoadingViewClass = UILoadingView




