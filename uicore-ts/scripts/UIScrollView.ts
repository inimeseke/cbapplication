import { IS_NOT, nil, NO, YES } from "./UIObject"
import { UIPoint } from "./UIPoint"
import { UIRectangle } from "./UIRectangle"
import { UIView } from "./UIView"


export class UIScrollView extends UIView {
    
    containerView: UIView
    
    _contentOffset: UIPoint = new UIPoint(0, 0)
    _contentScale: number = 1
    
    _pointerDown?: boolean
    _scrollEnabled: boolean = YES
    _previousClientPoint: UIPoint = nil
    _intrinsicContentFrame: UIRectangle = nil
    
    constructor(elementID: string, viewHTMLElement?: HTMLElement) {
        
        super(elementID, viewHTMLElement)
        
        this.containerView = new UIView(elementID + "ContainerView")
        super.addSubview(this.containerView)
        
        this.style.overflow = "hidden"
        this.pausesPointerEvents = NO //YES;
        
        this.addTargetForControlEvent(UIView.controlEvent.PointerDown, () => this._pointerDown = YES)
        
        this.addTargetForControlEvent(UIView.controlEvent.PointerUp, () => {
            
            this._pointerDown = NO
            this._previousClientPoint = nil
            scrollStopped()
            
        })
        
        
        function scrollStopped() {
            
            // Handle paging if needed
            
        }
        
        
        this.addTargetForControlEvent(UIView.controlEvent.PointerMove, (sender, event) => {
            
            if (!(this._pointerDown && this._scrollEnabled && this._enabled)) {
                return
            }
            
            const currentClientPoint = new UIPoint(nil, nil)
            
            if ((window as any).MouseEvent && event instanceof MouseEvent) {
                
                currentClientPoint.x = (event as MouseEvent).clientX
                currentClientPoint.y = (event as MouseEvent).clientY
                
            }
            
            if ((window as any).TouchEvent && event instanceof TouchEvent) {
    
                const touchEvent: TouchEvent = event
    
                if (touchEvent.touches.length != 1) {
                    this._pointerDown = NO
                    this._previousClientPoint = nil
                    scrollStopped()
                    return
                }
                
                currentClientPoint.x = touchEvent.touches[0].clientX
                currentClientPoint.y = touchEvent.touches[0].clientY
                
            }
            
            if (IS_NOT(this._previousClientPoint)) {
                this._previousClientPoint = currentClientPoint
                return
            }
            
            const changePoint = currentClientPoint.copy().subtract(this._previousClientPoint)
            
            if (this.containerView.bounds.width <= this.bounds.width) {
                changePoint.x = 0
            }
            if (0 < this.contentOffset.x + changePoint.x) {
                changePoint.x = -this.contentOffset.x
            }
            if (this.contentOffset.x + changePoint.x < -this.bounds.width) {
                changePoint.x = -this.bounds.width - this.contentOffset.x
            }
            
            if (this.containerView.bounds.height <= this.bounds.height) {
                changePoint.y = 0
            }
            if (0 < this.contentOffset.y + changePoint.y) {
                changePoint.y = -this.contentOffset.y
            }
            if (this.contentOffset.y + changePoint.y < -this.bounds.height) {
                changePoint.y = -this.bounds.height - this.contentOffset.y
            }
            
            this.contentOffset = this.contentOffset.add(changePoint)
            
            this._previousClientPoint = currentClientPoint
            
        })
        
        
    }
    
    
    invalidateIntrinsicContentFrame() {
        this._intrinsicContentFrame = nil
    }
    
    
    get contentOffset() {
        return this._contentOffset
    }
    
    set contentOffset(offset: UIPoint) {
        this._contentOffset = offset
        this.setNeedsLayout()
    }
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        this.containerView.frame = this.containerView.bounds.offsetByPoint(this.contentOffset)
        
    }
    
    hasSubview(view: UIView) {
        return this.containerView.hasSubview(view)
    }
    
    addSubview(view: UIView) {
        this.containerView.addSubview(view)
        this.invalidateIntrinsicContentFrame()
    }
    
}





















































