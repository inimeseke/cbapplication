import { CBDropdownDataItem, SocketClient } from "cbcore-ts"
import type * as monaco from "monaco-editor"
import { IPosition } from "monaco-editor"
import {
    IF,
    IS,
    nil,
    NO,
    RETURNER,
    UIColor,
    UIObject,
    UIRectangle,
    UIRoute,
    UITextView,
    UIView,
    UIViewController,
    YES
} from "uicore-ts"
import { CBButton } from "./Custom components/CBButton"
import { CBColor } from "./Custom components/CBColor"
import { CBColorSelector } from "./Custom components/CBColorSelector"
import { CBFlatButton } from "./Custom components/CBFlatButton"
import { CBTextField } from "./Custom components/CBTextField"
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


export class EditorViewController extends UIViewController {
    
    readonly titleLabel = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Editor",
        userInteractionEnabled: NO
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    closeButton = new CBButton().configuredWithObject({
        titleLabel: { text: "X" },
        controlEventTargetAccumulator: {
            PointerUpInside: () => UIRoute.currentRoute
                .routeByRemovingParameterInComponent("settings", "editorOpen")
                .applyByReplacingCurrentRouteInHistory()
        }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    currentViewLabel = new UITextView().performingFunctionWithSelf(self => this.view.addSubview(self))
    propertyEditors: CBColorSelector<CBEditorPropertyDescriptor>[] = []
    
    buttons: CBFlatButton[] = []
    
    editorContainer = new UIView("EditorEditorContainer", nil, "iframe").configuredWithObject({
        viewHTMLElement: { src: "CBEditorEditor.html" }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    private _selectedView: UIView = nil
    
    private _editor: monaco.editor.IStandaloneCodeEditor & {
        addExtraLibFromContents(fileText: string, path: string): void
        addModelFromContents(fileText: string, path: string): void
        loadModelFromContents(fileText: string, path: string): void
    } = nil
    private _currentEditingView?: UIView
    private _currentClassName?: string
    
    
    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
        this.view.backgroundColor = UIColor.whiteColor
        this.view.setBorder(2, 1)
        
        this.view.calculateAndSetViewFrame = () => {
    
            const width = 550
            const height = 850 + this.propertyEditors.length * 70
            
            this.view.setFrame(
                new UIRectangle(
                    view.rootView.bounds.width - 10 - width + this.view.pointerDraggingPoint.x,
                    10 + this.view.pointerDraggingPoint.y,
                    height,
                    width
                ),
                500
            )
    
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
    
    
    private async shouldCallPointerUpInsideOnView(view: UIView, forced = NO) {
    
        if (!forced && (!this.view.isMemberOfViewTree || view.allSuperviews.contains(this.view) || this._currentEditingView == view)) {
            return
        }
        
        this.view.userInteractionEnabled = NO
        this.view.alpha = 0.5
        
        this._currentEditingView = view
        //this.currentViewLabel.text = view.elementID
        
        this.highlightView(view)
        
        // Obtain data
        const propertyDescriptors = view.propertyDescriptors
        const annotatedPropertyDescriptorObjects = (await SocketClient.AnnotatePropertyDescriptors(
            propertyDescriptors.map(value => {
                return {
                    className: value.object.constructor.name,
                    propertyKey: value.name
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
        
        this.buttons.everyElement.removeFromSuperview()
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
        this.view.addSubviews(this.buttons)
        
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
            propertyKey: propertyDescriptor.name
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
                        propertyKey: property.path
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
                                valueString: self.selectedColorStringValueForEditor
                            })).result
    
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
    
                        // @ts-ignore
                        self.textField.controlEventTargetAccumulator.TextChange = () =>
                            propertyDescriptor.object.setValueForKeyPath(
                                property.path,
                                self.text + IF(outerHTMLIfNeeded)(RETURNER(" " + outerHTMLIfNeeded))
                                    .ELSE(RETURNER(""))
                            )
    
                        self.textField.controlEventTargetAccumulator.Blur.EnterDown = async () => {
        
                            const newValue = self.text + IF(outerHTMLIfNeeded)(RETURNER(" " + outerHTMLIfNeeded))
                                .ELSE(RETURNER(""))
                            const isValueChanged = text != newValue
        
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
                                valueString: self.textField.text
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
                
            }
            
        })
        
    }
    
    private removeElementChanges() {
        
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyLabelElement")
            .forEach(element => element.remove())
        this._selectedView.viewHTMLElement.querySelectorAll(".CBEditorPropertyBorderAndOverlayElement")
            .forEach(element => element.remove())
        
    }
    
    private async reloadEditor() {
    
        this.view.userInteractionEnabled = NO
        const editorIframe: HTMLIFrameElement = this.editorContainer.viewHTMLElement as HTMLIFrameElement
        editorIframe?.contentDocument?.location?.reload()
        await this.initEditor()
        this.view.userInteractionEnabled = YES
        
    }
    
    
    static override readonly routeComponentName = "cb_editor"
    
    static override readonly ParameterIdentifierName = {}
    
    override async viewDidAppear() {
        
        // this.editor = monaco.editor.create(document.getElementById("testContainer")!, {
        //     value: ["function x(asdasd: string) {", "\tconsole.log(\"Asdasd \" + asdasd)", "}"].join("\n"),
        //     language: "typescript"
        // })
        
        //this.view.setNeedsLayout()
        
        
    }
    
    
    override async viewWillDisappear() {
        
        this.removeElementChanges()
        
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
        
        this.currentViewLabel.frame = this.titleLabel.frame.rectangleForNextRow(padding)
        
        this.currentViewLabel.frame.rectangleForNextRow(padding, this.propertyEditors.length * 70)
            .distributeViewsAlongHeight(this.propertyEditors, 1, padding, 50)
        
        const buttonsFrame = (this.propertyEditors.lastElement || this.currentViewLabel).frame.rectangleForNextRow(
            padding)
            .distributeViewsEquallyAlongWidth(this.buttons.copy().reverse(), 1)
        
        const editorFrame = buttonsFrame.rectangleForNextRow(
            padding * 0 + 5,
            bounds.height - (this.propertyEditors.lastElement || this.currentViewLabel).frame.max.y - padding * 2
        )
        // this.editorContainer.style.position = ""
        // this.editorContainer.style.margin = ""
        // this.editorContainer.style.overflow = ""
        // this.editorContainer.setPosition(
        //     editorFrame.x,
        //     editorFrame.max.x,
        //     nil,
        //     nil,
        //     editorFrame.height,
        //     editorFrame.width
        // )
        this.editorContainer.frame = editorFrame
        this._editor.layout({ height: editorFrame.height, width: editorFrame.width })
        
    }
    
    
}




