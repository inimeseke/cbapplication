import { CBDropdownDataItem, SocketClient } from "cbcore-ts"
import type * as monaco from "monaco-editor"
import { IPosition } from "monaco-editor"
import {
    IF,
    IS,
    IS_NOT,
    nil,
    NO,
    RETURNER,
    UIButton,
    UIColor,
    UIObject,
    UIRectangle,
    UIRoute,
    UITextView,
    UIView,
    UIViewController,
    wrapInNil,
    YES
} from "uicore-ts"
import { CBButton } from "./Custom components/CBButton"
import { CBColor } from "./Custom components/CBColor"
import { CBColorSelector } from "./Custom components/CBColorSelector"
import { CBDialogViewShower } from "./Custom components/CBDialogViewShower"
import { CBFlatButton } from "./Custom components/CBFlatButton"
import { CBTextField } from "./Custom components/CBTextField"
import { RowView } from "./Custom components/RowView"
import { CBEditorAnnotatedPropertyDescriptor, CBEditorPropertyDescriptor } from "./SocketClientFunctions"


interface UnwrappedPropertyDescriptor {
    object: UIObject
    className: string
    name: string
    isDeclaredInClassFile: boolean
    isReferencedInClassFile: boolean
    isInNodeModules: boolean
    isInDeclarationFile: boolean
}


interface PathKeyObject {
    
    containerObject?: UIView | UIViewController
    key: string
    
}


export class EditorViewController extends UIViewController {
    
