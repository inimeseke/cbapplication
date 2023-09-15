import { UICore } from "./UICore"
import { IS_NOT, NO, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UIImageView extends UIView {
    
    
    //actionIndicator: UIActionIndicator;
    _sourceKey?: string
    _defaultSource?: string
    
    _fillMode: any
    
    _hiddenWhenEmpty = NO
    
    
    constructor(elementID?: string, viewHTMLElement = null) {
        
        super(elementID, viewHTMLElement, "img")
        
        
        //this.actionIndicator = new UIActionIndicator(elementID + "ActionIndicator");
        
        
    }
    
    
    static fillMode = {
        
        "stretchToFill": "fill",
        "aspectFit": "contain",
        "aspectFill": "cover",
        "center": "none",
        "aspectFitIfLarger": "scale-down"
        
    }
    
    
    override get viewHTMLElement() {
    
        return super.viewHTMLElement as HTMLImageElement
    
    }
    
    
    static objectURLFromDataURL(dataURL: string) {
        // @ts-ignore
        const blob = dataURLtoBlob(dataURL)
        return URL.createObjectURL(blob)
    }
    
    
    static dataURL(url: string | URL, callback: (arg0: string | ArrayBuffer | null) => void) {
        const xhr = new XMLHttpRequest()
        xhr.open("get", url)
        xhr.responseType = "blob"
        xhr.onload = function () {
            const fr = new FileReader()
            
            fr.onload = function () {
                callback(this.result)
            }
            
            fr.readAsDataURL(xhr.response) // async call
        }
        
        xhr.send()
    }
    
    
    static dataURLWithMaxSize(URLString: string, maxSize: number, completion: (resultURLString: string) => void) {
    
        const imageView = new UIImageView()
        imageView.imageSource = URLString
    
        imageView.viewHTMLElement.onload = () => {
        
            const originalSize = imageView.intrinsicContentSize()
        
            let multiplier = maxSize / Math.max(originalSize.height, originalSize.width)
            multiplier = Math.min(1, multiplier)
        
            const result = imageView.getDataURL((originalSize.height * multiplier).integerValue, (originalSize.width *
                multiplier).integerValue)
        
            completion(result)
        
        }
        
    }
    
    
    static dataURLWithSizes(
        URLString: string,
        height: number,
        width: number,
        completion: (resultURLString: string) => void
    ) {
    
        const imageView = new UIImageView()
        imageView.imageSource = URLString
    
        imageView.viewHTMLElement.onload = () => {
        
            const result = imageView.getDataURL(height, width)
            completion(result)
        
        }
    
    }
    
    
    getDataURL(height?: number, width?: number) {
    
        const img = this.viewHTMLElement
    
        // Create an empty canvas element
        const canvas: HTMLCanvasElement = document.createElement("canvas")
        canvas.width = width ?? img.naturalWidth
        canvas.height = height ?? img.naturalHeight
    
        // Copy the image contents to the canvas
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
        ctx.drawImage(img, 0, 0, width ?? img.naturalWidth, height ?? img.naturalHeight)
    
        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to
        // guess the original format, but be aware the using "image/jpg"
        // will re-encode the image.
        return canvas.toDataURL("image/png")
    
    }
    
    
    get imageSource() {
        
        return this.viewHTMLElement.src
        
    }
    
    set imageSource(sourceString: string) {
        
        if (IS_NOT(sourceString)) {
            sourceString = ""
        }
        
        this.viewHTMLElement.src = sourceString
        
        if (this.hiddenWhenEmpty) {
            this.hidden = IS_NOT(this.imageSource)
        }
        
        if (!sourceString || !sourceString.length) {
            
            //this.actionIndicator.stop();
            this.hidden = YES
            
            return
            
        }
        else {
    
            this.hidden = NO
    
        }
    
        // this.superview.addSubview(this.actionIndicator);
        // this.actionIndicator.frame = this.frame;
        // this.actionIndicator.start();
        // this.actionIndicator.backgroundColor = UIColor.redColor
    
        // @ts-ignore
        this.viewHTMLElement.onload = () => this.superview?.setNeedsLayout()
    
    }
    
    
    setImageSource(key: string, defaultString: string) {
    
        const languageName = UICore.languageService.currentLanguageKey
        this.imageSource = UICore.languageService.stringForKey(key, languageName, defaultString, undefined)
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.LanguageChanged || event.name ==
            UIView.broadcastEventName.AddedToViewTree) {
            
            this._setImageSourceFromKeyIfPossible()
            
        }
        
    }
    
    
    override willMoveToSuperview(superview: UIView) {
        
        super.willMoveToSuperview(superview)
        
        this._setImageSourceFromKeyIfPossible()
        
    }
    
    _setImageSourceFromKeyIfPossible() {
        
        if (this._sourceKey && this._defaultSource) {
            
            this.setImageSource(this._sourceKey, this._defaultSource)
            
        }
        
    }
    
    
    get fillMode() {
        return this._fillMode
    }
    
    set fillMode(fillMode) {
        
        this._fillMode = fillMode;
        (this.style as any).objectFit = fillMode
        
    }
    
    
    get hiddenWhenEmpty() {
        return this._hiddenWhenEmpty
    }
    
    set hiddenWhenEmpty(hiddenWhenEmpty: boolean) {
        this._hiddenWhenEmpty = hiddenWhenEmpty
        if (hiddenWhenEmpty) {
            this.hidden = IS_NOT(this.imageSource)
        }
    }
    
    
    override didMoveToSuperview(superview: UIView) {
        
        super.didMoveToSuperview(superview)
        
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        
    }
    
    
    override intrinsicContentSize() {
        
        
        return new UIRectangle(0, 0, this.viewHTMLElement.naturalHeight, this.viewHTMLElement.naturalWidth)
        
        
    }
    
    override intrinsicContentSizeWithConstraints(constrainingHeight = 0, constrainingWidth = 0) {
        
        const heightRatio = constrainingHeight / this.viewHTMLElement.naturalHeight
        
        const widthRatio = constrainingWidth / this.viewHTMLElement.naturalWidth
        
        const multiplier = Math.max(heightRatio, widthRatio)
        
        return new UIRectangle(0, 0, this.viewHTMLElement.naturalHeight *
            multiplier, this.viewHTMLElement.naturalWidth * multiplier)
    
    
    }
    
    
}














