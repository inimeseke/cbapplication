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
    
    handleRouteRecursively(route: UIRoute) {
        
        this.handleRoute(route)
        
        this.childViewControllers.forEach(controller => {
            
            controller.handleRouteRecursively(route)
            
        })
        
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
            
            const index = this.parentViewController?.childViewControllers.indexOf(this) ?? -1
            if (index > -1) {
                this.parentViewController?.childViewControllers.splice(index, 1)
                this.view.removeFromSuperview()
                this.parentViewController = undefined
            }
            
        }
        if (IS(controller.view)) {
            controller.view.removeFromSuperview()
        }
        controller.viewDidDisappear()
        
    }
    
    
    addChildViewControllerInContainer(controller: UIViewController, containerView: UIView) {
        
        controller = FIRST_OR_NIL(controller)
        containerView = FIRST_OR_NIL(containerView)
        controller.viewWillAppear()
        this.addChildViewController(controller)
        containerView.addSubview(controller.view)
        
        controller.handleRouteRecursively(UIRoute.currentRoute)
        
        controller.didMoveToParentViewController(this)
        controller.viewDidAppear()
        
        
    }
    
    addChildViewControllerInDialogView(controller: UIViewController, dialogView: UIDialogView) {
        
        controller = FIRST_OR_NIL(controller)
        dialogView = FIRST_OR_NIL(dialogView)
        controller.viewWillAppear()
        this.addChildViewController(controller)
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


















