import { UIDialogView } from "./UIDialogView"
import { FIRST_OR_NIL, IS, NO, UIObject, YES } from "./UIObject"
import { UIRoute } from "./UIRoute"
import { UIView, UIViewBroadcastEvent } from "./UIView"


export class UIViewController extends UIObject {
    
    
    parentViewController?: UIViewController
    childViewControllers: UIViewController[] = []
    static readonly routeComponentName: string
    static readonly ParameterIdentifierName: any
    
    constructor(public view: UIView) {
        
        super()
        
        this.view.viewController = this
        
    }
    
    
    get routeComponent() {
        return UIRoute.currentRoute.componentWithViewController(this.class)
    }
    
    /**
     * Kicks off `handleRoute` on this controller and, in the same synchronous
     * tick and iteration order as before, on every child - preserving the
     * original fire-and-forget timing exactly. The returned promise resolves
     * only once this controller's own `handleRoute` and the entire child
     * subtree's `handleRouteRecursively` calls have settled, so a caller that
     * wants to serialize successive route applications (see `UICore`'s
     * `hashDidChange` handling) can `await` full completion. Existing callers
     * that ignore the return value keep behaving exactly as before.
     */
    async handleRouteRecursively(route: UIRoute): Promise<void> {

        const handleRoutePromise = this.handleRoute(route)

        const childHandleRoutePromises = this.childViewControllers.map(controller =>
            controller.handleRouteRecursively(route)
        )

        await Promise.all([handleRoutePromise, ...childHandleRoutePromises])

    }
    
    async handleRoute(route: UIRoute) {
    
    
    }
    
    
    async viewWillAppear() {
    
    
    }
    
    
    async viewDidAppear() {
    
    
    }
    
    
    async viewWillDisappear() {
    
    
    }
    
    async viewDidDisappear() {
    
    
    }
    
    
    updateViewConstraints() {
    
    
    }
    
    updateViewStyles() {
    
    
    }
    
    layoutViewSubviews() {
    
    
    }
    
    _triggerLayoutViewSubviews() {
        
        if (this.view.needsLayout) {
            
            this.view.layoutSubviews()
            
            this.viewDidLayoutSubviews()
            
        }
        
    }
    
    viewWillLayoutSubviews() {
        
        this.updateViewConstraints()
        this.updateViewStyles()
        
    }
    
    viewDidLayoutSubviews() {
        
        // this.childViewControllers.forEach(function (controller, index, controllers) {
        
        //     controller._layoutViewSubviews();
        
        // })
        
        
    }
    
    
    viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
    
    
    }
    
    
    get core() {
        return this.view.core
    }
    
    hasChildViewController(viewController: UIViewController) {
        
        // This is for performance reasons
        if (!IS(viewController)) {
            return NO
        }
        
        for (let i = 0; i < this.childViewControllers.length; i++) {
            
            const childViewController = this.childViewControllers[i]
            
            if (childViewController == viewController) {
                return YES
            }
            
        }
        
        return NO
        
    }
    
    addChildViewController(viewController: UIViewController) {
        if (!this.hasChildViewController(viewController)) {
            viewController.willMoveToParentViewController(this)
            this.childViewControllers.push(viewController)
            this.view.addSubview(viewController.view)
            viewController.didMoveToParentViewController(this)
        }
    }
    
    
    removeFromParentViewController() {
        
        this.parentViewController?.removeChildViewController(this)
        
    }
    
    willMoveToParentViewController(parentViewController: UIViewController) {
    
    }
    
    
    didMoveToParentViewController(parentViewController: UIViewController) {
        
        this.parentViewController = parentViewController
        
    }
    
    removeChildViewController(controller: UIViewController) {
        
        controller = FIRST_OR_NIL(controller)
        controller.viewWillDisappear()
        if (IS(controller.parentViewController)) {
            
            const index = controller.parentViewController?.childViewControllers.indexOf(controller) ?? -1
            if (index > -1) {
                controller.parentViewController?.childViewControllers.splice(index, 1)
                controller.parentViewController = undefined
            }
            
        }
        this.childViewControllers.removeElement(controller)
        if (IS(controller.view)) {
            controller.view.removeFromSuperview()
        }
        else {
            var asd = 1
        }
        controller.viewDidDisappear()
        
    }
    
    
    addChildViewControllerInContainer(controller: UIViewController, containerView: UIView) {
        
        controller = FIRST_OR_NIL(controller)
        containerView = FIRST_OR_NIL(containerView)
        
        if (!this.hasChildViewController(controller)) {
            controller.viewWillAppear()
            controller.willMoveToParentViewController(this)
            this.childViewControllers.push(controller)
            containerView.addSubview(controller.view)
            controller.didMoveToParentViewController(this)
            controller.handleRouteRecursively(UIRoute.currentRoute)
            controller.didMoveToParentViewController(this)
            controller.viewDidAppear()
        }
        
    }
    
    addChildViewControllerInDialogView(controller: UIViewController, dialogView: UIDialogView) {

        controller = FIRST_OR_NIL(controller)
        dialogView = FIRST_OR_NIL(dialogView)
        controller.viewWillAppear()
        // Register as a child view controller (needed for routing recursion and
        // parent tracking) WITHOUT `addChildViewController`'s own DOM attachment
        // (`this.view.addSubview(controller.view)`) - this controller's view
        // belongs inside `dialogView`, not directly inside `this.view`. The very
        // next line already attaches it to `dialogView` correctly; attaching it
        // to `this.view` first (as `addChildViewController` would) only gets
        // silently corrected in the DOM by the native `appendChild` re-parenting
        // `dialogView.view = ...` performs - `this.view`'s own `subviews` array
        // bookkeeping is never cleaned up to match, leaving a permanently stale
        // entry that a later layout pass can use to resurrect this controller's
        // view directly under `this.view`, even after it has been correctly
        // dismissed and removed from `dialogView`.
        if (!this.hasChildViewController(controller)) {
            controller.willMoveToParentViewController(this)
            this.childViewControllers.push(controller)
            controller.didMoveToParentViewController(this)
        }
        dialogView.view = controller.view
        
        const originalDismissFunction = dialogView.dismiss.bind(dialogView)
        
        dialogView.dismiss = animated => {
            
            originalDismissFunction(animated)
            
            this.removeChildViewController(controller)
            
        }
        
        controller.handleRouteRecursively(UIRoute.currentRoute)
        
        controller.didMoveToParentViewController(this)
        controller.viewDidAppear()
        
    }
    
    
}
