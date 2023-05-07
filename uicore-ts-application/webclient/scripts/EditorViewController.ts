import { CBDropdownDataItem, CBSocketClient, SocketClient } from "cbcore-ts"
import type * as monaco from "monaco-editor"
import { editor, IPosition } from "monaco-editor"
import {
    FIRST_OR_NIL,
    IF,
    IS,
    IS_NOT, MAKE_ID,
    nil,
    NO,
    RETURNER,
    UIButton,
    UIColor,
    UICore,
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
import { CBDataView } from "./Custom components/CBDataView"
import { CBDialogViewShower } from "./Custom components/CBDialogViewShower"
import { CBFlatButton } from "./Custom components/CBFlatButton"
import { CBTextField } from "./Custom components/CBTextField"
import { CellView } from "./Custom components/CellView"
import { RowView } from "./Custom components/RowView"
import { SearchableDropdown } from "./Custom components/SearchableDropdown"
import { LanguageService } from "./LanguageService"
import { CBEditorAnnotatedPropertyDescriptor, CBEditorPropertyDescriptor } from "./SocketClientFunctions"
import IModelContentChangedEvent = editor.IModelContentChangedEvent


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


var origlog = console.log

console.log = function (obj, ...placeholders) {
    
    const date = new Date().toISOString()
    
    if (typeof obj === "string") {
        placeholders.unshift(date + " " + obj)
    }
    else {
        
        // This handles console.log( object )
        placeholders.unshift(obj)
        placeholders.unshift(date + " %j")
        
    }
    
    origlog.apply(this, placeholders)
    
}


interface CBEditorViewTreeDescriptor {
    
    className: string;
    descriptor: { objectClassName: string; name: string }
    subDescriptors: CBEditorViewTreeDescriptor[]
    runtimeKeyPath: string
    
    _CB_DataView_IsExpandable?: boolean
    _CB_DataView_IsExpanded?: boolean
    
}


function props(obj: any) {
    const p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const op = Object.getOwnPropertyNames(obj);
        for (let i=0; i<op.length; i++)
            if (p.indexOf(op[i]) == -1)
                p.push(op[i]);
    }
    return p;
}

const _UIViewPropertyKeys = props(UIView.prototype).concat(new UIView().allKeys)
const _UIViewControllerPropertyKeys = props(UIViewController.prototype).concat(new UIViewController(nil).allKeys)


Object.defineProperty(UIView.prototype, "propertyDescriptors", {
    get: function propertyDescriptors(this: UIView) {



        //console.log(this.elementID + "_propertyDescriptors")

        let result: any[] = []

        function isPlainObject(value: any): value is object {
            return value instanceof Object && Object.getPrototypeOf(value) === Object.prototype
        }

        function isAnArray(value: any): value is any[] {
            return value instanceof Array && Object.getPrototypeOf(value) === Array.prototype
        }

        this.withAllSuperviews.forEach(view => {

            const descriptorFromObject = function (
                this: UIView,
                object: object,
                pathRootObject = object,
                existingPathComponents: string[] = [],
                lookInArrays = YES,
                depthLeft = 5
            ): {
                subObjects: { object: object; key: string }[];
                descriptor: { name: string; object: object } | undefined
            } {

                let resultDescriptor: { name: string; object: object } | undefined
                const subObjects: { object: object, key: string }[] = []
                const subArrays: { array: any[], key: string }[] = []

                FIRST_OR_NIL(object).forEach((value, key, stopLooping) => {

                    if (this == value) {

                        existingPathComponents.push(key)

                        resultDescriptor = { object: pathRootObject, name: existingPathComponents.join(".") }
                        stopLooping()
                        return

                    }


                    if (isPlainObject(value) && !_UIViewPropertyKeys.contains(key) && !_UIViewControllerPropertyKeys.contains(key)) {
                        subObjects.push({ object: value, key: key })
                    }
                    if (lookInArrays && isAnArray(value) && !_UIViewPropertyKeys.contains(key) && !_UIViewControllerPropertyKeys.contains(key)) {
                        subArrays.push({ array: value, key: key })
                    }

                })

                if (!resultDescriptor && lookInArrays) {

                    subArrays.copy().forEach(value => {

                        if (value.key.startsWith("_")) {

                            subArrays.removeElement(value)
                            subArrays.push(value)

                        }

                    })

                    subArrays.find(arrayObject =>
                        arrayObject.array.find((value, index) => {
                            if (this == value) {
                                existingPathComponents.push(arrayObject.key + "." + index)
                                resultDescriptor = { object: pathRootObject, name: existingPathComponents.join(".") }
                                return YES
                            }
                            return NO
                        })
                    )

                }

                // if (!resultDescriptor && depthLeft) {
                //
                //     // @ts-ignore
                //     resultDescriptor = subObjects.find(object => descriptorFromObject(
                //         object,
                //         pathRootObject,
                //         existingPathComponents,
                //         NO,
                //         depthLeft - 1
                //     ))
                //
                // }

                if (resultDescriptor?.object?.constructor?.name == "Object") {

                    var asd = 1

                }

                const result = {
                    descriptor: resultDescriptor,
                    subObjects: subObjects
                }

                return result

            }.bind(this)

            const viewControllerResult = descriptorFromObject(view.viewController)

            if (viewControllerResult?.descriptor) {

                result.push(viewControllerResult.descriptor)

            }

            const viewResult = descriptorFromObject(view)

            if (viewResult?.descriptor) {

                result.push(viewResult.descriptor)

            }
            else if (this.superview && this.superview == view) {

                result.push({ object: view, key: "subviews." + view.subviews.indexOf(this) })

            }


            // view.forEach((value, key, stopLooping) => {
            //
            //     if (this == value) {
            //
            //         result.push({ object: view, name: key })
            //
            //         stopLooping()
            //
            //     }
            //
            // })


        })

        return result

    }
})


