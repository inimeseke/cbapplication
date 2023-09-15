import { UIPoint } from "./UIPoint"
import { LooseObject, UIView } from "./UIView"


export class UINativeScrollView extends UIView {
    
    animationDuration = 0
    private _contentOffset?: UIPoint
    
    constructor(elementID?: string, viewHTMLElement?: (HTMLElement & LooseObject) | null | undefined) {
        
        super(elementID, viewHTMLElement)
        
        this.style.cssText = this.style.cssText + "-webkit-overflow-scrolling: touch;"
        this.style.overflow = "auto"
        
        this.viewHTMLElement.addEventListener("scroll", () => {
            
            this.resizingHandles.forEach(
                handle => handle.style.transform = ("" + handle.style.transform).replace(
                    new RegExp("translateX\\(([^)]+)\\)"),
                    ""
                ).replace(
                    new RegExp("translateY\\(([^)]+)\\)"),
                    ""
                ) + "translateX(" + this.viewHTMLElement.scrollLeft + "px)" + " translateY(" + this.viewHTMLElement.scrollTop + "px)"
            )
            
            this._contentOffset = new UIPoint(this.viewHTMLElement.scrollLeft, this.viewHTMLElement.scrollTop)
            
            this.didScrollToPosition(this._contentOffset)
            
            this.broadcastEventInSubtree({
                name: UIView.broadcastEventName.PageDidScroll,
                parameters: undefined
            })
            
        })
        
    }
    
    
    didScrollToPosition(offsetPosition: UIPoint) {
        
        
    }
    
    
    get scrollsX() {
        const result = (this.style.overflowX == "scroll")
        return result
    }
    
    set scrollsX(scrolls: boolean) {
        if (scrolls) {
            this.style.overflowX = "scroll"
        }
        else {
            this.style.overflowX = "hidden"
        }
    }
    
    
    get scrollsY() {
        const result = (this.style.overflowY == "scroll")
        return result
    }
    
    set scrollsY(scrolls: boolean) {
        if (scrolls) {
            this.style.overflowY = "scroll"
        }
        else {
            this.style.overflowY = "hidden"
        }
    }
    
    
    get contentOffset() {
        if (!this._contentOffset) {
            this._contentOffset = new UIPoint(this.viewHTMLElement.scrollLeft, this.viewHTMLElement.scrollTop)
        }
        return this._contentOffset
    }
    
    
    set contentOffset(offsetPoint: UIPoint) {
        
        this._contentOffset = offsetPoint.copy()
        
        if (this.animationDuration) {
            
            this.scrollXTo(this.viewHTMLElement, offsetPoint.x, this.animationDuration)
            this.scrollYTo(this.viewHTMLElement, offsetPoint.y, this.animationDuration)
            
            return
            
        }
        
        this.viewHTMLElement.scrollLeft = offsetPoint.x
        this.viewHTMLElement.scrollTop = offsetPoint.y
        
    }
    
    
    scrollToBottom() {
        
        this.contentOffset = new UIPoint(this.contentOffset.x, this.scrollSize.height - this.frame.height)
        
    }
    
    scrollToTop() {
        
        this.contentOffset = new UIPoint(this.contentOffset.x, 0)
        
    }
    
    get isScrolledToBottom() {
        
        return this.contentOffset.isEqualTo(new UIPoint(this.contentOffset.x, this.scrollSize.height -
            this.frame.height))
        
    }
    
    get isScrolledToTop() {
        
        return this.contentOffset.isEqualTo(new UIPoint(this.contentOffset.x, 0))
        
    }
    
    
    scrollYTo(element: HTMLElement & LooseObject, to: number, duration: number) {
        
        duration = duration * 1000
        
        const start = element.scrollTop
        const change = to - start
        const increment = 10
        
        const animateScroll = (elapsedTime: number) => {
            elapsedTime += increment
            const position = this.easeInOut(elapsedTime, start, change, duration)
            element.scrollTop = position
            if (elapsedTime < duration) {
                setTimeout(function () {
                    animateScroll(elapsedTime)
                }, increment)
            }
        }
        
        animateScroll(0)
    }
    
    scrollXTo(element: HTMLElement & LooseObject, to: number, duration: number) {
        
        duration = duration * 1000
        
        const start = element.scrollTop
        const change = to - start
        const increment = 10
        
        const animateScroll = (elapsedTime: number) => {
            elapsedTime += increment
            const position = this.easeInOut(elapsedTime, start, change, duration)
            element.scrollLeft = position
            if (elapsedTime < duration) {
                setTimeout(function () {
                    animateScroll(elapsedTime)
                }, increment)
            }
        }
        
        animateScroll(0)
    }
    
    easeInOut(currentTime: number, start: number, change: number, duration: number) {
        currentTime /= duration / 2
        if (currentTime < 1) {
            return change / 2 * currentTime * currentTime + start
        }
        currentTime -= 1
        return -change / 2 * (currentTime * (currentTime - 2) - 1) + start
    }
    
    
}





















































