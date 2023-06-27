import { IS, nil, NO, UIButton, UIColor, UIImageView, UITextView, YES } from "uicore-ts"
import { CBColor } from "./CBColor"


export class CellView extends UIButton {
    
    _isAButton = NO
    _rightImageView?: UIImageView
    
    leftInset = 0
    rightInset = 0
    
    constructor(elementID?: string, titleLabelType: string = UITextView.type.span) {
        
        super(elementID, undefined, titleLabelType)
        
        this.updateForCurrentIsAButtonState()
        
    }
    
    
    set isAButton(isAButton: boolean) {
        this._isAButton = isAButton
        this.updateForCurrentIsAButtonState()
    }
    
    get isAButton() {
        return this._isAButton
    }
    
    
    updateForCurrentIsAButtonState() {
        
        if (this._isAButton) {
    
            this.style.cursor = "pointer"
            this.style.outline = ""
            
            this.titleLabel.userInteractionEnabled = NO
            this.titleLabel.nativeSelectionEnabled = NO
            this.titleLabel.textAlignment = UITextView.textAlignment.center
            
            this.nativeSelectionEnabled = NO
            
            this.colors = {
                
                titleLabel: {
                    
                    normal: CBColor.primaryTintColor,
                    highlighted: CBColor.primaryTintColor,
                    selected: CBColor.primaryTintColor
                    
                },
                background: {
                    
                    normal: CBColor.transparentColor,
                    hovered: new UIColor("#F8F8F8"),
                    highlighted: new UIColor("#ebebeb"),
                    selected: new UIColor("#ebebeb")
                    
                }
                
            }
            
            
        }
        else {
    
            this.style.cursor = ""
            this.style.outline = "none"
            
            this.titleLabel.userInteractionEnabled = YES
            this.titleLabel.nativeSelectionEnabled = YES
            this.titleLabel.textAlignment = UITextView.textAlignment.left
            
            this.nativeSelectionEnabled = YES
            
            this.colors = {
                
                titleLabel: {
                    
                    normal: CBColor.primaryContentColor,
                    highlighted: CBColor.primaryContentColor,
                    selected: CBColor.primaryContentColor
                    
                },
                background: {
                    
                    normal: UIColor.transparentColor,
                    highlighted: UIColor.transparentColor,
                    selected: UIColor.transparentColor
                    
                }
                
            }
            
            
        }
        
        this.updateContentForCurrentState()
        
    }
    
    
    initRightImageViewIfNeeded() {
    
        if (IS(this._rightImageView)) {
            return
        }
        
        this._rightImageView = new UIImageView(this.elementID + "RightImageView")
        this._rightImageView.userInteractionEnabled = NO
        
    }
    
    
    set rightImageSource(imageSource: string) {
        
        if (IS(imageSource)) {
    
            this.initRightImageViewIfNeeded()
    
            const rightImageView: UIImageView = this._rightImageView ?? nil
            rightImageView.imageSource = imageSource
    
            this.addSubview(this._rightImageView ?? nil)
    
        }
        else {
    
            this._rightImageView?.removeFromSuperview()
            
        }
        
    }
    
    get rightImageSource() {
        return this._rightImageView?.imageSource ?? nil
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
    
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        const bounds = this.bounds
        
        
        this.titleLabel.centerYInContainer()
        
        this.titleLabel.style.left = "" + (padding * 0.5 + this.leftInset).integerValue + "px"
        this.titleLabel.style.right = "" + (padding * 0.5 + this.rightInset).integerValue + "px"
        
        this.titleLabel.style.maxHeight = "100%"
        
        this.titleLabel.style.overflow = "hidden"
        
        //this.titleLabel.style.whiteSpace = "nowrap";
        
        
        if (this._rightImageView && this._rightImageView.superview == this) {
            
            // var imageHeight = bounds.height - padding;
            // this._rightImageView.frame = new UIRectangle(bounds.width - imageHeight - padding * 0.5, padding * 0.5, imageHeight, imageHeight);
            
            this._rightImageView.frame = bounds.rectangleWithInsets(this.leftInset, padding * 0.5 +
                this.rightInset, 0, 0).rectangleWithWidth(24, 1).rectangleWithHeight(24, 0.5)
            
            this.titleLabel.style.right = "" +
                (padding * 0.5 + this.rightInset + this._rightImageView.frame.width).integerValue + "px"
            
        }
        
        
    }
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
    
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        const result = [
            this.titleLabel.intrinsicContentHeight(constrainingWidth - padding - this.leftInset - this.rightInset), 50
        ].max()
        
        //result = result * 2;
        
        return result
        
        
    }
    
    
}



















