import { CBLocalizedTextObject } from "cbcore-ts/compiledScripts/CBDataInterfaces"
import {
    IF,
    IS,
    nil,
    NO,
    UIActionIndicator,
    UIButton,
    UIColor,
    UICore,
    UIDialogView, UIFunctionExtender,
    UIImageView,
    UINativeScrollView,
    UIObject,
    UIRectangle,
    UIScrollView,
    UITextView,
    UIView,
    YES
} from "uicore-ts"
import { LanguageService } from "../LanguageService"
import { CBColor } from "./CBColor"
import { CBDialogView } from "./CBDialogView"
import { CBTextField } from "./CBTextField"


export class CBDialogViewShower<DialogViewViewType extends CBDialogView = CBDialogView> extends UIObject {
    
    dialogView: UIDialogView<DialogViewViewType>
    static currentDialogViewShower: CBDialogViewShower | undefined | null
    static nextShowDialogFunctions: Function[] = []
    static currentActionIndicatorDialogViewShower: CBDialogViewShower = nil
    
    constructor(elementID?: string, core?: UICore) {
        
        super()
        
        // @ts-ignore
        this.dialogView = new UIDialogView<CBDialogView>()
        // @ts-ignore
        this.dialogView.view = new CBDialogView(elementID)
        this.dialogView.view.backgroundColor = UIColor.whiteColor
        
        this.dialogView.core = this.dialogView.core || core
        
        const dialogLayoutFunction = this.dialogView.layoutSubviews.bind(this.dialogView)
        this.dialogView.layoutSubviews = () => {
            
            dialogLayoutFunction()
            
            const superview = this.dialogView.superview
            const superviewBounds: UIRectangle = IF(superview?.isKindOfClass(UINativeScrollView))(
                () => superview?.scrollSize)
                .ELSE_IF(superview?.isKindOfClass(UIScrollView))(() => superview?.scrollSize)
                .ELSE(() => superview?.frame)
            const height = superviewBounds.height || window.innerHeight
            const width = superviewBounds.width || window.innerWidth
            
            this.dialogView.view.frame = new UIRectangle(
                0,
                0,
                height,
                width
            ).rectangleWithHeight(
                this.dialogView.view.intrinsicContentHeight(this.getDialogWidth()),
                0.5
            ).rectangleWithWidth(this.getDialogWidth(), 0.5)
            
            this.dialogView.frame = this.dialogView.core.rootViewController.view.bounds
            
            
        }
        
        
        this.dialogView.view.yesButton.addTargetForControlEvents([
            UIButton.controlEvent.PointerUpInside, UIButton.controlEvent.EnterDown
        ], () => this.yesButtonWasPressed())
        
        this.dialogView.view.noButton.addTargetForControlEvents([
            UIButton.controlEvent.PointerUpInside, UIButton.controlEvent.EnterDown
        ], () => this.noButtonWasPressed())
        
    }
    
    
    getDialogWidth() {
        
        const padding = this.dialogView.core.paddingLength
        const labelHeight = padding * 0.75
        
        let result = 250
        
        const width = this.dialogView.view.titleLabel.intrinsicContentWidth() + padding * 2
        
        result = Math.max(
            result,
            this.dialogView.view.view.intrinsicContentWidth(
                this.dialogView.view.view.viewHTMLElement.naturalHeight || 1000000000
            )
        )
        
        result = [
            result,
            this.dialogView.view.intrinsicContentWidth(
                this.dialogView.view.viewHTMLElement.naturalHeight || 1000000000
            ) + padding * 2
        ].max()
        
        result = Math.max(result, width)
        result = Math.min(result, 1000)
        
        const dialogMaxWidth = (this.dialogView.superview ||
            { "bounds": new UIRectangle(0, 0, 0, result) }).bounds.width
        
        result = Math.min(result, dialogMaxWidth)
        
        return result
        
    }
    
    
    yesButtonWasPressed() {
        
        
    }
    
    noButtonWasPressed() {
        
        
    }
    
    
    cancelButtonWasPressed() {
        
        
    }
    
    
    showQuestionDialogInRootView(
        titleTextObject?: CBLocalizedTextObject,
        questionTextObject?: CBLocalizedTextObject,
        rootView = UICore.main.rootViewController.view
    ) {
        
        this.dialogView.view.initTitleLabelIfNeeded()
        this.dialogView.view.titleLabel.localizedTextObject = titleTextObject
        
        this.dialogView.view.initQuestionLabelIfNeeded()
        
        if (IS(questionTextObject)) {
            this.dialogView.view.questionLabel.localizedTextObject = questionTextObject
        }
        
        this.dialogView.view.initYesNoButtonsIfNeeded()
        
        this.dialogView.view.noButton.addTargetForControlEvents([
            UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
        ], () => this.noButtonWasPressed())
        
        this.dialogView.view.yesButton.addTargetForControlEvents([
            UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
        ], () => this.yesButtonWasPressed())
        
        
        this.dialogView.showInView(rootView, YES)
        
    }
    
