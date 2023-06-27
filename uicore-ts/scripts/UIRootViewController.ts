import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { UIDialogView } from "./UIDialogView"
import { EXTEND, FIRST, FIRST_OR_NIL, IS, IS_NOT, LAZY_VALUE, nil, NO, UIObject, wrapInNil, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { UIRoute } from "./UIRoute"
import { UIView } from "./UIView"
import { UIViewController } from "./UIViewController"


export interface UIRootViewControllerLazyViewControllerObject<T extends typeof UIViewController> {
    instance: InstanceType<T>;
    class: T;
    shouldShow: () => (Promise<boolean> | boolean);
    isInitialized: boolean
}


export interface UIRootViewControllerLazyViewControllersObject {
    [x: string]: UIRootViewControllerLazyViewControllerObject<typeof UIViewController>
}


export interface UIRootViewControllerLazyContentViewControllersObject extends UIRootViewControllerLazyViewControllersObject {
    mainViewController: UIRootViewControllerLazyViewControllerObject<typeof UIViewController>
}


export class UIRootViewController extends UIViewController {
    
    topBarView?: UIView
    backgroundView: UIView = new UIView(this.view.elementID + "BackgroundView").configuredWithObject({
        style: {
            background: "linear-gradient(" + UIColor.whiteColor.stringValue + ", " + UIColor.blueColor.stringValue + ")",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat"
        }
    })
    bottomBarView?: UIView
    
    _contentViewController?: UIViewController
    contentViewControllers: UIRootViewControllerLazyContentViewControllersObject = {
        mainViewController: this.lazyViewControllerObjectWithClass(UIViewController)
    }
    
    _detailsDialogView: UIDialogView = new UIDialogView(this.view.elementID + "DetailsDialogView")
        .configuredWithObject({
            dismiss: EXTEND(() => {
                    const route = UIRoute.currentRoute
                    this.detailsViewControllers.allValues.forEach(
                        value => route.routeByRemovingComponentNamed(value.class.routeComponentName)
                    )
                    route.apply()
                }
            )
        })
    _detailsViewController?: UIViewController
    detailsViewControllers: UIRootViewControllerLazyViewControllersObject = {}
    
    
    constructor(view: UIView) {
        
        super(view)
        
        this.view.addSubview(this.backgroundView)
        
    }
    
    
    lazyViewControllerObjectWithClass<T extends typeof UIViewController>(
        classObject: T,
        shouldShow: () => (Promise<boolean> | boolean) = () => YES
    ): UIRootViewControllerLazyViewControllerObject<T> {
        const result: UIRootViewControllerLazyViewControllerObject<T> = {
            class: classObject,
            instance: nil,
            shouldShow: shouldShow,
            isInitialized: NO
        }
        UIObject.configureWithObject(result, {
            // @ts-ignore
            instance: LAZY_VALUE(
                () => {
                    result.isInitialized = YES
                    return new classObject(
                        new UIView(classObject.name.replace("ViewController", "View"))
                    )
                }
            )
        })
        return result
    }
    
    
    override async handleRoute(route: UIRoute) {
    
        await super.handleRoute(route)
    
        UICore.languageService.updateCurrentLanguageKey()
    
        // Show content view
        await this.setContentViewControllerForRoute(route)
    
        await this.setDetailsViewControllerForRoute(route)
        
    }
    
    
    async setContentViewControllerForRoute(route: UIRoute) {
        const contentViewControllerObject = FIRST(
            await this.contentViewControllers.allValues.findAsyncSequential(
                async value => IS(route.componentWithViewController(value.class)) && await value.shouldShow()
            ),
            this.contentViewControllers.mainViewController
        )
        this.contentViewController = contentViewControllerObject.instance
    }
    
    async setDetailsViewControllerForRoute(route: UIRoute) {
        const detailsViewControllerObject = FIRST_OR_NIL(
            await this.detailsViewControllers.allValues.findAsyncSequential(
                async value => IS(route.componentWithViewController(value.class)) && await value.shouldShow()
            )
        )
        if (IS(route) && IS(this.detailsViewController) && IS_NOT(detailsViewControllerObject)) {
            this.detailsViewController = undefined
            this._detailsDialogView.dismiss()
            this.view.setNeedsLayout()
            return
        }
        this.detailsViewController = detailsViewControllerObject.instance
    }
    
    get contentViewController(): UIViewController | undefined {
        return this._contentViewController
    }
    
    set contentViewController(controller: UIViewController) {
        
        if (this.contentViewController == controller) {
            return
        }
        
        if (this.contentViewController) {
            this.removeChildViewController(this.contentViewController)
        }
        
        this._contentViewController = controller
        this.addChildViewControllerInContainer(controller, this.backgroundView)
        this._triggerLayoutViewSubviews()
        
        if (this.contentViewController) {
            this.contentViewController.view.style.boxShadow = "0 3px 6px 0 rgba(0, 0, 0, 0.1)"
        }
        
        this.view.setNeedsLayout()
        
    }
    
    
    get detailsViewController(): UIViewController | undefined {
        return this._detailsViewController
    }
    
    set detailsViewController(controller: UIViewController | undefined) {
        
        if (this.detailsViewController == controller) {
            return
        }
        
        if (IS(this.detailsViewController)) {
            this.removeChildViewController(this.detailsViewController)
        }
        
        this._detailsViewController = controller
        
        if (!IS(controller)) {
            return
        }
        
        this.addChildViewControllerInDialogView(controller, this._detailsDialogView)
        this._triggerLayoutViewSubviews()
        
        FIRST_OR_NIL(this.detailsViewController).view.style.borderRadius = "5px"
        
        this._detailsDialogView.showInView(this.view, YES)
        
    }
    
    updatePageScale(
        {
            minScaleWidth = 700,
            maxScaleWidth = 1500,
            minScale = 0.7,
            maxScale = 1
        } = {}
    ) {
        const actualPageWidth = (UIView.pageWidth * UIView.pageScale).integerValue
        let scale = minScale + (maxScale - minScale) *
            ((actualPageWidth - minScaleWidth) / (maxScaleWidth - minScaleWidth))
        scale = Math.min(scale, maxScale)
        scale = Math.max(scale, minScale)
        UIView.pageScale = scale
    }
    
    
    performDefaultLayout(
        {
            paddingLength = 20,
            contentViewMaxWidth = 1000,
            topBarHeight = 65,
            bottomBarMinHeight = 100
        } = {}
    ) {
        
        // View bounds
        const bounds = this.view.bounds
        
        if (this.topBarView) {
            this.topBarView.frame = new UIRectangle(0, 0, topBarHeight, bounds.width)
        }
        
        this.backgroundView.style.top = "" + this.topBarView?.frame.height.integerValue ?? 0 + "px"
        this.backgroundView.style.width = "100%"
        this.backgroundView.style.height = "fit-content"
        this.backgroundView.style.minHeight = "" +
            (bounds.height - (this.topBarView?.frame.height ?? 0) - (this.bottomBarView?.frame.height ?? 0)).integerValue + "px"
        
        const contentView = this.contentViewController?.view ?? nil
        contentView.style.position = "relative"
        contentView.style.bottom = "0"
        contentView.style.top = "0"
        contentView.style.width = "100%"
        contentView.setPaddings(nil, nil, paddingLength, nil)
        contentView.setNeedsLayout()
        
        if (contentViewMaxWidth < this.backgroundView.bounds.width) {
            
            contentView.style.marginBottom = "" +
                Math.min(
                    (this.backgroundView.bounds.width - contentViewMaxWidth) * 0.5,
                    paddingLength
                ).integerValue + "px"
            contentView.style.marginTop = "" +
                Math.min(
                    (this.backgroundView.bounds.width - contentViewMaxWidth) * 0.5,
                    paddingLength
                ).integerValue + "px"
            contentView.style.maxWidth = contentViewMaxWidth + "px"
            
            contentView.style.left = "" +
                ((this.backgroundView.bounds.width - contentView.bounds.width) * 0.5).integerValue +
                "px"
            
        }
        else {
            
            contentView.style.margin = ""
            contentView.style.left = ""
            contentView.style.maxWidth = ""
            
        }
        
        // Triggering immediate layout to ensure that the intrinsicContentHeight calculations work well
        this.contentViewController?._triggerLayoutViewSubviews()
        
        let contentViewControllerViewHeight = contentView.intrinsicContentHeight(
            contentView.bounds.width
        )
        
        const detailsViewControllerViewHeight = FIRST_OR_NIL(this.detailsViewController).view.intrinsicContentHeight(
            contentView.bounds.width)
        if (detailsViewControllerViewHeight > contentViewControllerViewHeight) {
            contentViewControllerViewHeight = detailsViewControllerViewHeight
        }
        
        
        contentView.style.height = "" + contentViewControllerViewHeight.integerValue + "px"
        contentView.setNeedsLayout()
        
        if (IS(this.detailsViewController)) {
            
            contentView.style.transform = "translateX(" + 0 + "px)"
            
            this.detailsViewController.view.frame = this.backgroundView.frame.rectangleWithInset(
                paddingLength
            ).rectangleWithWidth(
                contentView.bounds.width,
                0.5
            ).rectangleWithHeight(
                Math.max(
                    this.detailsViewController.view.intrinsicContentHeight(
                        this.detailsViewController.view.bounds.width
                    ),
                    contentView.bounds.height
                )
            )
            
        }
        else {
            
            contentView.style.transform = "translateX(" + 0 + "px)"
            
        }
        
        if (this.bottomBarView) {
            this.bottomBarView.frame = this.backgroundView.frame.rectangleWithY(
                this.backgroundView.frame.max.y
            ).rectangleWithHeight(
                Math.max(bottomBarMinHeight, this.bottomBarView.intrinsicContentHeight(this.backgroundView.frame.width))
            )
        }
        
        
        wrapInNil(this._detailsDialogView).setMaxSizes(this.bottomBarView?.frame.max.y ?? 0)
        
    }
    
    
}
