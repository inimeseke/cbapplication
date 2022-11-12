import { UIButton } from "./UIButton"
import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { IS, nil, NO, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { UIScrollView } from "./UIScrollView"
import { UITimer } from "./UITimer"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UISlideScrollerView extends UIView {
    
    _previousLayoutBounds?: UIRectangle
    _targetIndex: number = 0
    pageIndicatorsView: UIView
    _isAnimating: boolean = NO
    _isAnimationOngoing: boolean = NO
    _animationTimer: UITimer = nil
    _scrollView: UIScrollView
    _slideViews: UIView[] = []
    
    wrapAround: boolean = YES
    
    animationDuration: number = 0.35
    animationDelay: number = 2
    
    _currentPageIndex: number = 0
    
    constructor(elementID: string, viewHTMLElement?: HTMLElement) {
        
        super(elementID, viewHTMLElement)
        
        this._scrollView = new UIScrollView(elementID + "ScrollView")
        
        this.addSubview(this._scrollView)
        
        
        this._scrollView._scrollEnabled = NO
        
        this._scrollView.addTargetForControlEvent(
            UIView.controlEvent.PointerMove,
            (sender: UIView, event: Event) => {
        
                if (event instanceof MouseEvent) {
                    this._animationTimer.invalidate()
                }
        
            }
        )
    
        this._scrollView.addTargetForControlEvent(UIView.controlEvent.PointerLeave, () => {
        
            if (this._isAnimating && event instanceof MouseEvent) {
                this.startAnimating()
            }
        
        })
        
        // Touch events
        this._scrollView.addTargetForControlEvent(UIView.controlEvent.PointerDown, (sender, event) => {
        
            if (event instanceof TouchEvent) {
                this._animationTimer.invalidate()
            }
        
        })
        
        this._scrollView.addTargetForControlEvents([
            UIView.controlEvent.PointerUp, UIView.controlEvent.PointerCancel
        ], (sender, event) => {
    
            if (event instanceof TouchEvent && this._isAnimating) {
        
                this.startAnimating()
        
            }
    
        })
        
        
        // Page indicator
        
        this.pageIndicatorsView = new UIView(elementID + "PageIndicatorsView")
        this.addSubview(this.pageIndicatorsView)
        
        
    }
    
    
    buttonForPageIndicatorWithIndex(index: number): UIButton {
    
        const result = new UIButton(this.viewHTMLElement.id + "PageIndicatorButton" + index)
    
        result.addTargetForControlEvents([
            UIView.controlEvent.PointerUpInside, UIView.controlEvent.EnterUp
        ], (sender, event) => {
        
            this.scrollToPageWithIndex(index, YES)
        
            if (this._isAnimating) {
            
                this.startAnimating()
            
            }
        
        
        })
    
        result.addTargetForControlEvent(UIView.controlEvent.PointerMove, () => {
        
            this._animationTimer.invalidate()
        
        })
    
    
        result.updateContentForNormalState = () => {
        
            result.backgroundColor = UIColor.blueColor
            result.titleLabel.textColor = UIColor.whiteColor
        
        }
        
        
        result.frame = new UIRectangle(nil, nil, 20, 50)
        
        // result.style.height = "20px";
        // result.style.width = "50px";
        result.style.display = "table-cell"
        result.style.position = "relative"
        
        
        // var resultContent = new UIView(result.viewHTMLElement.id + "Content");
        // resultContent.backgroundColor = UIColor.whiteColor;
        // resultContent.centerYInContainer();
        // resultContent.style.height = "10px";
        // resultContent.style.height = "100%";
        // resultContent.style.borderRadius = "5px";
        
        // result.addSubview(resultContent);
        
        
        return result
        
    }
    
    
    addSlideView(view: UIView) {
        
        this.slideViews.push(view)
        
        this.updateSlideViews()
        
    }
    
    set slideViews(views: UIView[]) {
        
        this._slideViews = views
        
        this.updateSlideViews()
        
    }
    
    get slideViews() {
        return this._slideViews
    }
    
    
    get currentPageIndex() {
        return this._currentPageIndex
    }
    
    set currentPageIndex(index: number) {
        this._currentPageIndex = index
        this._slideViews[index].willAppear()
        this._scrollView.contentOffset = this._scrollView.contentOffset.pointWithX(-this._slideViews[index].frame.min.x);
        (this.pageIndicatorsView.subviews as UIButton[]).everyElement.selected = NO;
        (this.pageIndicatorsView.subviews[index] as UIButton).selected = YES
    }
    
    
    scrollToPreviousPage(animated: boolean) {
        
        if (this.slideViews.length == 0) {
            return
        }
    
        var targetIndex = this.currentPageIndex
    
        if (this.wrapAround) {
            targetIndex = (this.currentPageIndex - 1) % (this.slideViews.length)
        }
        else if (this.currentPageIndex - 1 < this.slideViews.length) {
            targetIndex = this.currentPageIndex - 1
        }
        else {
            return
        }
        
        this.scrollToPageWithIndex(targetIndex, animated)
        
    }
    
    scrollToNextPage(animated: boolean) {
        
        if (this.slideViews.length == 0) {
            return
        }
    
        var targetIndex = this.currentPageIndex
    
        if (this.wrapAround) {
            targetIndex = (this.currentPageIndex + 1) % (this.slideViews.length)
        }
        else if (this.currentPageIndex + 1 < this.slideViews.length) {
            targetIndex = this.currentPageIndex + 1
        }
        else {
            return
        }
        
        this.scrollToPageWithIndex(targetIndex, animated)
        
    }
    
    
    scrollToPageWithIndex(targetIndex: number, animated: boolean = YES) {
        
        this._targetIndex = targetIndex
        
        // this._slideViews[this.currentPageIndex]._shouldLayout = NO;
        // this._slideViews[this._targetIndex]._shouldLayout = YES;
        
        //this._slideViews[this._targetIndex].hidden = NO;
        
        this.willScrollToPageWithIndex(targetIndex)
        
        this._isAnimationOngoing = YES
        
        //var previousView = this._slideViews[this.currentPageIndex];
        
        if (animated) {
            
            
            UIView.animateViewOrViewsWithDurationDelayAndFunction(
                this._scrollView.containerView,
                this.animationDuration,
                0,
                undefined,
                function (this: UISlideScrollerView) {
                    
                    
                    this.currentPageIndex = targetIndex
                    
                    
                }.bind(this),
                function (this: UISlideScrollerView) {
                    
                    this.didScrollToPageWithIndex(targetIndex)
                    
                    this._isAnimationOngoing = NO
                    
                    //previousView.hidden = YES;
                    
                }.bind(this)
            )
            
        }
        else {
            
            
            this.currentPageIndex = targetIndex
            this.didScrollToPageWithIndex(targetIndex)
            
            //previousView.hidden = YES;
            
        }
        
    }
    
    
    willScrollToPageWithIndex(index: number) {
    
        const targetView = this.slideViews[index]
    
        if (IS(targetView) && (targetView as any).willAppear && (targetView as any).willAppear instanceof Function) {
            
            (targetView as any).willAppear()
            
        }
        
    }
    
    didScrollToPageWithIndex(index: number) {
        
        
    }
    
    
    startAnimating() {
        
        this._isAnimating = YES
        
        this._animationTimer.invalidate()
    
        this._animationTimer = new UITimer(this.animationDelay + this.animationDuration, YES, () => {
        
            this.scrollToNextPage(YES)
        
        })
        
    }
    
    stopAnimating() {
        
        this._isAnimating = NO
        this._animationTimer.invalidate()
        
    }
    
    
    updateSlideViews() {
        
        this._scrollView.containerView.subviews.slice().forEach(function (subview, index, array) {
            
            subview.removeFromSuperview()
            
        })
        
        this.pageIndicatorsView.subviews.slice().forEach(function (subview, index, array) {
            
            subview.removeFromSuperview()
            
        })
    
        this._slideViews.forEach((view, index) => {
        
            this._scrollView.addSubview(view)
        
            this.pageIndicatorsView.addSubview(this.buttonForPageIndicatorWithIndex(index))
        
        })
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
    
        super.didReceiveBroadcastEvent(event)
    
        if (event.name == UICore.broadcastEventName.WindowDidResize) {
        
            this.currentPageIndex = this.currentPageIndex
        
        
        }
        
        
    }
    
    
    override set frame(frame: UIRectangle) {
        
        super.frame = frame
        
        this.currentPageIndex = this.currentPageIndex
        
    }
    
    override get frame() {
        
        return super.frame
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        if (this.bounds.isEqualTo(this._previousLayoutBounds)) {
            return
        }
        
        const bounds = this.bounds
        
        this._previousLayoutBounds = bounds
        
        this._scrollView.frame = bounds
        
        
        this._scrollView.containerView.frame = bounds.rectangleWithWidth(bounds.width *
            this.slideViews.length).performFunctionWithSelf(function (this: UISlideScrollerView, self: UIRectangle) {
            
            self.offsetByPoint(this._scrollView.contentOffset)
            
            return self
            
        }.bind(this))
    
        this._slideViews.forEach((view, index) => {
        
            view.frame = bounds.rectangleWithX((this.bounds.width + 1) * index)
        
        })
        
        
        this.layoutPageIndicators()
        
        
    }
    
    
    layoutPageIndicators() {
        
        this.pageIndicatorsView.centerXInContainer()
        this.pageIndicatorsView.style.bottom = "20px"
        this.pageIndicatorsView.style.height = "20px"
        this.pageIndicatorsView.style.display = "table-row"
        
    }
    
    
    override removeFromSuperview() {
        
        
        super.removeFromSuperview()
        
        this.stopAnimating()
        
        
    }
    
    
}








