    readonly titleLabel = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Editor",
        userInteractionEnabled: NO
    }).addedAsSubviewToView(this.view)
    
    closeButton = new CBButton().configuredWithObject({
        titleLabel: { text: "X" },
        controlEventTargetAccumulator: {
            PointerUpInside: () => UIRoute.currentRoute
                .routeByRemovingParameterInComponent("settings", "editorOpen")
                .applyByReplacingCurrentRouteInHistory()
        }
    }).addedAsSubviewToView(this.view)
    
    reloadButton = new CBButton().configuredWithObject({
        titleLabel: { text: "Reload files" },
        controlEventTargetAccumulator: {
            PointerUpInside: async () => {
                
                this.view.alpha = 0.5
                
                this.view.userInteractionEnabled = NO
                
                await SocketClient.ReloadEditorFiles()
                if (this._currentEditingView) {
                    await this.shouldCallPointerUpInsideOnView(this._currentEditingView, YES)
                }
                
            }
        }
    }).addedAsSubviewToView(this.view)
    
    saveButton = new CBButton().configuredWithObject({
        titleLabel: { text: "Save file" },
        controlEventTargetAccumulator: {
            PointerUpInside: async () => {
                
                this.view.alpha = 0.5
                
                this.view.userInteractionEnabled = NO
                
                // noinspection ES6RedundantAwait
                await SocketClient.SaveFile({
                    
                    className: this._currentClassName!,
                    valueString: await this._editor.getValue()
                    
                })
                
                if (this._currentEditingView) {
                    await this.shouldCallPointerUpInsideOnView(this._currentEditingView, YES)
                }
                
            }
        }
    }).addedAsSubviewToView(this.view)
    
    currentViewLabel = new UITextView().addedAsSubviewToView(this.view)
    
    addViewButton = new CBButton().configuredWithObject({
        titleLabel: { text: "Add view" },
        controlEventTargetAccumulator: {
            PointerUpInside: async () => {
    
                this.dialogContainer.addedAsSubviewToView(this.view.superview)
    
                const dialogViewShower = CBDialogViewShower.showQuestionDialogWithTextField(
                    "Insert a name for the new property",
                    () => {
            
                        this._editorViews.removeElement(dialogViewShower.dialogView)
                        this.dialogContainer.userInteractionEnabled = NO
            
                    },
                    this.dialogContainer
                )
                this.dialogContainer.userInteractionEnabled = YES
    
    
                const dialogView = dialogViewShower.dialogView
    
                dialogViewShower.yesButtonWasPressed = async () => {
        
                    const textField = dialogView.view.view
                    const propertyName = textField.textField.text
        
                    dialogView.dismiss()
        
                    //CBDialogViewShower.alert(propertyName, nil, this.dialogContainer)
        
        
                    const result = (await SocketClient.AddSubview({
            
                        className: this._currentClassName!,
                        propertyKey: propertyName,
                        runtimeObjectKeyPath: this.pathToViewFromRootViewController(this._currentEditingView!)
            
                    })).result
        
                    // Reload the class with the new code
        
        
                    location.reload()
        
                    //this.showProperty({ className: this._currentClassName!, name: propertyName, object: nil })
        
                }
    
                dialogView.view.view.textField.controlEventTargetAccumulator.EnterDown = (
                    sender,
                    event
                ) => dialogView.view.yesButton.sendControlEventForKey(UIButton.controlEvent.EnterDown, event)
    
                dialogView.view.view.textField.controlEventTargetAccumulator.EscDown = () => dialogView.dismiss()
    
                this._editorViews.push(dialogViewShower.dialogView)
    
    
            }
        }
    }).addedAsSubviewToView(this.view)
    
    propertyEditors: CBColorSelector<CBEditorPropertyDescriptor>[] = []
    
    propertyEditingBackground = new UIView().performingFunctionWithSelf(
        self => {
            
            self.style.borderStyle = "outset"
    
        }).addedAsSubviewToView(this.view)
    
    buttons: CBFlatButton[] = []
    
    buttonsRow = new RowView().addedAsSubviewToView(this.view)
    
    editorContainer = new UIView("EditorEditorContainer", nil, "iframe").configuredWithObject({
        viewHTMLElement: { src: "CBEditorEditor.html" }
    }).addedAsSubviewToView(this.view)
    
    dialogContainer = new UIView("CBEditorDialogContainer", nil).performingFunctionWithSelf(self => {
        
        self.userInteractionEnabled = NO
        
    })
    
    _editorViews: UIView[] = [this.dialogContainer]
    
    private _selectedView: UIView = nil
    
    private _editor: monaco.editor.IStandaloneCodeEditor & {
        addExtraLibFromContents(fileText: string, path: string): void
        addModelFromContents(fileText: string, path: string): void
        loadModelFromContents(fileText: string, path: string): void
        setHeight(height: string): void
    } = nil
    private _currentEditingView?: UIView
    private _currentClassName?: string
    
    private _bottomView = new UIView().addedAsSubviewToView(this.view)
    
    
    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
        this.view.backgroundColor = UIColor.whiteColor
        this.view.setBorder(2, 1)
        
        this.view.calculateAndSetViewFrame = () => {
    
            const width = 550
            const height = [850 + this.propertyEditors.length * 70, view.rootView.bounds.height - 20].min()
    
            const viewFrame = new UIRectangle(
                view.rootView.bounds.width - 10 - width + this.view.pointerDraggingPoint.x,
                10 + this.view.pointerDraggingPoint.y,
                height,
                width
            )
    
            this.view.setFrame(viewFrame, 500)
            this.dialogContainer.setFrame(viewFrame, 501)
            this.dialogContainer.subviews.everyElement.setNeedsLayout()
    
    
        }
        
        this.view.controlEventTargetAccumulator.PointerDrag = () => this.view.calculateAndSetViewFrame()
        
        
        SocketClient.ReloadEditorFiles().then(nil)
        
        this.initEditor().then(nil)
        UIView.shouldCallPointerUpInsideOnView = async eventView =>
            await this.shouldCallPointerUpInsideOnView(eventView) ?? YES
        
    }
    
    
    private initEditor() {
        
        return new Promise(resolveInitEditor => {
            
            window.onmessage = (event) => {
                
                if (event.data == "CBEditorFrameReady") {
                    
                    const editorIframe: HTMLIFrameElement = this.editorContainer.viewHTMLElement as HTMLIFrameElement
                    this._editor = new Proxy(nil, {
                        get(target, key: string) {
                            // noinspection UnnecessaryLocalVariableJS
                            const result = (...parameters: any[]) => new Promise((resolve, reject) => {
                                const channel = new MessageChannel()
                                channel.port1.onmessage = ({ data }) => {
                                    channel.port1.close()
                                    if (data.error) {
                                        reject(data.error)
                                    }
                                    else {
                                        resolve(data.result)
                                    }
                                }
                                editorIframe.contentWindow?.postMessage(
                                    {
                                        type: "CBEditorFrameMessage",
                                        key: key,
                                        parameters: parameters
                                    },
                                    "*",
                                    [channel.port2]
                                )
                            })
                            return result
                        }
                    })
    
                    resolveInitEditor(YES)
    
                }
    
            }
    
        })
    
    }
    
    
    async selectInitialView() {
        
        const currentViewKeyPath = (await SocketClient.CurrentViewKeyPath()).result
        const view = this.view.rootView.viewController.valueForKeyPath(
            currentViewKeyPath || "view"
        )
        
        await this.shouldCallPointerUpInsideOnView(view)
        
    }
    
    private async shouldCallPointerUpInsideOnView(view: UIView, forced = NO) {
        
        const isAnEditorView = this._editorViews.anyMatch(editorView => view.allSuperviews.contains(editorView))
        if (!forced && (!this.view.isMemberOfViewTree || view.allSuperviews.contains(this.view) || this._currentEditingView == view || isAnEditorView)) {
            return
        }
        
        this.view.userInteractionEnabled = NO
        this.view.alpha = 0.5
        
        this._currentEditingView = view
        //this.currentViewLabel.text = view.elementID
        
        
        // Obtain data
        const propertyDescriptors = view.propertyDescriptors
        const annotatedPropertyDescriptorObjects = (await SocketClient.AnnotatePropertyDescriptors(
            propertyDescriptors.map(value => {
                return {
                    className: value.object.constructor.name,
                    propertyKey: value.name,
                    runtimeObjectKeyPath: this.pathToViewFromRootViewController(this._currentEditingView!)
                }
            })
        )).result
        
        const unwrappedPropertyDescriptors = this.unwrapAnnotatedPropertyDescriptors(
            annotatedPropertyDescriptorObjects.firstElement,
            propertyDescriptors.firstElement
        )
        const propertyDescriptorIndex = this.indexForPropertyDescriptor(unwrappedPropertyDescriptors)
        
        const propertyDescriptor = unwrappedPropertyDescriptors[propertyDescriptorIndex]!
        // Update views
        this.updateButtons(unwrappedPropertyDescriptors, propertyDescriptorIndex)
        await this.showProperty(propertyDescriptor, forced)
        this.highlightView(view)
        
        this.view.userInteractionEnabled = YES
        this.view.alpha = 1
        
        return NO
        
    }
    
    private indexForPropertyDescriptor(unwrappedPropertyDescriptors: UnwrappedPropertyDescriptor[]) {
        let propertyDescriptorIndex = unwrappedPropertyDescriptors.findIndex(
            object => object.isDeclaredInClassFile && !object.isInNodeModules && !object.isInDeclarationFile
        )
        
        if (0 >= propertyDescriptorIndex) {
            
            propertyDescriptorIndex = unwrappedPropertyDescriptors.findIndex(
                object => object.isReferencedInClassFile && !object.isInNodeModules && !object.isInDeclarationFile
            )
            
        }
        
        if (0 >= propertyDescriptorIndex) {
            
            propertyDescriptorIndex = unwrappedPropertyDescriptors.findIndex(
                object => !object.isInDeclarationFile
            )
            
        }
        
        if (0 >= propertyDescriptorIndex) {
            
            propertyDescriptorIndex = unwrappedPropertyDescriptors.findIndex(
                object => !object.isInNodeModules
            )
            
        }
        
        if (0 >= propertyDescriptorIndex) {
            
            propertyDescriptorIndex = 0
            
        }
        return propertyDescriptorIndex
    }
    
    private updateButtons(unwrappedPropertyDescriptors: UnwrappedPropertyDescriptor[], selectedButtonIndex: number) {
        
        this.buttonsRow.cells = []
        this.buttonsRow.cellWidths = []
        this.buttons = []
        unwrappedPropertyDescriptors.forEach(descriptor => {
            
            const button = new CBFlatButton()
            button.titleLabel.text = descriptor.className
            button.controlEventTargetAccumulator.PointerUpInside.EnterDown = async () => {
                await this.reloadEditor()
                this.showProperty(descriptor).then(nil)
                this.buttons.everyElement.selected = NO
                button.selected = YES
            }
            this.buttons.push(button)
            
            if (descriptor.isInNodeModules) {
                button.titleLabel.style.fontWeight = "lighter"
            }
            
            if (descriptor.isInDeclarationFile) {
                button.titleLabel.style.fontStyle = "italic"
            }
            // button.colors.titleLabel.normal = button.colors.titleLabel.normal.colorWithAlpha(
            //     IF(descriptor.isInNodeModules)(RETURNER(0.5))
            //     .ELSE_IF(descriptor.isInDeclarationFile)(RETURNER(0.7))
            //     .ELSE(RETURNER(1))
            // )
            
        })
        
        this.buttons[selectedButtonIndex].selected = YES
        this.buttonsRow.cells = this.buttons.copy().reverse()
        
    }
    
    unwrapAnnotatedPropertyDescriptors(
        object: CBEditorAnnotatedPropertyDescriptor,
        originalObject: { object: UIObject; name: string }
    ): UnwrappedPropertyDescriptor[] {
        
        const result = []
        
        for (let i = 0; IS(object); i = i) {
            
            result.push({
                
                object: originalObject.object,
                className: object.className,
                name: originalObject.name,
                isDeclaredInClassFile: object.isDeclaredInClassFile,
                isReferencedInClassFile: object.isReferencedInClassFile,
                isInNodeModules: object.isInNodeModules,
                isInDeclarationFile: object.isInDeclarationFile
                
            })
            object = object.superclassPropertyDescriptor as CBEditorAnnotatedPropertyDescriptor
            
        }
        
        return result
        
    }
    
    private async showProperty(propertyDescriptor: { object: UIObject, className: string, name: string }, forced = NO) {
        
        if (!propertyDescriptor && !forced) {
            return
        }
        
        const isClassChanged = this._currentClassName != propertyDescriptor.className
        this.currentViewLabel.text = propertyDescriptor?.object?.class?.name +
            "_" + propertyDescriptor?.name
        
        if (isClassChanged || forced) {
            await this.reloadEditor()
        }
        
        const fileObject = (await SocketClient.EditProperty({
            className: propertyDescriptor.className,
            propertyKey: propertyDescriptor.name,
            runtimeObjectKeyPath: this.pathToViewFromRootViewController(this._currentEditingView!)
        })).result
        
        this.propertyEditors.everyElement.removeFromSuperview()
        // @ts-ignore
        this.propertyEditors = fileObject.editableProperties.map(property =>
            
            IF(propertyDescriptor.object.valueForKeyPath(property.path)?.isKindOfClass?.(UIColor))(() =>
                
                new CBColorSelector().configuredWithObject(
                    {
                        titleLabel: {
                            text: property.path + " (" + propertyDescriptor.object.valueForKeyPath(property.path) + ")"
                        },
                        colors: { background: { normal: CBColor.primaryTintColor } },
                        dialogContainerView: this.view
                    }
                ).performingFunctionWithSelf(async self => {
                        
                        const editingValues = (await SocketClient.EditingValuesForProperty({
                            className: property.typeName,
                            propertyKey: property.path,
                            runtimeObjectKeyPath: this.pathToViewFromRootViewController(this._currentEditingView!)
                        })).result
                        
                        self.data = editingValues.map(value => {
                            
                            const result: CBDropdownDataItem<CBEditorPropertyDescriptor> = {
                                
                                _id: value.className + "." + value.propertyKey,
                                title: { en: value.className + "." + value.propertyKey },
                                attachedObject: value,
                                itemCode: "[" + value.className + "." + value.propertyKey + "]",
                                isADropdownDataRow: YES,
                                isADropdownDataSection: NO,
                                dropdownCode: "asdasd"
                                
                            }
                            
                            return result
                            
                        })
                        
                        
                        self.imageView.backgroundColor = propertyDescriptor.object.valueForKeyPath(property.path)
                        
                        self.controlEventTargetAccumulator.ValueInput = async () => {
                            
                            propertyDescriptor.object.setValueForKeyPath(property.path, self.selectedColor)
                            self.titleLabel.text = property.path + " (" + propertyDescriptor.object.valueForKeyPath(
                                property.path
                            ) + ")"
                            
                        }
                        
                        self.controlEventTargetAccumulator.ValueChange = async () => {
                            
                            propertyDescriptor.object.setValueForKeyPath(property.path, self.selectedColor)
                            self.titleLabel.text = property.path + " (" + propertyDescriptor.object.valueForKeyPath(
                                property.path
                            ) + ")"
                            
                            const location = (await SocketClient.SetPropertyValue({
                                
                                className: this._currentClassName!,
                                propertyKeyPath: property.path,
                                valueString: self.selectedColorStringValueForEditor,
                                saveChanges: YES
                                
                            })).result.location
                            
                            await this.shouldCallPointerUpInsideOnView(
                                // @ts-ignore
                                propertyDescriptor.object[propertyDescriptor.name],
                                YES
                            )
                            
                            await this.showEditorPosition(location.end)
                            
                        }
                        
                    }
                )
            ).ELSE_IF(propertyDescriptor.object.valueForKeyPath(property.path).isAString)(() =>
                
                new CBTextField().configuredWithObject(
                    {
                        titleLabel: { text: property.path }
                    }
                ).performingFunctionWithSelf(
                    self => {
                        
                        let text: string = propertyDescriptor.object.valueForKeyPath(property.path)
                        let outerHTMLIfNeeded = ""
                        
                        self.text = text
                        
                        self.textField.backgroundColor = UIColor.transparentColor
                        
                        const editingLocation = property.editingLocation
                        
                        self.textField.controlEventTargetAccumulator.Focus = async () => {
                            
                            if (editingLocation) {
                                
                                this.view.layoutSubviews()
                                
                                // Set position to the correct editing location
                                this._editor.setPosition(editingLocation.end)
                                
                                // Highlight the value that is being edited
                                this._editor.setSelection({
                                    startColumn: editingLocation.start.column,
                                    startLineNumber: editingLocation.start.lineNumber,
                                    endColumn: editingLocation.end.column,
                                    endLineNumber: editingLocation.end.lineNumber
                                })
                                
                                this._editor.revealLineInCenterIfOutsideViewport(editingLocation.end.lineNumber)
                                
                            }
                            
                        }
                        
                        // @ts-ignore
                        self.textField.controlEventTargetAccumulator.TextChange = async () => {
                            
                            const newValue = self.text + IF(outerHTMLIfNeeded)(RETURNER(" " + outerHTMLIfNeeded))
                                .ELSE(RETURNER(""))
                            const isValueChanged = text != newValue
                            
                            propertyDescriptor.object.setValueForKeyPath(
                                property.path,
                                newValue
                            )
                            
                            // if (!isValueChanged) {
                            //     return
                            // }
                            
                            if (editingLocation && NO) {
                                
                                // Set position to the correct editing location
                                this._editor.getValue()
                                
                                // Highlight the value that is being edited
                                this._editor.setSelection({
                                    startColumn: editingLocation.start.column,
                                    startLineNumber: editingLocation.start.lineNumber,
                                    endColumn: editingLocation.end.column,
                                    endLineNumber: editingLocation.end.lineNumber
                                })
                                
                            }
                            else {
                                
                                const result = (await SocketClient.SetPropertyValue({
                                    className: this._currentClassName!,
                                    propertyKeyPath: property.path,
                                    valueString: self.textField.text,
                                    saveChanges: NO
                                })).result
                                
                                this._editor.setValue(result.newFileContent)
                                
                                this._editor.setPosition(result.location.end)
                                
                                this._editor.setSelection({
                                    startColumn: result.location.start.column,
                                    startLineNumber: result.location.start.lineNumber,
                                    endColumn: result.location.end.column,
                                    endLineNumber: result.location.end.lineNumber
                                })
                                
                            }
                            
                            
                        }
                        
                        self.textField.controlEventTargetAccumulator.Blur.EnterDown = async () => {
                            
                            const newValue = self.text + IF(outerHTMLIfNeeded)(RETURNER(" " + outerHTMLIfNeeded))
                                .ELSE(RETURNER(""))
                            const isValueChanged = text != newValue
                            this.view.setNeedsLayout()
                            
                            if (!isValueChanged) {
                                return
                            }
                            
                            propertyDescriptor.object.setValueForKeyPath(
                                property.path,
                                newValue
                            )
                            
                            text = newValue
                            
                            await SocketClient.SetPropertyValue({
                                className: this._currentClassName!,
                                propertyKeyPath: property.path,
                                valueString: self.textField.text,
                                saveChanges: YES
                            })
                            
                            await this.shouldCallPointerUpInsideOnView(
                                // @ts-ignore
                                propertyDescriptor.object[propertyDescriptor.name],
                                YES
                            )
                            
                        }
                        
                        
                        this.highlightView(this._currentEditingView!)
                        
                    }
                )
            )()
        ).filter(editor => IS(editor))
        this.view.addSubviews(this.propertyEditors)
        
        
        if (isClassChanged || forced) {
            
            
            fileObject.referencedFiles.forEach(object => {
                
                // this._editor.addModelFromContents(
                //     object.codeFileContents,
                //     object.path
                // )
                
                this._editor.addExtraLibFromContents(
                    object.codeFileContents,
                    object.path
                )
    
            })
    
            this._editor.loadModelFromContents(fileObject.codeFileContents, fileObject.path)
    
            this._currentClassName = propertyDescriptor.className
    
        }
    
        this.view.setNeedsLayout()
    
        await this.showEditorPosition(IF(fileObject?.propertyLocation?.className == this._currentClassName)(
            () => fileObject.propertyLocation.end
        ).ELSE(
            () => fileObject.propertyReferenceLocations?.firstElement?.end ?? { lineNumber: 0, column: 0 }
        ))
    
    }
    
    private async showEditorPosition(positionToShow: IPosition) {
        this._editor.setPosition(
            positionToShow
        )
        this._editor.trigger("Highlight matches", "editor.action.wordHighlight.trigger", null)
        this._editor.revealLineInCenterIfOutsideViewport((await this._editor.getPosition())!.lineNumber)
        this._editor.focus()
    }
    
    private highlightView(view: UIView) {
        
        const transformColor = (color: UIColor) => color.colorWithAlpha(1)
            .colorWithRed((255 - (view.backgroundColor.colorDescriptor.red || 0)) * 0.5 + 125)
            .colorWithGreen((255 - (view.backgroundColor.colorDescriptor.green || 0)) * 0.5 + 15)
            .colorWithBlue((255 - (view.backgroundColor.colorDescriptor.blue || 0)) * 0.5 + 25)
        
        const propertyDescriptor = view.propertyDescriptors.firstElement
        
        this.removeElementChanges()
        //view.backgroundColor = transformColor(view.backgroundColor)
        this._selectedView = view
        const overlayElement = view.viewHTMLElement.appendChild(UIObject.configureWithObject(
            document.createElement("div"),
            {
                className: "CBEditorPropertyBorderAndOverlayElement",
                style: "position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; " +
                    "pointer-events: none; border: solid;"
            }
        ))
        // noinspection JSPrimitiveTypeWrapperUsage
        overlayElement.style.color = transformColor(view.backgroundColor).stringValue
        const labelElement = overlayElement.appendChild(UIObject.configureWithObject(
            document.createElement("span"),
            {
                className: "CBEditorPropertyLabelElement",
                style: "position: absolute; font-style: italic; font-family: ui-monospace; font-size: small; " +
                    "font-weight: lighter; left: 0px; right: 0px; top: 0px; height: fit-content; " +
                    "text-align: center; pointer-events: none;",
                innerText: this.currentViewLabel.text
            }
        ))
        // noinspection JSPrimitiveTypeWrapperUsage
        labelElement.style.color = transformColor(view.backgroundColor).stringValue
        
        // @ts-ignore
        view._CBEditorOverlayElement = overlayElement
        
        view.forEachViewInSubtree(subview => {
            
            if (subview != view && !subview.allSuperviews.contains(this.view)) {
                
                const subviewPropertyDescriptor = subview.propertyDescriptors.firstElement
                
                const overlayElement = subview.viewHTMLElement.appendChild(UIObject.configureWithObject(
                    document.createElement("div"),
                    {
                        className: "CBEditorPropertyBorderAndOverlayElement",
                        style: "position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; " +
                            "pointer-events: none; border: solid;"
                    }
                ))
                
                const labelElement = overlayElement.appendChild(UIObject.configureWithObject(
                    document.createElement("span"),
                    {
                        className: "CBEditorPropertyLabelElement",
                        style: "position: absolute; font-style: italic; font-family: ui-monospace; font-size: small; " +
                            "font-weight: lighter; left: 0px; right: 0px; top: 0px; height: fit-content; " +
                            "text-align: center; pointer-events: none;",
                        innerText: IF(propertyDescriptor.object != subviewPropertyDescriptor.object)(
                            () => subviewPropertyDescriptor?.object?.constructor?.name + "_"
                        ).ELSE(
                            () => ""
                        ) + subviewPropertyDescriptor?.name
                    }
                ))
                // noinspection JSPrimitiveTypeWrapperUsage
                labelElement.style.color = transformColor(subview.backgroundColor).stringValue
                
                // @ts-ignore
                subview._CBEditorOverlayElement = overlayElement
                
            }
            
        })
        
    }
    
    private removeElementChanges() {
        
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyLabelElement")
            .forEach(element => {
                
                element.remove()
                
            })
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyBorderAndOverlayElement")
            .forEach(element => {
                
                // @ts-ignore
                wrapInNil(element.parentElement).UIView._CBEditorOverlayElement = undefined
                element.remove()
                
            })
        
    }
    
    
    private async reloadEditor() {
        
        this.view.userInteractionEnabled = NO
        const editorIframe: HTMLIFrameElement = this.editorContainer.viewHTMLElement as HTMLIFrameElement
        editorIframe?.contentDocument?.location?.reload()
        await this.initEditor()
        this.view.userInteractionEnabled = YES
        
    }
    
    private pathToViewFromRootViewController(view?: UIView) {
        
        let result: string
        
        if (view) {
            
            const pathKeyObject = this.pathKeyObjectToViewFromParentViewOrViewController(view)
            const viewOrViewController = pathKeyObject.containerObject
            result = this.expandKeyPath(pathKeyObject.key, viewOrViewController)
            
            if (result.startsWith(".")) {
                result = result.slice(1)
            }
            
            if (IS_NOT(result) || view != view.rootView.viewController.valueForKeyPath(result)) {
                
                result = "view" + view.allSuperviews.reverse()
                    .map(view => view.superview?.subviews?.indexOf(view) ?? "")
                    .join(".subviews.")
                
            }
            
        }
        
        // @ts-ignore
        return result
        
    }
    
    private expandKeyPath(
        keyPath: string,
        viewOrViewController: UIView | UIViewController | undefined
    ) {
        
        let newPathKeyObject: PathKeyObject | undefined
        
        if (viewOrViewController instanceof UIViewController) {
            
            newPathKeyObject = this.pathKeyObjectToViewControllerFromParentViewControllerOrView(
                viewOrViewController
            )
            keyPath = newPathKeyObject.key + "." + keyPath
            
        }
        
        if (viewOrViewController instanceof UIView) {
            
            newPathKeyObject = this.pathKeyObjectToViewFromParentViewOrViewController(
                viewOrViewController
            )
            keyPath = newPathKeyObject.key + "." + keyPath
            
        }
        
        if (newPathKeyObject) {
            
            keyPath = this.expandKeyPath(keyPath, newPathKeyObject.containerObject)
            
        }
        
        return keyPath
        
    }
    
    private pathKeyObjectToViewFromParentViewOrViewController(view: UIView) {
        
        var result: PathKeyObject = { containerObject: undefined, key: "" }
        
        if (IS(view.viewController)) {
            
            result = this.locationOfObjectInObject(view, view.viewController) as PathKeyObject
            
        }
        else if (IS(view.superview)) {
            
            const locationInSuperview = this.locationOfObjectInObject(view, view.superview)
            result = IF(locationInSuperview.key)(() => locationInSuperview)
                .ELSE(() => this.locationOfObjectInObject(view, view.superview.viewController))
            
        }
        
        return result
        
    }
    
    
    private pathKeyObjectToViewControllerFromParentViewControllerOrView(viewController: UIViewController) {
        
        var result: PathKeyObject = { containerObject: undefined, key: "" }
        
        if (IS(viewController.parentViewController)) {
            
            result = this.locationOfObjectInObject(viewController, viewController.parentViewController) as PathKeyObject
            
        }
        else if (IS(viewController.view.superview)) {
            
            result = this.locationOfObjectInObject(
                viewController,
                viewController.view.viewController
            ) as PathKeyObject || this.locationOfObjectInObject(
                viewController,
                viewController.view.superview
            ) as PathKeyObject
            
        }
        
        return result
        
    }
    
    private locationOfObjectInObject(object: any, containerObject: object) {
        
        let result = { containerObject: containerObject, key: "" }
        
        containerObject?.forEach((value, key, stopLooping) => {
            
            if (object == value) {
                
                result = { containerObject: containerObject, key: key }
                
                if (key.startsWith("_")) {
                    
                    const propertyAccessorKey = key.slice(1)
                    // @ts-ignore
                    const propertyAccessorValue = containerObject[propertyAccessorKey]
                    
                    if (propertyAccessorValue == object) {
                        result.key = propertyAccessorKey
                    }
                    
                }
                
                stopLooping()
                
            }
            
        })
        
        return result
        
    }
    
    
    static override readonly routeComponentName = "cb_editor"
    
    static override readonly ParameterIdentifierName = {}
    
    
    override async viewDidAppear() {
        
        // this.editor = monaco.editor.create(document.getElementById("testContainer")!, {
        //     value: ["function x(asdasd: string) {", "\tconsole.log(\"Asdasd \" + asdasd)", "}"].join("\n"),
        //     language: "typescript"
        // })
        
        //this.view.setNeedsLayout()
        
        await this.selectInitialView()
        
    }
    
    
    override async viewWillDisappear() {
        
        this.removeElementChanges()
        
    }
    
    override async viewDidDisappear() {
        
        await super.viewDidDisappear()
        
        await SocketClient.EditorWasClosed()
        
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(EditorViewController.routeComponentName)
        
    }
    
    
    override updateViewConstraints() {
        
        super.updateViewConstraints()
        
    }
    
    
    override updateViewStyles() {
        
        super.updateViewStyles()
        
    }
    
    
    override viewDidLayoutSubviews() {
        
        super.viewDidLayoutSubviews()
        
    }
    
    override layoutViewSubviews() {
        
        super.layoutViewSubviews()
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        // View bounds
        const bounds = this.view.bounds.rectangleWithInset(padding)
        
        this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight * 2)
        this.closeButton.frame = bounds.rectangleWithHeight(28).rectangleWithWidth(28, 1)
        
        this.reloadButton.frame = this.closeButton.frame.rectangleForPreviousColumn(padding * 0.5)
            .rectangleWithWidth(120, 1)
        
        this.saveButton.frame = this.reloadButton.frame.rectangleForPreviousColumn(padding * 0.5)
            .rectangleWithWidth(120, 1)
        
        this.currentViewLabel.frame = this.titleLabel.frame.rectangleForNextRow(padding)
        
        this.addViewButton.frame = this.currentViewLabel.frame.rectangleForNextRow(padding)
        
        const tableRows: UIView[] = this.propertyEditors.copy()
        
        const absoluteHeights = [50].arrayByRepeating(tableRows.length)
        
        const paddings = [padding].arrayByRepeating(tableRows.length - 1)
        
        const focusedPropertyIndex = tableRows.findIndex(
            view => view instanceof CBTextField && view.textField.viewHTMLElement == document.activeElement
        )
        
        if (focusedPropertyIndex >= 0) {
            tableRows.insertElementAtIndex(focusedPropertyIndex + 1, this.buttonsRow)
            
            tableRows.insertElementAtIndex(focusedPropertyIndex + 2, this.editorContainer)
            absoluteHeights.insertElementAtIndex(focusedPropertyIndex + 1, 50)
            paddings.insertElementAtIndex(focusedPropertyIndex - 1, padding * 2)
            
            absoluteHeights.insertElementAtIndex(focusedPropertyIndex + 2, 250)
            paddings.insertElementAtIndex(focusedPropertyIndex + 2, padding * 2)
            tableRows.push(this._bottomView)
            
            absoluteHeights.push(1)
            
        }
        this.addViewButton.frame.rectangleForNextRow(padding, tableRows.length * 70)
            .distributeViewsAlongHeight(
                tableRows,
                1,
                paddings,
                absoluteHeights
            )
        
        
        if (focusedPropertyIndex < 0) {
    
            this.buttonsRow.frame = (this.propertyEditors.lastElement || this.addViewButton || this.currentViewLabel).frame.rectangleForNextRow(
                padding
            )
            
            this.editorContainer.frame = this.buttonsRow.frame.rectangleForNextRow(
                padding * 0 + 5,
                [
                    bounds.height - (this.propertyEditors.lastElement || this.currentViewLabel).frame.max.y - padding * 2,
                    550
                ].max()
            )
            
            this._bottomView.frame = this.editorContainer.frame.rectangleForNextRow(padding - 1, 1)
            
            this.propertyEditingBackground.hidden = YES
            
        }
        else {
            
            this.propertyEditingBackground.frame = tableRows[focusedPropertyIndex].frame.rectangleWithHeight(
                this.editorContainer.frame.max.y - tableRows[focusedPropertyIndex].frame.y
            ).rectangleWithInsets(-15, -15, -15, -25)
            
            this.propertyEditingBackground.hidden = NO
            
        }
        
        // this.buttonsRow.cellWidths = [this.buttonsRow.bounds.width / this.buttonsRow.cells.length]
        //     .arrayByRepeating(this.buttons.length)
        
        const editorFrame = this.editorContainer.frame
        this._editor.setHeight((editorFrame.height - padding) + "px")
        //this._editor.layout({ height: editorFrame.height, width: editorFrame.width })
        this._editor.layout()
        
        
    }
}