    showQuestionDialogWithTextFieldInRootView(
        titleTextObject?: CBLocalizedTextObject,
        questionTextObject?: CBLocalizedTextObject
    ) {
        
        this.dialogView.view.initTitleLabelIfNeeded()
        this.dialogView.view.titleLabel.localizedTextObject = titleTextObject
        
        this.dialogView.view.initQuestionLabelIfNeeded()
        
        if (IS(questionTextObject)) {
            this.dialogView.view.questionLabel.localizedTextObject = questionTextObject
        }
        
        this.dialogView.view.view = new CBTextField()
        
        this.dialogView.view.initYesNoButtonsIfNeeded()
        
        this.dialogView.view.noButton.addTargetForControlEvents([
            UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
        ], () => this.noButtonWasPressed())
        
        this.dialogView.view.yesButton.addTargetForControlEvents([
            UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
        ], () => this.yesButtonWasPressed())
        
        
        this.dialogView.showInRootView(YES)
        
    }
    
    showMessageDialogInRootView(
        titleTextObject?: CBLocalizedTextObject,
        rootView = UICore.main.rootViewController.view
    ) {
        
        this.dialogView.view.initTitleLabelIfNeeded()
        this.dialogView.view.titleLabel.localizedTextObject = titleTextObject
        
        this.dialogView.view.initCancelButtonIfNeeded()
        
        this.dialogView.view.cancelButton.controlEventTargetAccumulator
            .EnterDown.PointerUpInside = () => this.cancelButtonWasPressed()
        
        this.dialogView.showInView(rootView, YES)
        this.dialogView.view.cancelButton.focus()
        
    }
    
    showDialogInRootView(view: UIView) {
        
        this.dialogView.view.view = view
        this.dialogView.view.initCancelButtonIfNeeded()
        
        this.dialogView.view.cancelButton.controlEventTargetAccumulator
            .EnterDown.PointerUpInside = () => this.cancelButtonWasPressed()
        
        this.dialogView.showInRootView(YES)
        this.dialogView.view.cancelButton.focus()
        
    }
    
    
    showImageDialogInRootView(imageURL: string, deleteImageCallback?: Function) {
        
        const loadingLabel = new UITextView()
        
        loadingLabel.text = "Loading image."
        
        loadingLabel.textAlignment = UITextView.textAlignment.center
        
        this.dialogView.view.view = loadingLabel
        
        
        const imageView = new UIImageView()
        
        imageView.imageSource = imageURL
        
        imageView.viewHTMLElement.onload = () => {
            this.dialogView.view.view = imageView
            
            imageView.setNeedsLayoutUpToRootView()
        }
        
        imageView.fillMode = UIImageView.fillMode.aspectFitIfLarger
        
        
        if (IS(deleteImageCallback)) {
            
            this.dialogView.view.initYesNoButtonsIfNeeded()
            this.dialogView.view.yesButton.titleLabel.text = "Close"
            this.dialogView.view.noButton.titleLabel.text = "Delete"
            this.dialogView.view.noButtonDismissesDialog = NO
            
            this.dialogView.view.noButton.addTargetForControlEvents([
                UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
            ], () => {
                
                const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(() => {
                    
                    //this.dialogView.dismiss()
                    
                })
                
                const textObject = LanguageService.localizedTextObjectForText("Delete this image.")
                
                dialogShower.showQuestionDialogInRootView(textObject)
                
                dialogShower.yesButtonWasPressed = () => {
                    
                    deleteImageCallback()
                    dialogShower.dialogView.dismiss()
                    
                }
                
            })
            
            this.dialogView.view.yesButton.addTargetForControlEvents([
                UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside
            ], () => this.dialogView.dismiss())
            
        }
        else {
            
            this.dialogView.view.initCancelButtonIfNeeded()
            this.dialogView.view.cancelButton.titleLabel.text = "Close"
            
        }
        
        
        this.dialogView.showInRootView(YES)
        this.dialogView.view.cancelButton.focus()
        
        
    }
    