export class EditorViewController extends UIViewController {
    
    // section Initialization
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
                const editorText = await this._editor.getValue()
                
                await SocketClient.SaveFile({
                    
                    className: this._currentClassName!,
                    valueString: editorText
                    
                })
                
                if (this._currentEditingView) {
                    await this.shouldCallPointerUpInsideOnView(this._currentEditingView, YES)
                }
                
            }
        }
    }).addedAsSubviewToView(this.view)
    
    
    private configureCellForTreeViewRow = (cellView: CellView, dataItem: CBEditorViewTreeDescriptor) => {
        if ((this.view.rootView.viewController.valueForKeyPath(
            dataItem.runtimeKeyPath
        ) instanceof UIViewController)) {
            
            cellView.titleLabel.alpha = 0.5
            
        }
        else {
            
            cellView.titleLabel.alpha = 1
            
        }
    }
    
    
    treeView = new CBDataView<CBEditorViewTreeDescriptor>().configuredWithObject({
        descriptors: [
            {
                keyPath: "className",
                title: "Class name",
                defaultTitle: "", //"No class name".italics(),
                allowSorting: YES,
                initialOrderingState: "ascending",
                updateCell: this.configureCellForTreeViewRow
            },
            // {
            //     keyPath: "_id",
            //     title: "_id",
            //     defaultTitle: "", //"No class name".italics(),
            //     allowSorting: YES,
            //     initialOrderingState: "ascending",
            //     updateCell: this.configureCellForTreeViewRow
            // },
            {
                keyPath: "descriptor.name",
                title: "Property name",
                defaultTitle: "", //"No property name".italics(),
                allowSorting: YES,
                updateCell: this.configureCellForTreeViewRow
            },
            {
                keyPath: "descriptor.objectClassName",
                title: "Container class name",
                defaultTitle: "", //"No class name".italics(),
                allowSorting: YES,
                updateCell: this.configureCellForTreeViewRow
            },
            {
                
                defaultTitle: "Edit",
                initCell: cellView => cellView.colors.titleLabel.selected = UIColor.redColor,
                updateCell: (
                    cellView,
                    dataItem
                ) => {
                    
                    cellView.hidden = (this.view.rootView.viewController.valueForKeyPath(
                        dataItem.runtimeKeyPath
                    ) instanceof UIViewController)
                    
                    cellView.selected = (this.view.rootView.viewController.valueForKeyPath(
                        dataItem.runtimeKeyPath
                    ) == this._currentEditingView)
                    
                    cellView.userInteractionEnabled = IS_NOT(cellView.selected)
                    cellView.enabled = !dataItem?.descriptor?.name?.contains(".")
                    
                    
                    cellView.titleLabel.style.fontWeight = IF(cellView.selected)(() => "bold").ELSE(() => "normal")
                    
                },
                buttonWasPressed: async (cellView, dataItem) => {
                    
                    await (this.view.rootView.viewController.valueForKeyPath(dataItem.runtimeKeyPath) as UIView).shouldCallPointerUpInside()
                    
                }
                
            }
        ],
        rowExpandedValueDidChange: (row, event) => {
            
            if (event.altKey && event.metaKey) {
                
                const rowDataPoint: CBEditorViewTreeDescriptor = row.data
                
                const subDescriptors: CBEditorViewTreeDescriptor[] = rowDataPoint.subDescriptors
                
                const firstSubDescriptor = subDescriptors.find(value => value._CB_DataView_IsExpandable)
                
                if (!firstSubDescriptor) {
                    
                    return
                    
                }
                
                const isExpanded = !firstSubDescriptor._CB_DataView_IsExpanded
                
                subDescriptors.forEach((subDescriptor, index, array) => {
                    
                    //console.log(subDescriptor)
                    
                    // Find other rows with the same class and property names
                    
                    this.treeView.data.forEach((value, index, array) => {
                        
                        if (subDescriptor.className == value.className && subDescriptor.descriptor.name == value.descriptor.name) {
                            value._CB_DataView_IsExpanded = isExpanded
                        }
                        
                    })
                    
                    
                })
                
                rowDataPoint._CB_DataView_IsExpanded = !rowDataPoint._CB_DataView_IsExpanded
                
                
            }
            else if (event.metaKey) {
                
                // Find other rows with the same class and property names
                
                this.treeView.data.forEach((value, index, array) => {
                    
                    if (row.data.className == value.className && row.data.descriptor.name == value.descriptor.name) {
                        value._CB_DataView_IsExpanded = row.data._CB_DataView_IsExpanded
                    }
                    
                })
                
            }
            
            
        }
    }).addedAsSubviewToView(this.view)
    
    addViewControllerButton = new CBButton().configuredWithObject({
        titleLabel: { text: "Add view controller" },
        controlEventTargetAccumulator: {
            PointerUpInside: async () => {
                
                this.dialogContainer.addedAsSubviewToView(this.view.superview)
                
                const dialogViewShower = CBDialogViewShower.showQuestionDialogWithTextField(
                    "Insert a name for the new view controller class",
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
                    let className = textField.textField.text
                    if (IS_NOT(className)) {
                        return
                    }
                    if (className && !className.endsWith("ViewController")) {
                        className = className + "ViewController"
                    }
                    
                    dialogView.dismiss()
                    
                    //CBDialogViewShower.alert(propertyName, nil, this.dialogContainer)
                    
                    
                    const result = (await SocketClient.AddNewViewController({
                        
                        className: className
                        
                    })).result
                    
                    // Reload the class with the new code
                    
                    //this.addScriptToPage(result.codeFileContents, YES)
                    
                    
                    UIRoute.currentRoute.routeByRemovingComponentsOtherThanOnesNamed(["settings"])
                        .routeWithComponent(
                            result.componentName,
                            {}
                        ).apply()
                    
                    
                    this.performFunctionWithDelay(0.5, () => location.reload())
                    
                    
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
    
    deleteViewControllerButton = new CBButton().configuredWithObject({
        titleLabel: { text: "Delete view controller" },
        colors: { background: { normal: UIColor.redColor } },
        controlEventTargetAccumulator: {
            PointerUpInside: async () => {
                
                this.dialogContainer.addedAsSubviewToView(this.view.superview)
                
                const dialogViewShower = CBDialogViewShower.showQuestionDialogWithTextField(
                    "Are you sure that you want to delete " + this._currentClassName + "?\nWrite the class name to confirm.",
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
                    const className = textField.textField.text
                    
                    dialogView.dismiss()
                    
                    //CBDialogViewShower.alert(propertyName, nil, this.dialogContainer)
                    
                    if (this._currentClassName != className) {
                        
                        CBDialogViewShower.alert("Not deleting view controller.")
                        
                        return
                        
                    }
                    
                    const result = (await SocketClient.DeleteViewController({
                        
                        className: className,
                        deleteFile: YES
                        
                    })).result
                    
                    // Reload the class with the new code
                    
                    //this.addScriptToPage(result.codeFileContents, YES)
                    
                    
                    UIRoute.currentRoute.routeByRemovingComponentNamed(
                        (this._currentEditingView?.viewController.class as typeof UIViewController).routeComponentName
                    ).apply()
                    
                    
                    this.performFunctionWithDelay(0.5, () => location.reload())
                    
                    
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
    
    // removeViewButton = new CBButton().configuredWithObject({
    //     titleLabel: { text: "Remove view" },
    //     colors: { background: { normal: UIColor.colorWithRGBA(250, 170, 100) } },
    //     controlEventTargetAccumulator: {
    //         PointerUpInside: async () => {
    //
    //             this.dialogContainer.addedAsSubviewToView(this.view.superview)
    //
    //             const dialogViewShower = CBDialogViewShower.showQuestionDialog(
    //                 "Are you sure that you want to remove " + this._currentEditingView?.propertyDescriptors.firstElement.name + "?",
    //                 () => {
    //
    //                     this._editorViews.removeElement(dialogViewShower.dialogView)
    //                     this.dialogContainer.userInteractionEnabled = NO
    //
    //                 }
    //             )
    //             this.dialogContainer.userInteractionEnabled = YES
    //
    //
    //             const dialogView = dialogViewShower.dialogView
    //
    //             dialogViewShower.yesButtonWasPressed = async () => {
    //
    //
    //
    //                 dialogView.dismiss()
    //
    //                 //CBDialogViewShower.alert(propertyName, nil, this.dialogContainer)
    //
    //
    //                 const result = (await SocketClient.RemoveSubview({
    //
    //                     className: this._currentClassName!,
    //                     propertyKey: this._currentEditingView?.propertyDescriptors.firstElement.name!,
    //                     runtimeObjectKeyPath: this.pathToViewFromRootViewController(this._currentEditingView!)
    //
    //                 })).result
    //
    //                 // Reload the class with the new code
    //
    //
    //                 location.reload()
    //
    //                 //this.showProperty({ className: this._currentClassName!, name: propertyName, object: nil })
    //
    //             }
    //
    //
    //             this._editorViews.push(dialogViewShower.dialogView)
    //
    //
    //         }
    //     }
    // }).addedAsSubviewToView(this.view)
    
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
    private _layoutFunctionText?: string
    
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
        
        
        this.view.makeMovable({
            shouldMoveWithMouseEvent: () => YES,
            viewDidMoveToPosition: (view, isMovementCompleted) => this.viewFrameDidChange(
                view,
                isMovementCompleted
            )
        })
        this.view.makeResizable({
            borderColor: UIColor.transparentColor,
            borderWidth: 5,
            viewDidChangeToSize: (view, isMovementCompleted) => this.viewFrameDidChange(
                view,
                isMovementCompleted
            )
        })
        
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
                
                if (event.data.type == "CBEditorFrameModelContentDidChangeMessage") {
                    
                    this.editorContentChanged(event.data.event)
                    
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
    
    
    // section Code editor events
    private async editorContentChanged(event: IModelContentChangedEvent) {
        
        console.log("Editor content changed")
        
        console.log(event)
        
        //this._selectedView.viewHTMLElement.classList.add("loading-border")
        
        // noinspection ES6RedundantAwait
        const editorText = await this._editor.getValue()
        
        const layoutFunctionText = this.layoutFunctionText(editorText)
        
        
        if (layoutFunctionText == this._layoutFunctionText && this._layoutFunctionText) {
            
            this._layoutFunctionText = layoutFunctionText
            
            //this._selectedView.viewHTMLElement.classList.remove("loading-border")
            
            return
            
        }
        
        this._layoutFunctionText = layoutFunctionText
        
        // // @ts-ignore
        // const messages = (await this._editor.getCurrentFileMessages() as Diagnostic[]).filter(
        //     value => value.category == 1
        // )
        //
        // if (messages.length) {
        //
        //     this._selectedView.viewHTMLElement.classList.remove("loading-border")
        //
        //
        //     return
        //
        // }
        
        const scriptTextSocketResult = (await SocketClient.JSStringFromTSString(
            layoutFunctionText,
            CBSocketClient.completionPolicy.last
        ))
        
        var asd = 1
        
        if (scriptTextSocketResult.result) {
            
            this.replaceLayoutFunction(scriptTextSocketResult.result)
            
        }
        
        //this._selectedView.viewHTMLElement.classList.remove("loading-border")
        
        
    }
    
    
    // section Live layout updates
    private layoutFunctionInnerText(editorText: string) {
        const functionText = this.layoutFunctionText(editorText)
        return functionText.substring(functionText.indexOf("{") + 1, functionText.lastIndexOf("}"))
    }
    
    private layoutFunctionText(editorText: string) {
        
        const matchedText = editorText.match(new RegExp("layoutViewSubviews\\(\\) \\{"))?.firstElement ||
            editorText.match(new RegExp("layoutSubviews\\(\\) \\{"))?.firstElement
        
        let methodBlockString = ""
        
        if (matchedText) {
            
            const index = editorText.indexOf(matchedText)
            const followingText = editorText.slice(index)
            let blockDepth = 1
            
            for (let i = 0; i < followingText.length; i++) {
                
                const currentSymbol = followingText[i]
                
                if (currentSymbol == "{") {
                    blockDepth = blockDepth + 1
                }
                
                if (currentSymbol == "}") {
                    blockDepth = blockDepth - 1
                }
                
                if (blockDepth == 0) {
                    blockDepth = blockDepth - 1
                    methodBlockString = followingText.slice(0, i)
                    break
                }
                
            }
            
        }
        
        if (!methodBlockString) {
            return methodBlockString
        }
        
        return ("function " + methodBlockString).replace(" super.", " this.superclass.prototype.")
        
    }
    
    
    private replaceLayoutFunction(scriptText: string) {
        
        const replacementFunction = this.runScript(scriptText)
        
        if (this._selectedView?.viewController) {
            
            this._selectedView.viewController.layoutViewSubviews = replacementFunction
            
        }
        else {
            
            this._selectedView.layoutSubviews = replacementFunction
            
        }
        
        this._selectedView?.setNeedsLayoutUpToRootView?.()
        
    }
    
    addScriptToPage(scriptText: string, module = NO) {
        
        const script = document.createElement("script")
        
        if (module) {
            script.setAttribute("type", "module")
        }
        else {
            script.setAttribute("type", "text/javascript")
        }
        
        script.innerHTML = scriptText
        document.body.appendChild(script)
        
        return script
        
    }
    
    
    runScript(scriptText: string) {
        
        const script = document.createElement("script")
        script.setAttribute("type", "text/javascript")
        script.innerHTML = "window.CBEditorScriptResult = (" + scriptText + ")"
        document.body.appendChild(script)
        document.body.removeChild(script)
        
        // @ts-ignore
        const result = window.CBEditorScriptResult
        
        // @ts-ignore
        delete window.CBEditorScriptResult
        
        return result
        
    }
    
    
    private viewFrameDidChange(view: UIView, isMovementCompleted: boolean) {
        
        if (isMovementCompleted || YES) {
            
            
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
    
    
    // section Current view selection
    private async shouldCallPointerUpInsideOnView(view: UIView, forced = NO) {
        
        const isAnEditorView = this._editorViews.anyMatch(editorView => view.withAllSuperviews.contains(editorView))
        if (!forced &&
            (!this.view.isMemberOfViewTree ||
                this.view.viewHTMLElement.contains(view.viewHTMLElement) ||
                this._currentEditingView ==
                view ||
                isAnEditorView)) {
            
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
        
        this.updateViewTreeTable().then(nil)
        
        this.view.userInteractionEnabled = YES
        this.view.alpha = 1
        
        return NO
        
    }
    
    
    private async updateViewTreeTable() {
        
        // this.treeView.data = []
        // this.treeView.tableView.reloadData()
        
        const treeDescriptors = this.viewTreeDescriptors()
        this.treeView.setTreeData(treeDescriptors, "subDescriptors", NO)
        
        const currentViewDescriptor = this.treeView.data.find(descriptor =>
            (this.view.rootView.viewController.valueForKeyPath(
                descriptor.runtimeKeyPath
            ) == this._currentEditingView)
        )
        
        const parentDescriptors = (
            descriptor: CBEditorViewTreeDescriptor,
            result: CBEditorViewTreeDescriptor[] = []
        ) => {
            
            // @ts-ignore
            const parentDescriptor: CBEditorViewTreeDescriptor = this.treeView.data.find(
                // @ts-ignore
                value => value["_id"] == descriptor["_parent"]
            )
            
            result.push(parentDescriptor)
            
            // @ts-ignore
            if (parentDescriptor && parentDescriptor["_parent"]) {
                
                parentDescriptors(parentDescriptor, result)
                
            }
            
            return result
            
        }
        
        if (currentViewDescriptor) {
            
            parentDescriptors(currentViewDescriptor).everyElement._CB_DataView_IsExpanded = YES
            
        }
        
        await this.treeView.updateTableDataByFiltering()
        
        const highlightedDataItemIndex = this.treeView.filteredData.findIndex(dataItem =>
                
                (this.view.rootView.viewController.valueForKeyPath(
                    dataItem.runtimeKeyPath
                ) == this._currentEditingView)
            
            // dataItem.descriptor.name == currentViewDescriptor?.name &&
            // dataItem.descriptor.objectClassName == currentViewDescriptor?.object.class.name
        )
        
        this.treeView.highlightedDataItem = this.treeView.filteredData[highlightedDataItemIndex]
        
        // Show the highlighted row
        const tableView = this.treeView.tableView
        tableView._calculatePositionsUntilIndex(highlightedDataItemIndex)
        const focusedRowPosition = tableView._rowPositions[highlightedDataItemIndex]
        
        // Scroll the view if needed
        let contentOffset = tableView.contentOffset
        if ((focusedRowPosition?.topY ?? 0) < contentOffset.y) {
            contentOffset.y = focusedRowPosition.topY
        }
        const tableCurrentHeight = tableView.bounds.height
        if ((focusedRowPosition?.bottomY ?? tableCurrentHeight) > (contentOffset.y + tableCurrentHeight)) {
            contentOffset = contentOffset.pointByAddingY(-(contentOffset.y + tableCurrentHeight -
                focusedRowPosition.bottomY))
        }
        const animationDuration = tableView.animationDuration
        tableView.animationDuration = 0
        tableView.contentOffset = contentOffset
        tableView.animationDuration = animationDuration
        
        
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
        
        FIRST_OR_NIL(this.buttons[selectedButtonIndex]).selected = YES
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
    
    
    // section Content updating
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
        this.propertyEditors = fileObject.editableProperties.map(property =>
            
            IF(propertyDescriptor.object.valueForKeyPath(property.path)?.isKindOfClass?.(UIColor))(() =>
                
                new CBColorSelector().configuredWithObject(
                    {
                        titleLabel: {
                            text: property.path + " (" + propertyDescriptor.object.valueForKeyPath(property.path) + ")"
                        },
                        colors: { background: { normal: CBColor.primaryTintColor } },
                        dialogContainerView: this.view,
                        expandedContainerViewHeight: 500
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
                        
                        
                        //this.highlightView(this._currentEditingView!)
                        
                    }
                )
            )()
        ).filter(editor => IS(editor))
        
        const classNameDropdown = new SearchableDropdown()
        const classNameDropdownData: CBDropdownDataItem<string>[] = (await SocketClient.AllDerivedClassNames("UIView")).result.map(
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
        
        classNameDropdown.expandedContainerViewHeight = 500
        
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
    
    private async reloadEditor() {
        
        this.view.userInteractionEnabled = NO
        const editorIframe: HTMLIFrameElement = this.editorContainer.viewHTMLElement as HTMLIFrameElement
        editorIframe?.contentDocument?.location?.reload()
        await this.initEditor()
        this.view.userInteractionEnabled = YES
        
    }
    
    // section View highlighting
    private highlightView(view: UIView) {
        
        const propertyDescriptor = view.propertyDescriptors.firstElement
        
        this.removeElementChanges()
        this._selectedView = view
        
        this.highlightSingleView(view)
        
        view.subviews.forEach(subview => {
            
            if (subview != view && !subview.withAllSuperviews.contains(this.view)) {
                
                this.highlightSingleView(subview, YES)
                
            }
            
        })
        
    }
    
    
    private highlightSingleView(view: UIView, isSubview = NO) {
        
        const resizeAndMove = YES
        const subviewPropertyDescriptor = view.propertyDescriptors.firstElement
        
        const overlayView = new UIView()
        
        const overlayElement = view.viewHTMLElement.appendChild(UIObject.configuredWithObject(
            overlayView.viewHTMLElement,
            {
                className: "CBEditorPropertyBorderAndOverlayElement",
                style: "position: absolute; left: 0px; right: 0px; top: 0px; bottom: 0px; " +
                    "pointer-events: none; border-style: solid"
            }
        ))
        
        if (isSubview) {
            
            overlayElement.classList.add("CBEditorSubviewPropertyBorderAndOverlayElement")
            overlayView.backgroundColor = UIColor.colorWithRGBA(228, 228, 187, 0.75)
            
            // // @ts-ignore
            // const configurationValues: object[] = view.subviews.everyElement.configureWithObject({ userInteractionEnabled: NO }).UI_elementValues
            //
            // UIObject.configuredWithObject(
            //     overlayView.viewHTMLElement,
            //     {
            //         remove: EXTEND(() => {
            //
            //             view.subviews.forEach((
            //                 value,
            //                 index
            //             ) => value.configureWithObject(configurationValues[index]))
            //
            //         })
            //     }
            // )
            
        }
        
        // // noinspection JSPrimitiveTypeWrapperUsage
        // overlayElement.style.borderColor = this.transformColorForView(
        //     IF(isSubview)(() => view.superview).ELSE(() => view)
        // ).stringValue
        
        if (resizeAndMove && !view.isResizable) {
            
            view.makeResizable(
                {
                    //overlayElement: overlayElement,
                    viewDidChangeToSize: (view, isMovementCompleted) => this.viewFrameDidChange(
                        view,
                        isMovementCompleted
                    )
                }
            )
            
            view._isCBEditorTemporaryResizable = YES
            
        }
        
        if (resizeAndMove && !view.isMovable) {
            
            view.makeMovable(
                {
                    viewDidMoveToPosition: (view, isMovementCompleted) => this.viewFrameDidChange(
                        view,
                        isMovementCompleted
                    )
                }
            )
            
            view._isCBEditorTemporaryMovable = YES
            
        }
        
        //else {
        
        overlayElement.style.setProperty("border", "solid")
        
        //}
        
        const labelElement = overlayElement.appendChild(UIObject.configuredWithObject(
            document.createElement("span"),
            {
                className: "CBEditorPropertyLabelElement",
                style: "position: absolute; font-style: italic; font-family: ui-monospace; font-size: small; " +
                    "font-weight: lighter; left: 0px; right: 0px; top: 0px; height: fit-content; " +
                    "text-align: center; pointer-events: none" // + "; text-shadow: black 2px 0px 5px;"
                ,
                innerText: subviewPropertyDescriptor?.name
            }
        ))
        // noinspection JSPrimitiveTypeWrapperUsage
        labelElement.style.color = UIColor.blueColor.stringValue
        
        // @ts-ignore
        view._CBEditorOverlayElement = overlayElement
        
        
    }
    
    
    private removeElementChanges() {
        
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyLabelElement")
            .forEach(element => element.remove())
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyBorderAndOverlayElement")
            .forEach(element => {
                
                // @ts-ignore
                wrapInNil(element.parentElement).UIView._CBEditorOverlayElement = undefined
                // @ts-ignore
                element.UIView?.removeFromSuperview()
                
                element.remove()
                
            })
        
        this._selectedView.forEachViewInSubtree(view => {
            
            view.isResizable = view.isResizable && !view._isCBEditorTemporaryResizable
            view.isMovable = view.isMovable && !view._isCBEditorTemporaryMovable
            
            view._isCBEditorTemporaryResizable = NO
            view._isCBEditorTemporaryMovable = NO
            
        })
        
    }
    
    
    // section Data processing
    
    viewTreeDescriptors() {
        
        const result: CBEditorViewTreeDescriptor[] = []
        
        const forEachViewInSubtree = (view: UIView, targetArray: any[], pathArray: string[]) => {
            
            if (view == this.view) {
                return
            }
            
            if (IS(view.viewController)) {
                
                const viewController = view.viewController
                
                //const descriptor = view.propertyDescriptors.firstElement
                
                let className: string | undefined = viewController?.class?.name
                if (className?.startsWith("_")) {
                    className = className.substring(1)
                }
                
                const pathKeyObject = this.pathKeyObjectToViewControllerFromParentViewControllerOrView(viewController)
                const runtimeKeyPath = this.pathToViewControllerFromRootViewController(viewController)
                const viewControllerResult = {
                    
                    _id: "",
                    className: className,
                    descriptor: {
                        objectClassName: pathKeyObject.containerObject?.class?.name,
                        name: pathKeyObject.key
                    },
                    subDescriptors: [],
                    runtimeKeyPath: runtimeKeyPath
                    
                }
                
                targetArray.push(viewControllerResult)
                
                if (viewControllerResult.descriptor.name || pathArray.length) {
                    
                    pathArray = pathArray.copy()
                    
                    pathArray.push(
                        viewControllerResult.descriptor.name ??
                        ("subviews." + viewController.view.superview.subviews.indexOf(view) + ".viewController")
                    )
                    
                }
                
                viewControllerResult._id = pathArray.join(".") || MAKE_ID()
                
                targetArray = viewControllerResult.subDescriptors
                
            }
            
            const descriptor = view.propertyDescriptors.firstElement
            
            let className: string | undefined = view?.class?.name
            if (className?.startsWith("_")) {
                className = className.substring(1)
            }
            
            const result = {
                
                _id: "",
                className: className,
                descriptor: { objectClassName: descriptor?.object?.class?.name, name: descriptor?.name },
                subDescriptors: [],
                runtimeKeyPath: this.pathToViewFromRootViewController(view)
                
            }
            
            targetArray.push(result)
            
            if (result.descriptor.name || pathArray.length) {
                
                pathArray = pathArray.copy()
                
                pathArray.push(result.descriptor.name ?? ("subviews." + view.superview.subviews.indexOf(view)))
                
            }
            
            result._id = pathArray.join(".") || MAKE_ID()
            
            if (view.subviews.length) {
                
                result.subDescriptors = []
                view.subviews.forEach(value => forEachViewInSubtree(value, result.subDescriptors, pathArray))
                
            }
            
            var asdasd = result.descriptor.objectClassName == "TreeViewViewController" && result.runtimeKeyPath == "contentViewController.view"
            
            if (asdasd) {
                
                var asd = 1
                
            }
            
        }
        
        
        forEachViewInSubtree(UICore.main.rootViewController.view, result, [])
        
        return result
        
    }
    
    private pathToViewControllerFromRootViewController(viewController?: UIViewController) {
        
        let result: string
        
        if (viewController) {
            
            const pathKeyObject = this.pathKeyObjectToViewControllerFromParentViewControllerOrView(viewController)
            const viewOrViewController = pathKeyObject.containerObject
            result = this.expandKeyPath(pathKeyObject.key, viewOrViewController)
            
            if (result.startsWith(".")) {
                result = result.slice(1)
            }
            
            // if (IS_NOT(result) || viewController != viewController.view.rootView.viewController.valueForKeyPath(result)) {
            //
            //     result = "view" + viewController.withAllSuperviews.reverse()
            //         .map(view => view.superview?.subviews?.indexOf(view) ?? "")
            //         .join(".subviews.")
            //
            // }
            
        }
        
        // @ts-ignore
        return result
        
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
        
        let result: PathKeyObject = { containerObject: undefined, key: "" }
        
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
    
    
    // section Standard VC functions
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
    
    
    // section Editor layout
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
        
        this.treeView.frame = this.titleLabel.frame.rectangleForNextRow(padding, 500)
        
        this.addViewControllerButton.frame = this.treeView.frame.rectangleForNextRow(padding, labelHeight * 2)
            .rectangleWithWidth(bounds.width * 0.5 - padding * 0.5)
        this.deleteViewControllerButton.frame = this.addViewControllerButton.frame.rectangleForNextColumn(padding)
        
        this.currentViewLabel.frame = this.addViewControllerButton.frame
            .rectangleWithWidth(bounds.width)
            .rectangleForNextRow(
                padding,
                this.currentViewLabel.methods.intrinsicContentHeight
            )
        
        this.addViewButton.frame = this.currentViewLabel.frame.rectangleForNextRow(padding, labelHeight * 2)
        //.rectangleWithWidth(bounds.width * 0.5 - padding * 0.5)
        //this.removeViewButton.frame = this.addViewButton.frame.rectangleForNextColumn(padding)
        
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
        this.addViewButton.frame.rectangleWithWidth(bounds.width)
            .rectangleForNextRow(padding, tableRows.length * 70)
            .distributeViewsAlongHeight(
                tableRows,
                1,
                paddings,
                absoluteHeights
            )
        
        
        if (focusedPropertyIndex < 0) {
            
            this.buttonsRow.frame = (this.propertyEditors.lastElement ||
                this.addViewButton ||
                this.currentViewLabel).frame.rectangleWithWidth(bounds.width)
                .rectangleForNextRow(
                    padding
                )
            
            this.editorContainer.frame = this.buttonsRow.frame.rectangleForNextRow(
                padding * 0 + 5,
                [
                    bounds.height -
                    (this.propertyEditors.lastElement || this.currentViewLabel).frame.max.y -
                    padding *
                    2,
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




