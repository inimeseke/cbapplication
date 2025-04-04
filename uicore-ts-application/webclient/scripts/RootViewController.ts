import { CBCore, SocketClient } from "cbcore-ts"
import {
    CALL, IF,
    IS,
    IS_NOT,
    nil,
    UINativeScrollView,
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
import { ProcurementViewController } from "./ProcurementViewController"
import { SomeContentViewController } from "./SomeContentViewController"
import { TopBarView } from "./TopBarView"
import {
    TreeViewViewController
} from "./TreeViewViewController"
import {
    ChartViewController
} from "./ChartViewController"
import { ChatGPTViewController } from "./ChatGPTViewController";

export class RootViewController extends UIRootViewController {
    
    override readonly topBarView: TopBarView = new TopBarView("TopBarView", nil).configuredWithObject({
        titleLabel: { setText: CALL("topBarTitle", "UICore application") }
    }).addedAsSubviewToView(this.view)
    
    override readonly bottomBarView: BottomBarView = new BottomBarView("BottomBarView").configuredWithObject({
        style: { overflow: "hidden" }
    }).addedAsSubviewToView(this.view)
    
    readonly languagesDialogViewController = new UIViewController(new LanguagesDialogView("LanguagesDialogView"))
    
    override contentViewControllers = {
        
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
        mainViewController: this.lazyViewControllerObjectWithClass(SomeContentViewController),
        treeViewViewController: this.lazyViewControllerObjectWithClass(TreeViewViewController),
        chartViewController: this.lazyViewControllerObjectWithClass(ChartViewController),
        chatGPTViewController: this.lazyViewControllerObjectWithClass(ChatGPTViewController),
        procurementViewController: this.lazyViewControllerObjectWithClass(ProcurementViewController)
    }
    private editor?: EditorViewController
    private editorWindow?: WindowProxy
    
    
    constructor(view: UIView) {
        
        super(view)
        
        UITextView.defaultTextColor = CBColor.primaryContentColor
        
        document.addEventListener("keydown", event => {
            if (event.ctrlKey && ["e", "w"].contains(event.key)) {
                const isEditorOpen = IS(UIRoute.currentRoute.componentWithName("settings")?.parameters["editorOpen"])
                if (!isEditorOpen) {
                    UIRoute.currentRoute.routeBySettingParameterInComponent(
                        "settings",
                        "editorOpen",
                        IF(event.key == "e")(() => "YES").ELSE(() => "WINDOW")
                    ).applyByReplacingCurrentRouteInHistory()
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
    
    override async viewDidAppear() {
        
        await super.viewDidAppear()
        
        this.topBarView.setNeedsLayout()
        
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        await super.handleRoute(route)
        
        // @ts-ignore
        LanguageService.updateCurrentLanguageKey(route)
        
        const currentURL = "" + window.location
        if (IS(currentURL)) {
            SocketClient.RouteDidChange(currentURL).then(nil)
        }
        
        const editorParameterValue: string = route.componentWithName("settings")?.parameters["editorOpen"]
        if (editorParameterValue) {
            this.showEditor(editorParameterValue.toUpperCase() == "WINDOW")
        }
        else {
            this.hideEditor()
        }
        
    }
    
    
    override viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.viewDidReceiveBroadcastEvent(event)
        
        const userLoggingEventNames: string[] = [
            CBCore.broadcastEventName.userDidLogIn,
            CBCore.broadcastEventName.userDidLogOut
        ]
        if (userLoggingEventNames.contains(event.name)) {
            
            this.handleRoute(UIRoute.currentRoute).then(nil)
            
        }
        
        if (event.name == UIView.broadcastEventName.LanguageChanged) {
            
            this.detailsViewController = nil
            this._detailsDialogView.dismiss()
            this._triggerLayoutViewSubviews()
            
        }
        
    }
    
    
    async showEditor(separateWindow: boolean) {
        
        if (separateWindow) {
            
            // @ts-ignore
            this.editorWindow = window.open(
                window.location.origin + "/#cb_editor[]",
                "CBEditorWindow",
                "popup"
            )
            
            if (this.editorWindow) {
                
                // @ts-ignore
                this.editor = this.editorWindow.editorViewController
                
                // @ts-ignore
                const screenDetails = await window.getScreenDetails?.()
                
                // @ts-ignore
                if (window.screen.isExtended && screenDetails?.screens?.length > 1) {
                    const secondScreen = screenDetails.screens.find((screen: any) => !screen.isPrimary)
                    this.editorWindow.resizeTo(secondScreen.availWidth, secondScreen.availHeight)
                    this.editorWindow.moveTo(secondScreen.availLeft, secondScreen.availTop)
                    
                }
                
                const timer = setInterval(async () => {
                    if (this.editorWindow?.closed ?? true) {
                        clearInterval(timer)
                        UIRoute.currentRoute
                            .routeByRemovingParameterInComponent("settings", "editorOpen")
                            .apply()
                        await SocketClient.EditorWasClosed()
                    }
                }, 100)
                
            }
            
            
        }
        else {
            
            if (IS_NOT(this.editor)) {
                this.editor = new EditorViewController(new UINativeScrollView("CBEditorView"))
            }
            
            this.editor.view.pointerDraggingPoint = new UIPoint(0, 0)
            this.editor?.viewWillAppear()
            this.editor?.view.willAppear()
            this.addChildViewController(this.editor)
            this.editor?.viewDidAppear()
            
        }
        
    }
    
    hideEditor() {
        
        if (this.editorWindow) {
            
            this.editorWindow?.close()
            this.editorWindow = undefined
            this.editor = undefined
            
        }
        else {
            
            this.editor?.viewWillDisappear()
            this.editor?.removeFromParentViewController()
            this.editor?.viewDidDisappear()
            this.editor = undefined
            
        }
        
        
    }
    
    override updateViewStyles() {
    
    }
    
    override viewDidLayoutSubviews() {
        
        super.viewDidLayoutSubviews()
        
    }
    
    
    override layoutViewSubviews() {
        
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





