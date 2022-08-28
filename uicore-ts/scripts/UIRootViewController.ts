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

    topBarView: UIView = nil
    backgroundView: UIView = new UIView(this.view.elementID + "BackgroundView").configuredWithObject({
        style: {
            background: "linear-gradient(" + UIColor.whiteColor.stringValue + ", " + UIColor.blueColor.stringValue + ")",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat"
        }
    })
    bottomBarView: UIView = nil

    _contentViewController: UIViewController
    contentViewControllers: UIRootViewControllerLazyContentViewControllersObject = {
        mainViewController: this.lazyViewControllerObjectWithClass(UIViewController)
    }

    _detailsDialogView: UIDialogView = new UIDialogView(this.view.elementID + "DetailsDialogView")
        .configuredWithObject({
            dismiss: EXTEND((animated: boolean) => {
                const route = UIRoute.currentRoute
                this.detailsViewControllers.allValues.forEach(
                    value => route.routeByRemovingComponentNamed(value.class.routeComponentName)
                )
                route.apply()
            }
            )
        })
    _detailsViewController: UIViewController
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





    async handleRoute(route: UIRoute) {

        super.handleRoute(route)

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
            this.detailsViewController = nil
            this._detailsDialogView.dismiss()
            this.view.setNeedsLayout()
            return
        }
        this.detailsViewController = detailsViewControllerObject.instance
    }

    get contentViewController(): UIViewController {
        return this._contentViewController || nil
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

        this.contentViewController.view.style.boxShadow = "0 3px 6px 0 rgba(0, 0, 0, 0.1)"

        this.view.setNeedsLayout()

    }


    get detailsViewController(): UIViewController {
        return this._detailsViewController
    }

    set detailsViewController(controller: UIViewController) {

        if (this.detailsViewController == controller) {
            return
        }

        if (this.detailsViewController) {
            this.removeChildViewController(this.detailsViewController)
        }

        this._detailsViewController = controller

        if (!IS(controller)) {
            return
        }

        this.addChildViewControllerInDialogView(controller, this._detailsDialogView)
        this._triggerLayoutViewSubviews()

        this.detailsViewController.view.style.borderRadius = "5px"

        this._detailsDialogView.showInView(this.view, YES)

    }

    updatePageScale() {

        const actualPageWidth = (UIView.pageWidth * UIView.pageScale).integerValue
        const minScaleWidth = 700
        const maxScaleWidth = 1500
        const minScale = 0.7
        const maxScale = 1
        let scale = minScale + (maxScale - minScale) *
            ((actualPageWidth - minScaleWidth) / (maxScaleWidth - minScaleWidth))
        scale = Math.min(scale, maxScale)
        scale = Math.max(scale, minScale)

        UIView.pageScale = scale

    }


    performDefaultLayout(
        paddingLength = 20,
        contentViewMaxWidth = 1000,
        topBarHeight = 65,
        bottomBarMinHeight = 100
    ) {

        // View bounds
        const bounds = this.view.bounds

        this.topBarView.frame = new UIRectangle(0, 0, topBarHeight, bounds.width)

        this.backgroundView.style.top = "" + this.topBarView.frame.height.integerValue + "px"
        this.backgroundView.style.width = "100%"
        this.backgroundView.style.height = "fit-content"
        this.backgroundView.style.minHeight = "" +
            (bounds.height - this.topBarView.frame.height - this.bottomBarView.frame.height).integerValue + "px"

        this.contentViewController.view.style.position = "relative"
        this.contentViewController.view.style.bottom = "0"
        this.contentViewController.view.style.top = "0"
        this.contentViewController.view.style.width = "100%"
        this.contentViewController.view.setPaddings(nil, nil, paddingLength, nil)
        this.contentViewController.view.setNeedsLayout()

        if (contentViewMaxWidth < this.backgroundView.bounds.width) {

            this.contentViewController.view.style.marginBottom = "" +
                Math.min(
                    (this.backgroundView.bounds.width - contentViewMaxWidth) * 0.5,
                    paddingLength
                ).integerValue + "px"
            this.contentViewController.view.style.marginTop = "" +
                Math.min(
                    (this.backgroundView.bounds.width - contentViewMaxWidth) * 0.5,
                    paddingLength
                ).integerValue + "px"
            this.contentViewController.view.style.maxWidth = contentViewMaxWidth + "px"

            this.contentViewController.view.style.left = "" +
                ((this.backgroundView.bounds.width - this.contentViewController.view.bounds.width) * 0.5).integerValue +
                "px"

        }
        else {

            this.contentViewController.view.style.margin = ""
            this.contentViewController.view.style.left = ""
            this.contentViewController.view.style.maxWidth = ""

        }

        // Triggering immediate layout to ensure that the intrinsicContentHeight calculations work well
        this.contentViewController._triggerLayoutViewSubviews()

        let contentViewControllerViewHeight = this.contentViewController.view.intrinsicContentHeight(
            this.contentViewController.view.bounds.width
        )

        const detailsViewControllerViewHeight = FIRST_OR_NIL(this.detailsViewController).view.intrinsicContentHeight(
            this.contentViewController.view.bounds.width)
        if (detailsViewControllerViewHeight > contentViewControllerViewHeight) {
            contentViewControllerViewHeight = detailsViewControllerViewHeight
        }


        this.contentViewController.view.style.height = "" + contentViewControllerViewHeight.integerValue + "px"
        this.contentViewController.view.setNeedsLayout()

        if (IS(this.detailsViewController)) {

            this.contentViewController.view.style.transform = "translateX(" + 0 + "px)"

            this.detailsViewController.view.frame = this.backgroundView.frame.rectangleWithInset(
                paddingLength
            ).rectangleWithWidth(
                this.contentViewController.view.bounds.width,
                0.5
            ).rectangleWithHeight(
                Math.max(
                    this.detailsViewController.view.intrinsicContentHeight(
                        this.detailsViewController.view.bounds.width
                    ),
                    this.contentViewController.view.bounds.height
                )
            )

        }
        else {

            this.contentViewController.view.style.transform = "translateX(" + 0 + "px)"

        }


        this.bottomBarView.frame = this.backgroundView.frame.rectangleWithY(
            this.backgroundView.frame.max.y
        ).rectangleWithHeight(
            Math.max(bottomBarMinHeight, this.bottomBarView.intrinsicContentHeight(this.backgroundView.frame.width))
        )


        wrapInNil(this._detailsDialogView).setMaxSizes(this.bottomBarView.frame.max.y)

    }


}
