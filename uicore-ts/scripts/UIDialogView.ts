import { IS_FIREFOX } from "./ClientCheckers"
import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { UINativeScrollView } from "./UINativeScrollView"
import { FIRST, IF, IS, nil, NO, YES } from "./UIObject"
import { UIScrollView } from "./UIScrollView"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UIDialogView<ViewType extends UIView = UIView> extends UIView {

    _isAUIDialogView = YES
    _view: ViewType = new UIView() as any
    _appearedAnimated?: boolean
    animationDuration: number = 0.25
    _zIndex: number = 100
    isVisible: boolean = NO
    dismissesOnTapOutside = YES

    static _activeDialogCount = 0
    _fillsViewport = NO
    
    constructor(elementID?: string, viewHTMLElement?: HTMLElement) {
        
        
        super(elementID, viewHTMLElement)
        
        this.addTargetForControlEvent(
            UIView.controlEvent.PointerTap,
            function (this: UIDialogView, sender: UIView, event: Event) {
                
                this.didDetectTapOutside(sender, event)
                
            }.bind(this)
        )
        
        this.backgroundColor = UIColor.colorWithRGBA(0, 10, 25).colorWithAlpha(0.75) //CBColor.primaryContentColor.colorWithAlpha(0.75)
        
        this.zIndex = this._zIndex
        
    }
    
    
    didDetectTapOutside(sender: UIView, event: Event) {
        
        if (event.target == this.viewHTMLElement && this.dismissesOnTapOutside) {
            this.dismiss(this._appearedAnimated)
        }
        
    }
    
    
    set zIndex(zIndex: number) {
        
        this._zIndex = zIndex
        this.style.zIndex = "" + zIndex
        
    }
    
    get zIndex() {
        
        return this._zIndex
        
    }
    
    
    set view(view: ViewType) {
        
        this._view?.removeFromSuperview()
        
        this._view = view
        
        this.addSubview(view)
        
    }
    
    
    get view(): ViewType {
        
        return this._view
        
    }
    
    
    override willAppear(animated: boolean = NO) {
        
        if (animated) {
            
            this.style.opacity = "0"
            
        }
        
        this.style.height = ""
        
        this._frame = nil
        
    }
    
    
    animateAppearing() {
        
        this.style.opacity = "1"
        
    }
    
    animateDisappearing() {
        
        this.style.opacity = "0"
        
    }
    
    
    showInView(containerView: UIView, animated: boolean) {
        
        this._fillsViewport = containerView.rootView == containerView
        animated = (animated && !IS_FIREFOX)
        
        this._appearedAnimated = animated
        
        this.willAppear(animated)
        
        
        if (this._fillsViewport) {
            UIDialogView._activeDialogCount++
            if (UIDialogView._activeDialogCount >= 1) {
                document.body.style.overflow = "hidden"
            }
        }

        containerView.addSubview(this)
        this.view.setNeedsLayoutUpToRootView()
        
        if (animated) {
            
            UIView.layoutViewsIfNeeded()
            this.layoutSubviews()
            
            UIView.animateViewOrViewsWithDurationDelayAndFunction(
                this,
                this.animationDuration,
                0,
                undefined,
                () => this.animateAppearing(),
                nil
            )
            
            
        }
        else {
            
            this.setNeedsLayout()
            
        }
        
        this.isVisible = YES
        
    }
    
    
    showInRootView(animated: boolean) {
        
        this.showInView(UICore.main.rootViewController.view, animated)

    }
    
    
    dismiss(animated?: boolean) {
        
        if (!this.isVisible) {
            return
        }
        
        animated = (animated && !IS_FIREFOX)
        
        if (animated == undefined) {
            
            animated = this._appearedAnimated
            
        }
        
        const unlockScroll = () => {
            if (this._fillsViewport) {
                UIDialogView._activeDialogCount = Math.max(0, UIDialogView._activeDialogCount - 1)
                if (UIDialogView._activeDialogCount === 0) {
                    document.body.style.overflow = ""
                }
            }
        }

        if (animated) {

            UIView.animateViewOrViewsWithDurationDelayAndFunction(
                this,
                this.animationDuration,
                0,
                undefined,
                (() => {

                    this.animateDisappearing()

                }).bind(this),
                () => {

                    if (this.isVisible == NO) {

                        this.removeFromSuperview()
                        unlockScroll()

                    }

                }
            )

        }
        else {

            this.removeFromSuperview()
            unlockScroll()

        }
        
        this.isVisible = NO
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UICore.broadcastEventName.WindowDidResize) {
            
            this.setNeedsLayout()
            
        }
        
    }
    
    
    override layoutSubviews() {
        
        
        if (!IS(this.view)) {
            
            return
            
        }
        
        //this.frame = this.superview.bounds;
        
        if (this._fillsViewport) {
            const containerRect = this.superview?.viewHTMLElement?.getBoundingClientRect()
            const topOffset = containerRect ? -containerRect.top / UIView.pageScale : 0
            this.setPosition(0, 0, 0, topOffset, window.innerHeight / UIView.pageScale, "100%")
        }
        else {
            this.setPosition(0, 0, 0, 0, 0, "100%")
            this.setPosition(
                0,
                0,
                0,
                0,
                FIRST(
                    IF(this.superview?.isKindOfClass(UINativeScrollView))(() => this.superview?.scrollSize.height ?? 0)
                        .ELSE_IF(this.superview?.isKindOfClass(UIScrollView))(() => this.superview?.scrollSize.height ?? 0)
                        .ELSE(() => this.superview?.frame.height ?? 0),
                    UIView.pageHeight
                ) / UIView.pageScale,
                "100%"
            )
        }
        
        const bounds = this.bounds
        
        const margin = 20
        
        //this.view.centerInContainer();
        
        this.view.style.position = "relative"
        
        this.view.style.zIndex = "" + this.zIndex
        
        this.view.setNeedsLayout()
        
        // this.view.style.maxHeight = "" + (bounds.height - margin * 2).integerValue + "px";
        // this.view.style.maxWidth = "" + (bounds.width - margin * 2).integerValue + "px";
        
        
        // var viewIntrinsicRectangle = this.view.intrinsicContentSize();
        // this.view.frame = new UIRectangle((bounds.width - viewIntrinsicRectangle.width)*0.5,  )
        
        super.layoutSubviews()
        
    }
    
    
}























