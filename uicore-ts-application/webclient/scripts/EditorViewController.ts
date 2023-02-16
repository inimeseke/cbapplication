import { CBDropdownDataItem, SocketClient } from "cbcore-ts"
import type * as monaco from "monaco-editor"
import { IPosition } from "monaco-editor"
import {
    EXTEND,
    IF,
    IS,
    IS_NIL,
    IS_NOT,
    nil,
    NO,
    RETURNER,
    UIButton,
    UIColor,
    UIObject,
    UIPoint,
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
import { SearchableDropdown } from "./Custom components/SearchableDropdown"
import { LanguageService } from "./LanguageService"
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
    
    propertyEditors: UIView[] = []
    
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
    
        //this.view.controlEventTargetAccumulator.PointerDrag = () => this.view.calculateAndSetViewFrame()
    
        this.makeMovable(this.view, { shouldMoveWithDragEvent: (sender, event) => YES })
        this.makeResizable(this.view, { borderColor: UIColor.transparentColor })
    
        SocketClient.ReloadEditorFiles().then(nil)
    
        this.initEditor().then(nil)
        UIView.shouldCallPointerUpInsideOnView = async eventView =>
            await this.shouldCallPointerUpInsideOnView(eventView) ?? YES
    
        UIView.shouldCallPointerHoverOnView = async view => {
        
            // @ts-ignore
            const editorOverlayElement = view._CBEditorOverlayElement
        
            if (view != this._currentEditingView && !view.withAllSuperviews.contains(this.view)) {
            
                //this.highlightSingleView(view, YES)
            
                return NO
            
            }
        
            return YES
        
        }
    
        UIView.shouldCallPointerLeaveOnView = async view => {
        
            if (view != this._currentEditingView && !view.withAllSuperviews.contains(this.view)) {
            
                // @ts-ignore
                //(view._CBEditorOverlayElement as HTMLElement)?.remove()
            
                return NO
            
            }
        
            return YES
        
        }
    
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
        
        const isAnEditorView = this._editorViews.anyMatch(editorView => view.withAllSuperviews.contains(editorView))
        if (!forced && (!this.view.isMemberOfViewTree || this.view.viewHTMLElement.contains(view.viewHTMLElement) || this._currentEditingView == view || isAnEditorView)) {
            
            return YES
            
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
    
                        self.text = text.replace(
                            propertyDescriptor.object.valueForKeyPath(
                                property.path.split(".").slice(0, -1).join(".") + "._CBEditorOverlayElement"
                            )?.outerHTML ?? "",
                            ""
                        )
    
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
    
        const classNameDropdown = new SearchableDropdown()
        var classNameDropdownData: CBDropdownDataItem<string>[] = (await SocketClient.AllDerivedClassNames("UIView")).result.map(
            (
                name,
                index,
                array
            ) => {
            
                const result: CBDropdownDataItem<string> = {
                
                    _id: name,
                    attachedObject: name,
                    dropdownCode: name,
                    isADropdownDataRow: YES,
                    isADropdownDataSection: NO,
                    itemCode: name,
                    rowsData: [],
                    title: LanguageService.localizedTextObjectForText(name)
                
                }
            
                return result
            
            })
    
        classNameDropdownData.insertElementAtIndex(0, {
        
            _id: "UIView",
            attachedObject: "UIView",
            dropdownCode: "UIView",
            isADropdownDataRow: YES,
            isADropdownDataSection: NO,
            itemCode: "UIView",
            rowsData: [],
            title: LanguageService.localizedTextObjectForText("UIView")
        
        })
    
    
        classNameDropdown.data = classNameDropdownData
    
        let className: string = propertyDescriptor.object.valueForKeyPath(propertyDescriptor.name).class.name
        if (className.startsWith("_")) {
            className = className.slice(1)
        }
        classNameDropdown.selectedItemCodes = [className]
    
        classNameDropdown.controlEventTargetAccumulator.SelectionDidChange = async (
            sender: SearchableDropdown<string>,
            event
        ) => {
        
            await SocketClient.SetPropertyClassName({
            
                className: propertyDescriptor.className,
                propertyKeyPath: propertyDescriptor.name,
                valueString: classNameDropdown.selectedItemCodes.firstElement,
                saveChanges: YES
            
            })
        
            window.location.reload()
        
        }
    
        classNameDropdown.dialogContainerView = this.view
    
        classNameDropdown.isSingleSelection = YES
    
    
        this.propertyEditors.insertElementAtIndex(0, classNameDropdown)
    
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
    
    
    private transformColorForView(view: UIView) {
        
        const color = view.backgroundColor
        
        return color.colorWithAlpha(1)
            .colorWithRed((255 - (view.backgroundColor.colorDescriptor.red || 0)) * 0.5 + 125)
            .colorWithGreen((255 - (view.backgroundColor.colorDescriptor.green || 0)) * 0.5 + 15)
            .colorWithBlue((255 - (view.backgroundColor.colorDescriptor.blue || 0)) * 0.5 + 25)
        
    }
    
    private highlightView(view: UIView) {
        
        const propertyDescriptor = view.propertyDescriptors.firstElement
        
        this.removeElementChanges()
        this._selectedView = view
        
        this.highlightSingleView(view)
        
        view.forEachViewInSubtree(subview => {
            
            if (subview != view && !subview.withAllSuperviews.contains(this.view)) {
                
                this.highlightSingleView(subview)
                
            }
            
        })
        
    }
    
    
    private highlightSingleView(view: UIView) {
        
        var resizeAndMove = YES
        const subviewPropertyDescriptor = view.propertyDescriptors.firstElement
        
        const overlayElement = view.viewHTMLElement.appendChild(UIObject.configuredWithObject(
            document.createElement("div"),
            {
                className: "CBEditorPropertyBorderAndOverlayElement",
                style: "position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; " +
                    "pointer-events: none;"
            }
        ))
        
        // noinspection JSPrimitiveTypeWrapperUsage
        overlayElement.style.borderColor = this.transformColorForView(view).stringValue
        
        if (resizeAndMove) {
            
            this.makeResizable(
                view,
                {
                    overlayElement: overlayElement,
                    viewDidChangeToSize: (view, isMovementCompleted) => this.viewFrameDidChange(
                        view,
                        isMovementCompleted
                    )
                }
            )
            this.makeMovable(
                view, {
                    overlayElement: overlayElement,
                    viewDidMoveToPosition: (view, isMovementCompleted) => this.viewFrameDidChange(
                        view,
                        isMovementCompleted
                    )
                }
            )
            
        }
        else {
            
            overlayElement.style.setProperty("border", "solid")
            
        }
        
        const labelElement = overlayElement.appendChild(UIObject.configuredWithObject(
            document.createElement("span"),
            {
                className: "CBEditorPropertyLabelElement",
                style: "position: absolute; font-style: italic; font-family: ui-monospace; font-size: small; " +
                    "font-weight: lighter; left: 0px; right: 0px; top: 0px; height: fit-content; " +
                    "text-align: center; pointer-events: none;",
                innerText: subviewPropertyDescriptor?.name
            }
        ))
        // noinspection JSPrimitiveTypeWrapperUsage
        labelElement.style.color = this.transformColorForView(view).stringValue
        
        // @ts-ignore
        view._CBEditorOverlayElement = overlayElement
        
        
    }
    
    
    private viewFrameDidChange(view: UIView, isMovementCompleted: boolean) {
        
        if (isMovementCompleted) {
            
            
            const bounds = view.superview.bounds
            const relativeXPosition = view.frame.center.x / bounds.width
            const widthMultiplier = view.frame.width / bounds.width
            
            const relativeYPosition = view.frame.center.y / bounds.height
            const heightMultiplier = view.frame.height / bounds.height
            
            view.calculateAndSetViewFrame = () => {
                
                
                const rectangleWithWidthAndHeight = view.superview.bounds.rectangleWithRelativeValues(
                    relativeXPosition,
                    widthMultiplier,
                    relativeYPosition,
                    heightMultiplier
                )
                
                
                view.frame = rectangleWithWidthAndHeight
                
            }
            
            
        }
        
        
    }
    
    
    private makeMovable(
        view: UIView,
        optionalParameters: {
            overlayElement?: HTMLElement,
            shouldMoveWithDragEvent?: (sender: UIView, event: DragEvent) => boolean,
            viewDidMoveToPosition?: (view: UIView, isMovementCompleted: boolean) => void
        } = {}
    ) {
        
        const overlayElement = optionalParameters.overlayElement ?? view.viewHTMLElement
        const shouldMoveWithDragEvent = optionalParameters.shouldMoveWithDragEvent ?? ((
            sender,
            event
        ) => IS(event.altKey))
        
        let isMoving = NO
        let viewValuesBeforeModifications: any[] = []
        
        let startPoint: UIPoint
        let views: UIView[]
        
        const movementFunction = (sender: UIView, event: DragEvent) => {
            
            if (shouldMoveWithDragEvent(sender, event)) {
                
                if (!isMoving) {
                    
                    startPoint = view.frame.min
                    
                    sender.pointerDraggingPoint = new UIPoint(0, 0)
                    const neighbouringViews = sender.superview.subviews
                    views = sender.withAllSuperviews //.concat(neighbouringViews)
                    // sender.moveToTopOfSuperview()
                    
                    sender.forEachViewInSubtree(view => {
                        
                        // Cancel pointer
                        view.sendControlEventForKey(UIView.controlEvent.PointerCancel, nil)
                        
                    })
                    
                    viewValuesBeforeModifications = views.everyElement.configureWithObject({
                        style: { cursor: "move" },
                        nativeSelectionEnabled: NO,
                        pausesPointerEvents: YES,
                        shouldCallPointerUpInside: async () => NO
                    }) as any[]
                    
                    isMoving = YES
                    
                }
                
                sender.frame = sender.frame
                    .rectangleWithX(startPoint.x + sender.pointerDraggingPoint.x)
                    .rectangleWithY(startPoint.y + sender.pointerDraggingPoint.y)
                // .rectangleByAddingX(
                //     sender.pointerDraggingPoint.x - startPoint.x
                // ).rectangleByAddingY(
                //     sender.pointerDraggingPoint.y - startPoint.y
                // )
                
                optionalParameters.viewDidMoveToPosition?.(view, NO)
                
            }
            else if (isMoving) {
                
                movementStopFunction(sender, event)
                
            }
            
        }
        
        const movementStopFunction = (sender: UIView, event: DragEvent) => {
            
            if (IS_NIL(event)) {
                
                return
                
            }
            
            views?.forEach(
                (view, index) => {
                    
                    view.configureWithObject(viewValuesBeforeModifications[index])
                    //view.shouldCallPointerUpInside = () => UIView.shouldCallPointerUpInsideOnView(view)
                    
                }
            )
            
            optionalParameters.viewDidMoveToPosition?.(view, YES)
            
            isMoving = NO
            
        }
        
        const cleanupFunction = () => {
            
            view.removeTargetForControlEvent(UIView.controlEvent.PointerDrag, movementFunction)
            view.removeTargetForControlEvents(
                [UIView.controlEvent.PointerUp, UIView.controlEvent.PointerCancel],
                movementStopFunction
            )
            
        }
        
        view.controlEventTargetAccumulator.PointerDrag = movementFunction
        view.controlEventTargetAccumulator.PointerUp.PointerCancel = movementStopFunction
        
        UIObject.configureWithObject(overlayElement, { remove: EXTEND(() => cleanupFunction()) })
        
    }
    
    
    private makeResizable(
        view: UIView,
        optionalParameters: {
            overlayElement?: HTMLElement,
            borderWidth?: number,
            borderColor?: UIColor,
            viewDidChangeToSize?: (view: UIView, isMovementCompleted: boolean) => void
        } = {}
    ) {
        
        const overlayElement = optionalParameters.overlayElement ?? view.viewHTMLElement
        
        const borderWidth = IF(optionalParameters.borderWidth)(RETURNER(optionalParameters.borderWidth + "px"))
                .ELSE(RETURNER(undefined)) ||
            overlayElement.style.borderWidth ||
            view.style.borderWidth || "2px"
        
        const borderColor = optionalParameters.borderColor?.stringValue ??
            overlayElement.style.borderColor ??
            view.style.borderColor ??
            this.transformColorForView(view).stringValue
        
        const pointerUpFunction = (sender: UIView, event: Event) => {
            optionalParameters.viewDidChangeToSize?.(view, YES)
        }
        
        
        const leftEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "leftEdge",
                style: {
                    position: "absolute",
                    height: "100%",
                    width: borderWidth,
                    top: "0px",
                    left: "0px",
                    cursor: "col-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        
        overlayElement.appendChild(leftEdge.viewHTMLElement)
        
        leftEdge.controlEventTargetAccumulator.PointerDrag = (sender, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(event.movementX / UIView.pageScale, 0, 0, 0)
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        
        leftEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const rightEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "rightEdge",
                style: {
                    position: "absolute",
                    height: "100%",
                    width: borderWidth,
                    top: "0px",
                    right: "0px",
                    cursor: "col-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(rightEdge.viewHTMLElement)
        
        rightEdge.controlEventTargetAccumulator.PointerDrag = (sender, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(0, -event.movementX / UIView.pageScale, 0, 0)
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        
        rightEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        // noinspection JSSuspiciousNameCombination
        const bottomEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomEdge",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "100%",
                    bottom: "0px",
                    left: "0px",
                    cursor: "row-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(bottomEdge.viewHTMLElement)
        
        bottomEdge.controlEventTargetAccumulator.PointerDrag = (sender, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(0, 0, -event.movementY / UIView.pageScale, 0)
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        
        bottomEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        // noinspection JSSuspiciousNameCombination
        const topEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topEdge",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "100%",
                    top: "0px",
                    right: "0px",
                    cursor: "row-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(topEdge.viewHTMLElement)
        
        topEdge.controlEventTargetAccumulator.PointerDrag = (sender, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(0, 0, 0, event.movementY / UIView.pageScale)
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        
        topEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const topLeftCornerTop = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topLeftCornerTop",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "5%",
                    maxWidth: "5px",
                    top: "0px",
                    left: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(topLeftCornerTop.viewHTMLElement)
        
        const pointerDragTLFunction = (sender: UIView, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(
                event.movementX / UIView.pageScale,
                0,
                0,
                event.movementY / UIView.pageScale
            )
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        topLeftCornerTop.controlEventTargetAccumulator.PointerDrag = pointerDragTLFunction
        
        topLeftCornerTop.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const topLeftCornerLeft = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topLeftCornerLeft",
                style: {
                    position: "absolute",
                    height: "5%",
                    maxHeight: "5px",
                    width: borderWidth,
                    top: "0px",
                    left: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(topLeftCornerLeft.viewHTMLElement)
        
        topLeftCornerLeft.controlEventTargetAccumulator.PointerDrag = pointerDragTLFunction
        
        topLeftCornerLeft.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const bottomLeftCornerLeft = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomLeftCornerLeft",
                style: {
                    position: "absolute",
                    height: "5%",
                    maxHeight: "5px",
                    width: borderWidth,
                    bottom: "0px",
                    left: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(bottomLeftCornerLeft.viewHTMLElement)
        
        const pointerDragBLFunction = (sender: UIView, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(
                event.movementX / UIView.pageScale,
                0,
                -event.movementY / UIView.pageScale,
                0
            )
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        bottomLeftCornerLeft.controlEventTargetAccumulator.PointerDrag = pointerDragBLFunction
        
        bottomLeftCornerLeft.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const bottomLeftCornerBottom = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomLeftCornerBottom",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "5%",
                    maxWidth: "5px",
                    bottom: "0px",
                    left: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(bottomLeftCornerBottom.viewHTMLElement)
        
        bottomLeftCornerBottom.controlEventTargetAccumulator.PointerDrag = pointerDragBLFunction
        
        bottomLeftCornerBottom.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const bottomRightCornerBottom = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomRightCornerBottom",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "5%",
                    maxWidth: "5px",
                    bottom: "0px",
                    right: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(bottomRightCornerBottom.viewHTMLElement)
        
        const pointerDragBRFunction = (sender: UIView, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(
                0,
                -event.movementX / UIView.pageScale,
                -event.movementY / UIView.pageScale,
                0
            )
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        bottomRightCornerBottom.controlEventTargetAccumulator.PointerDrag = pointerDragBRFunction
        
        bottomRightCornerBottom.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const bottomRightCornerRight = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomRightCornerRight",
                style: {
                    position: "absolute",
                    height: "5%",
                    maxHeight: "5px",
                    width: borderWidth,
                    bottom: "0px",
                    right: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(bottomRightCornerRight.viewHTMLElement)
        
        bottomRightCornerRight.controlEventTargetAccumulator.PointerDrag = pointerDragBRFunction
        
        bottomRightCornerRight.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const topRightCornerRight = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topRightCornerRight",
                style: {
                    position: "absolute",
                    height: "5%",
                    maxHeight: "5px",
                    width: borderWidth,
                    top: "0px",
                    right: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(topRightCornerRight.viewHTMLElement)
        
        const pointerDragTRFunction = (sender: UIView, event: DragEvent) => {
            
            view.frame = view.frame.rectangleWithInsets(
                0,
                -event.movementX / UIView.pageScale,
                0,
                event.movementY / UIView.pageScale
            )
            
            optionalParameters.viewDidChangeToSize?.(view, NO)
            
        }
        topRightCornerRight.controlEventTargetAccumulator.PointerDrag = pointerDragTRFunction
        
        topRightCornerRight.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const topRightCornerTop = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topRightCornerTop",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "5%",
                    maxWidth: "5px",
                    top: "0px",
                    right: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        overlayElement.appendChild(topRightCornerTop.viewHTMLElement)
        
        topRightCornerTop.controlEventTargetAccumulator.PointerDrag = pointerDragTRFunction
        
        topRightCornerTop.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
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
    
                result = "view" + view.withAllSuperviews.reverse()
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
    
        UIView.shouldCallPointerUpInsideOnView = async () => YES
    
        UIView.shouldCallPointerHoverOnView = async () => YES
    
        UIView.shouldCallPointerLeaveOnView = async () => YES
    
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