    showActionIndicatorDialogInRootView(message: string, rootView = UICore.main.rootViewController.view) {
        
        const actionIndicator = new UIActionIndicator()
        
        this.dialogView.zIndex = 150
        this.dialogView.view.view = actionIndicator
        actionIndicator.style.minHeight = "100px"
        
        this.dialogView.view.initQuestionLabelIfNeeded()
        this.dialogView.view.questionLabel.text = message
        
        actionIndicator.start()
        
        this.dialogView.view.backgroundColor = CBColor.primaryContentColor.colorWithAlpha(0.5)
        this.dialogView.view.questionLabel.textColor = UIColor.whiteColor
        
        this.dialogView.dismissesOnTapOutside = NO
        
        CBDialogViewShower.currentActionIndicatorDialogViewShower = this
        
        this.dialogView.showInView(rootView, NO)
        this.dialogView.view.cancelButton.focus()
        
    }
    
    
    static showNextDialog() {
        
        (CBDialogViewShower.nextShowDialogFunctions.firstElement || nil)()
        CBDialogViewShower.nextShowDialogFunctions.removeElementAtIndex(0)
        
    }
    
    
    static alert(text: string, dismissCallback: Function = nil, rootView = UICore.main.rootViewController.view) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback)
        const textObject = LanguageService.localizedTextObjectForText(text)
        const showDialogFunction = dialogShower.showMessageDialogInRootView.bind(dialogShower, textObject, rootView)
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
    }
    
    
    static localizedAlert(textObject: CBLocalizedTextObject, dismissCallback: Function = nil) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback)
        const showDialogFunction = dialogShower.showMessageDialogInRootView.bind(dialogShower, textObject)
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
    }
    
    
    static showQuestionDialog(questionText: string, dismissCallback: Function = nil) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback)
        const textObject = LanguageService.localizedTextObjectForText(questionText)
        const showDialogFunction = dialogShower.showQuestionDialogInRootView.bind(dialogShower, textObject)
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
        return dialogShower
        
    }
    
    static showQuestionDialogWithTextField(
        questionText: string,
        dismissCallback: Function = nil,
        rootView = UICore.main.rootViewController.view
    ) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback) as CBDialogViewShower<CBDialogView<CBTextField>>
        const textObject = LanguageService.localizedTextObjectForText(questionText)
        const showDialogFunction = () => dialogShower.showQuestionDialogInRootView(textObject, undefined, rootView)
        dialogShower.dialogView.view.initQuestionLabelIfNeeded = nil
        dialogShower.dialogView.view.view = new CBTextField()
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
        dialogShower.dialogView.view.view.textField.focus()
        
        return dialogShower
        
    }
    
    
    static showImageDialog(imageURL: string, deleteImageCallback: Function = nil, dismissCallback: Function = nil) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback)
        
        const showDialogFunction = dialogShower.showImageDialogInRootView.bind(
            dialogShower,
            imageURL,
            deleteImageCallback
        )
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
        return dialogShower
        
        
    }
    
    static showDialog(view: UIView, dismissCallback: Function = nil) {
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(dismissCallback)
        const showDialogFunction = dialogShower.showDialogInRootView.bind(dialogShower, view)
        CBDialogViewShower._showDialogWithFunction(showDialogFunction, dialogShower)
        
        return dialogShower
        
    }
    
    static showActionIndicatorDialog(message: string, dismissCallback: () => void = nil, rootView?: UIView) {
        
        if (IS(CBDialogViewShower.currentActionIndicatorDialogViewShower)) {
            
            CBDialogViewShower.currentActionIndicatorDialogViewShower.dialogView.view.questionLabel.text = message
            CBDialogViewShower.currentActionIndicatorDialogViewShower.dialogView.view.setNeedsLayoutUpToRootView()
            return
            
        }
        
        const dialogShower = CBDialogViewShower._dialogShowerWithDismissCallback(
            UIFunctionExtender.functionByExtendingFunction(
                () => {
                    if (CBDialogViewShower.currentActionIndicatorDialogViewShower == dialogShower) {
                        CBDialogViewShower.currentActionIndicatorDialogViewShower = nil
                    }
                },
                dismissCallback
            )
        )
        
        dialogShower.showActionIndicatorDialogInRootView(message, rootView)
        return dialogShower
        
    }
    
    
    static hideActionIndicatorDialog() {
        
        CBDialogViewShower.currentActionIndicatorDialogViewShower.dialogView.dismiss()
        
        CBDialogViewShower.currentActionIndicatorDialogViewShower = nil
        
    }
    
    
    private static _dialogShowerWithDismissCallback(dismissCallback: Function) {
        
        const dialogShower = new CBDialogViewShower()
        const dismissFunction = dialogShower.dialogView.dismiss.bind(dialogShower.dialogView)
        
        dialogShower.dialogView.dismiss = function () {
            dismissFunction()
            dismissCallback()
            CBDialogViewShower.currentDialogViewShower = null
            CBDialogViewShower.showNextDialog()
        }
        
        return dialogShower
        
    }
    
    
    private static _showDialogWithFunction(showDialogFunction: any, dialogShower: CBDialogViewShower) {
        
        if (IS(CBDialogViewShower.currentDialogViewShower)) {
            
            CBDialogViewShower.nextShowDialogFunctions.push(showDialogFunction)
            
        }
        else {
            
            CBDialogViewShower.currentDialogViewShower = dialogShower
            showDialogFunction()
            
        }
        
    }
    
    
}






































