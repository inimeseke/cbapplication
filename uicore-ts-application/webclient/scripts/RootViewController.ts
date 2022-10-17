import { CBCore, SocketClient } from "cbcore-ts"
import {
    CALL,
    IS,
    IS_NOT,
    nil,
    UIPoint,
    UIRootViewController,
    UIRoute,
    UITextView,
    UIView,
    UIViewBroadcastEvent,
    UIViewController,
    YES
} from "uicore-ts"
import { BottomBarView } from "./BottomBarView"
import { CBColor } from "./Custom components/CBColor"
import { EditorViewController } from "./EditorViewController"
import { InformationViewController } from "./InformationViewController"
import { InternalDropdownSettingsViewController } from "./InternalDropdownSettingsViewController"
import { InternalLanguageSettingsViewController } from "./InternalLanguageSettingsViewController"
import { LanguagesDialogView } from "./LanguagesDialogView"
import { LanguageService } from "./LanguageService"
import { SomeContentViewController } from "./SomeContentViewController"
import { TopBarView } from "./TopBarView"


export class RootViewController extends UIRootViewController {
    
    readonly topBarView: TopBarView = new TopBarView("TopBarView", nil).configuredWithObject({
        titleLabel: { setText: CALL("topBarTitle", "UICore application") }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    readonly bottomBarView: BottomBarView = new BottomBarView("BottomBarView").configuredWithObject({
        style: { overflow: "hidden" }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    readonly languagesDialogViewController = new UIViewController(new LanguagesDialogView("LanguagesDialogView"))
    
    contentViewControllers = {
        
        informationViewController: this.lazyViewControllerObjectWithClass(InformationViewController),
        internalDropdownSettingsViewController: this.lazyViewControllerObjectWithClass(
            InternalDropdownSettingsViewController,
            async () =>
                IS((await SocketClient.AreCBInternalSettingsAvailableForCurrentUser()).result) || YES
        ),
        internalLanguageSettingsViewController: this.lazyViewControllerObjectWithClass(
            InternalLanguageSettingsViewController,
            async () =>
                IS((await SocketClient.AreCBInternalSettingsAvailableForCurrentUser()).result) || YES
        ),
        mainViewController: this.lazyViewControllerObjectWithClass(SomeContentViewController)
        
    }
    private editor?: EditorViewController
    
    
    constructor(view: UIView) {
        
        super(view)
        
        UITextView.defaultTextColor = CBColor.primaryContentColor
        
        document.addEventListener("keydown", event => {
            if (event.ctrlKey && event.key === "e") {
                const isEditorOpen = IS(UIRoute.currentRoute.componentWithName("settings").parameters["editorOpen"])
                if (!isEditorOpen) {
                    UIRoute.currentRoute.routeBySettingParameterInComponent("settings", "editorOpen", "YES")
                        .applyByReplacingCurrentRouteInHistory()
                }
                else {
                    UIRoute.currentRoute.routeByRemovingParameterInComponent("settings", "editorOpen")
                        .applyByReplacingCurrentRouteInHistory()
                }
            }
        })
        
        
        // Initializing CBCore if needed
        CBCore.initIfNeededWithViewCore(this.view.core)
        
    }
    
    async viewDidAppear() {
        
        await super.viewDidAppear()
        
        this.topBarView.setNeedsLayout()
        
    }
    
    
    async handleRoute(route: UIRoute) {
        
        await super.handleRoute(route)
        
        LanguageService.updateCurrentLanguageKey(route)
        
        const currentURL = "" + window.location
        if (IS(currentURL)) {
            SocketClient.RouteDidChange(currentURL).then(nil)
        }
        
        if (route.componentWithName("settings").parameters["editorOpen"]) {
            this.showEditor()
        }
        else {
            this.hideEditor()
        }
        
    }
    
    
    viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.viewDidReceiveBroadcastEvent(event)
        
        if ([CBCore.broadcastEventName.userDidLogIn, CBCore.broadcastEventName.userDidLogOut].contains(event.name)) {
            
            this.handleRoute(UIRoute.currentRoute).then(nil)
            
        }
        
        if (event.name == UIView.broadcastEventName.LanguageChanged) {
            
            this.detailsViewController = nil
            this._detailsDialogView.dismiss()
            this._triggerLayoutViewSubviews()
            
        }
        
    }
    
    showEditor() {
    
        if (IS_NOT(this.editor)) {
            this.editor = new EditorViewController(new UIView("CBEditorView"))
        }
    
        this.editor.view.pointerDraggingPoint = new UIPoint(0, 0)
        this.editor?.viewWillAppear()
        this.editor?.view.willAppear()
        this.addChildViewController(this.editor)
        this.editor?.viewDidAppear()
    
        UIView.shouldCallPointerUpInsideOnView(this.view).then(nil)
    
    }
    
    hideEditor() {
        
        this.editor?.viewWillDisappear()
        this.editor?.removeFromParentViewController()
        this.editor?.viewDidDisappear()
        this.editor = nil
        
    }
    
    updateViewStyles() {
    
    }
    
    viewDidLayoutSubviews() {
        
        super.viewDidLayoutSubviews()
        
    }
    
    
    layoutViewSubviews() {
        
        super.layoutViewSubviews()
        
        this.updatePageScale({
            minScaleWidth: 700,
            maxScaleWidth: 1500,
            minScale: 0.7,
            maxScale: 1
        })
        
        this.performDefaultLayout({
            paddingLength: this.core.paddingLength,
            contentViewMaxWidth: 1000,
            topBarHeight: 65,
            bottomBarMinHeight: 100
        })
        
    }
    
}





