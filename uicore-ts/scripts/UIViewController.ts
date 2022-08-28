import { UIDialogView } from "./UIDialogView"
import { FIRST_OR_NIL, IS, nil, NO, UIObject, YES } from "./UIObject"
import { UIRoute } from "./UIRoute"
import { UIView, UIViewBroadcastEvent } from "./UIView"





export class UIViewController extends UIObject {
    
    
    
    parentViewController: UIViewController = nil
    childViewControllers: UIViewController[] = []
    static readonly routeComponentName: string
    static readonly ParameterIdentifierName: any
    
    constructor(public view: UIView) {
        
        super()
        
        this.view.viewController = this
        
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
        
        this.view.layoutSubviews()
        
        this.viewDidLayoutSubviews()
        
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
            //this.view.addSubview(viewController.view);
            //viewController.didMoveToParentViewController(this);
        }
    }
    
    
    removeFromParentViewController() {
        const index = this.parentViewController.childViewControllers.indexOf(this)
        if (index > -1) {
            this.parentViewController.childViewControllers.splice(index, 1)
            //this.view.removeFromSuperview();
            this.parentViewController = nil
        }
    }
    
    willMoveToParentViewController(parentViewController) {
    
    }
    
    
    didMoveToParentViewController(parentViewController: UIViewController) {
        
        this.parentViewController = parentViewController
        
    }
    
    removeChildViewController(controller: UIViewController) {
    
        controller = FIRST_OR_NIL(controller)
        controller.viewWillDisappear()
        if (IS(controller.parentViewController)) {
            controller.removeFromParentViewController()
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
        controller.didMoveToParentViewController(this)
        controller.viewDidAppear()
    
        controller.handleRouteRecursively(UIRoute.currentRoute)
    
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
        
        controller.didMoveToParentViewController(this)
        controller.viewDidAppear()
    
        controller.handleRouteRecursively(UIRoute.currentRoute)
        
    }
    
    
    
    
    
}


















