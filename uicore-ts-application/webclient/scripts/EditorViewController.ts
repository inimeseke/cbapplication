import { SocketClient } from "cbcore-ts"
import type * as monaco from "monaco-editor"
import {
    IF,
    IS,
    nil,
    NO, RETURNER,
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
import { CBFlatButton } from "./Custom components/CBFlatButton"
import { CBEditorAnnotatedPropertyDescriptor } from "./SocketClientFunctions"


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
    
    buttons: CBFlatButton[] = []
    
    editorContainer = new UIView("EditorEditorContainer", nil, "iframe").configuredWithObject({
        viewHTMLElement: { src: "CBEditorEditor.html" }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    private _selectedViewColor: UIColor = nil
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
            const height = 850
            
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
        
        this.initEditor().then(nil)
        
        UIView.shouldCallPointerUpInsideOnView = async eventView => await this.shouldCallPointerUpInsideOnView(eventView) ?? YES
        
        
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
    
    
    private async shouldCallPointerUpInsideOnView(view: UIView) {
        
        if (!this.view.isMemberOfViewTree || view.allSuperviews.contains(this.view) || this._currentEditingView == view) {
            return
        }
        
        this._currentEditingView = view
        //this.currentViewLabel.text = view.elementID
        
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
        await this.showProperty(propertyDescriptor)
        this.highlightView(view)
        
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
    
    private async showProperty(propertyDescriptor: { object: UIObject, className: string, name: string }) {
        
        if (!propertyDescriptor) {
            return
        }
        
        const isClassChanged = this._currentClassName != propertyDescriptor.className
        this.currentViewLabel.text = propertyDescriptor?.object?.class?.name +
            "_" + propertyDescriptor?.name
        
        if (isClassChanged) {
            await this.reloadEditor()
        }
        
        const fileObject = (await SocketClient.EditProperty({
            className: propertyDescriptor.className,
            propertyKey: propertyDescriptor.name
        })).result
        
        if (isClassChanged) {
            
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
        this._editor.setPosition(
            IF(fileObject?.propertyLocation?.className == this._currentClassName)(
                () => fileObject.propertyLocation.end
            ).ELSE(
                () => fileObject.propertyReferenceLocations?.firstElement?.end ?? { lineNumber: 0, column: 0 }
            )
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
        this._selectedViewColor = view.backgroundColor
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
        this._selectedView.backgroundColor = this._selectedViewColor
        
    }
    
    private async reloadEditor() {
        
        const editorIframe: HTMLIFrameElement = this.editorContainer.viewHTMLElement as HTMLIFrameElement
        editorIframe?.contentDocument?.location?.reload()
        await this.initEditor()
        
    }
    
    
    static readonly routeComponentName = "cb_editor"
    
    static readonly ParameterIdentifierName = {}
    
    async viewDidAppear() {
        
        // this.editor = monaco.editor.create(document.getElementById("testContainer")!, {
        //     value: ["function x(asdasd: string) {", "\tconsole.log(\"Asdasd \" + asdasd)", "}"].join("\n"),
        //     language: "typescript"
        // })
        
        //this.view.setNeedsLayout()
        
        
    }
    
    
    async viewWillDisappear() {
    
        this.removeElementChanges()
        
    }
    
    
    async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(EditorViewController.routeComponentName)
        
    }
    
    
    updateViewConstraints() {
        
        super.updateViewConstraints()
        
    }
    
    
    updateViewStyles() {
        
        super.updateViewStyles()
        
    }
    
    
    viewDidLayoutSubviews() {
        
        super.viewDidLayoutSubviews()
        
    }
    
    
    layoutViewSubviews() {
        
        super.layoutViewSubviews()
        
        const padding = this.core.paddingLength
        const labelHeight = padding
    
        // View bounds
        const bounds = this.view.bounds.rectangleWithInset(padding)
    
        this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight * 2)
        this.closeButton.frame = bounds.rectangleWithHeight(28).rectangleWithWidth(28, 1)
    
        this.currentViewLabel.frame = this.titleLabel.frame.rectangleForNextRow(padding)
    
        const buttonsFrame = this.currentViewLabel.frame.rectangleForNextRow(padding)
            .distributeViewsEquallyAlongWidth(this.buttons.copy().reverse(), 1)
    
        const editorFrame = buttonsFrame.rectangleForNextRow(
            padding * 0 + 5,
            bounds.height - this.currentViewLabel.frame.max.y - padding * 2
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




