import { UIBaseButton } from "./UIBaseButton"
import { UIColor } from "./UIColor"
import { UIImageView } from "./UIImageView"
import { IS, IS_NOT, IS_NOT_NIL, nil, NO, ValueOf, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { UITextView } from "./UITextView"


export interface UIButtonColorSpecifier {
    
    titleLabel: UIButtonElementColorSpecifier;
    background: UIButtonElementColorSpecifier;
    
}


export interface UIButtonElementColorSpecifier {
    
    normal: UIColor;
    hovered?: UIColor;
    highlighted: UIColor;
    focused?: UIColor;
    selected: UIColor;
    selectedAndHighlighted?: UIColor;
    
}


export class UIButton extends UIBaseButton {
    
    _contentPadding = 0
    _titleLabel: UITextView = nil
    _imageView: UIImageView
    
    usesAutomaticTitleFontSize = NO
    minAutomaticFontSize?: number
    maxAutomaticFontSize?: number = 25
    
    colors: UIButtonColorSpecifier = {
        
        titleLabel: {
            
            normal: UIColor.whiteColor,
            highlighted: UIColor.whiteColor,
            selected: UIColor.whiteColor
            
        },
        
        background: {
            
            normal: UIColor.blueColor,
            highlighted: UIColor.greenColor,
            selected: UIColor.redColor
            
        }
        
    }
    
    
    constructor(
        elementID?: string,
        elementType?: string,
        titleType: string | ValueOf<typeof UITextView.type> = UITextView.type.span
    ) {
        
        super(elementID, elementType)
        
        // Instance variables
        
        this._imageView = new UIImageView(this.elementID + "ImageView")
        this._imageView.hidden = YES
        this.addSubview(this.imageView)
        
        this.imageView.fillMode = UIImageView.fillMode.aspectFitIfLarger
        
        
        if (IS_NOT_NIL(titleType)) {
            
            this._titleLabel = new UITextView(this.elementID + "TitleLabel", titleType)
            this.titleLabel!.style.whiteSpace = "nowrap"
            this.addSubview(this.titleLabel!)
            
            this.titleLabel!.userInteractionEnabled = NO
            
        }
        
        this.contentPadding = 10
        
        this.imageView.userInteractionEnabled = NO
        if (this.titleLabel) {
            this.titleLabel.textAlignment = UITextView.textAlignment.center
            this.titleLabel.nativeSelectionEnabled = NO
        }
        
    }
    
    
    get contentPadding() {
        return this._contentPadding.integerValue
    }
    
    set contentPadding(contentPadding) {
        this._contentPadding = contentPadding
        this.setNeedsLayout()
    }
    
    
    public override set hovered(hovered: boolean) {
        this._hovered = hovered
        this.updateContentForCurrentState()
    }
    
    public override get hovered(): boolean {
        return this._hovered ?? NO
    }
    
    public override set highlighted(highlighted: boolean) {
        this._highlighted = highlighted
        this.updateContentForCurrentState()
    }
    
    public override get highlighted(): boolean {
        return this._highlighted
    }
    
    public override set focused(focused: boolean) {
        this._focused = focused
        if (focused) {
            this.focus()
        }
        else {
            this.blur()
        }
        this.updateContentForCurrentState()
    }
    
    public override get focused(): boolean {
        return this._focused ?? NO
    }
    
    public override set selected(selected: boolean) {
        this._selected = selected
        this.updateContentForCurrentState()
    }
    
    public override get selected(): boolean {
        return this._selected
    }
    
    
    override updateContentForCurrentState() {
        
        let updateFunction: Function = this.updateContentForNormalState
        if (this.selected && this.highlighted) {
            updateFunction = this.updateContentForSelectedAndHighlightedState
        }
        else if (this.selected) {
            updateFunction = this.updateContentForSelectedState
        }
        else if (this.focused) {
            updateFunction = this.updateContentForFocusedState
        }
        else if (this.highlighted) {
            updateFunction = this.updateContentForHighlightedState
        }
        else if (this.hovered) {
            updateFunction = this.updateContentForHoveredState
        }
        
        if (!IS(updateFunction)) {
            if (this.titleLabel) {
                this.titleLabel.textColor = UIColor.nilColor
            }
            this.backgroundColor = UIColor.nilColor
        }
        else {
            updateFunction.call(this)
        }
        
        this.updateContentForCurrentEnabledState()
        
    }
    
    override updateContentForNormalState() {
        
        this.backgroundColor = this.colors.background.normal
        if (this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.normal
        }
        
    }
    
    override updateContentForHoveredState() {
        
        this.updateContentForNormalState()
        
        if (this.colors.background.hovered) {
            this.backgroundColor = this.colors.background.hovered
        }
        
        if (this.colors.titleLabel.hovered && this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.hovered
        }
        
    }
    
    override updateContentForFocusedState() {
        
        this.updateContentForHoveredState()
        
        if (this.colors.background.focused) {
            this.backgroundColor = this.colors.background.focused
        }
        
        if (this.colors.titleLabel.focused && this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.focused
        }
        
    }
    
    override updateContentForHighlightedState() {
        
        this.backgroundColor = this.colors.background.highlighted
        if (this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.highlighted
        }
        
    }
    
    override updateContentForSelectedState() {
        
        this.backgroundColor = this.colors.background.selected
        if (this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.selected
        }
        
    }
    
    override updateContentForSelectedAndHighlightedState() {
        
        this.updateContentForSelectedState()
        
        if (this.colors.background.selectedAndHighlighted) {
            this.backgroundColor = this.colors.background.selectedAndHighlighted
        }
        
        if (this.colors.titleLabel.selectedAndHighlighted && this.titleLabel) {
            this.titleLabel.textColor = this.colors.titleLabel.selectedAndHighlighted
        }
        
    }
    
    
    override set enabled(enabled: boolean) {
        
        // @ts-ignore
        super.enabled = enabled
        
        this.updateContentForCurrentState()
        
    }
    
    override get enabled() {
        
        // @ts-ignore
        return super.enabled
        
    }
    
    override updateContentForCurrentEnabledState() {
        
        if (this.enabled) {
            this.alpha = 1
        }
        else {
            this.alpha = 0.5
        }
        
        this.userInteractionEnabled = this.enabled
        
    }
    
    
    override addStyleClass(styleClassName: string) {
        
        super.addStyleClass(styleClassName)
        
        if (this.styleClassName != styleClassName) {
            
            this.updateContentForCurrentState.call(this)
            
        }
        
    }
    
    
    get titleLabel(): UITextView {
        return this._titleLabel
    }
    
    get imageView() {
        
        return this._imageView
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        let bounds = this.bounds
        
        this.hoverText = this.titleLabel?.text ?? ""
        
        // Image only if text is not present
        if (IS_NOT(this.imageView.hidden) && !IS(this.titleLabel?.text)) {
            
            this.imageView.frame = bounds
            
        }
        
        // Text only if image is not present
        if (IS(this.imageView.hidden) && this.titleLabel?.text) {
            
            this.titleLabel.style.left = this.contentPadding + "px"
            this.titleLabel.style.right = this.contentPadding + "px"
            // this.titleLabel.style.marginLeft = ""
            // this.titleLabel.style.right = this.contentPadding
            this.titleLabel.style.top = "50%"
            this.titleLabel.style.transform = "translateY(-50%)"
            this.titleLabel.frame = new UIRectangle(nil, nil, nil, nil)
            
            if (this.usesAutomaticTitleFontSize) {
                
                const hidden = this.titleLabel.hidden
                
                this.titleLabel.hidden = YES
                
                this.titleLabel.fontSize = 15
                
                this.titleLabel.fontSize = UITextView.automaticallyCalculatedFontSize(
                    new UIRectangle(
                        0,
                        0,
                        this.bounds.height,
                        this.titleLabel.viewHTMLElement.offsetWidth
                    ),
                    this.titleLabel.intrinsicContentSize(),
                    this.titleLabel.fontSize,
                    this.minAutomaticFontSize,
                    this.maxAutomaticFontSize
                )
                
                this.titleLabel.hidden = hidden
                
            }
            
            
        }
        
        // Image and text both present
        if (IS_NOT(this.imageView.hidden) && this.titleLabel?.text) {
            
            //const imageShareOfWidth = 0.25
            
            bounds = bounds.rectangleWithInset(this.contentPadding)
            
            const imageFrame = bounds.copy()
            imageFrame.width = bounds.height - this.contentPadding * 0.5
            this.imageView.frame = imageFrame
            
            this.titleLabel.style.left = imageFrame.max.x + this.contentPadding + "px"
            this.titleLabel.style.right = this.contentPadding + "px"
            this.titleLabel.style.top = "50%"
            this.titleLabel.style.transform = "translateY(-50%)"
            
            if (this.usesAutomaticTitleFontSize) {
                
                const hidden = this.titleLabel.hidden
                
                this.titleLabel.hidden = YES
                
                this.titleLabel.fontSize = 15
                
                this.titleLabel.fontSize = UITextView.automaticallyCalculatedFontSize(
                    new UIRectangle(
                        0,
                        0,
                        this.bounds.height,
                        this.titleLabel.viewHTMLElement.offsetWidth
                    ),
                    this.titleLabel.intrinsicContentSize(),
                    this.titleLabel.fontSize,
                    this.minAutomaticFontSize,
                    this.maxAutomaticFontSize
                )
                
                this.titleLabel.hidden = hidden
                
            }
            
        }
        
        this.applyClassesAndStyles()
        
    }
    
    override initViewStyleSelectors() {
        
        this.initStyleSelector("." + this.styleClassName, "background-color: lightblue;")
        
        // var selectorWithoutImage = "." + this.styleClassName + " ." + this.imageView.styleClassName + " + ." +
        // this.titleLabel.styleClassName;
        
        // this.initStyleSelector(
        //     selectorWithoutImage,
        //     "left: " + this.contentPadding + ";" +
        //     "right: " + this.contentPadding + ";" +
        //     "top: 50%;" +
        //     "transform: translateY(-50%);");
        
    }
    
    
}

