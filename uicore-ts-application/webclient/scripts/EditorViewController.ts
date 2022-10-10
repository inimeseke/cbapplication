import { SocketClient } from "cbcore-ts"
import * as monaco from "monaco-editor"
import { nil, NO, UIButton, UIColor, UIRectangle, UIRoute, UITextView, UIView, UIViewController } from "uicore-ts"


export class EditorViewController extends UIViewController {
    
    readonly titleLabel = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Editor",
        userInteractionEnabled: NO
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    closeButton = new UIButton().configuredWithObject({
        titleLabel: { text: "X" },
        controlEventTargetAccumulator: {
            PointerUpInside: () => UIRoute.currentRoute
                .routeByRemovingParameterInComponent("settings", "editorOpen")
                .applyByReplacingCurrentRouteInHistory()
        }
    }).performingFunctionWithSelf(self => this.view.addSubview(self))
    
    currentViewLabel = new UITextView().performingFunctionWithSelf(self => this.view.addSubview(self))
    
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
        
        this.initEditor()
        
        UIView.pointerUpInsideCalled = eventView => this.pointerUpInsideWasCalledOnView(eventView)
        
        
    }
    
    
    private initEditor() {
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
            }
        }
    }
    
    
    private async pointerUpInsideWasCalledOnView(view: UIView) {
        
        
        if (!this.view.isMemberOfViewTree || view.allSuperviews.contains(this.view)) {
            return
        }
        
        this.currentViewLabel.text = view.elementID
        
        const propertyDescriptor = view.propertyDescriptors.firstElement
        if (propertyDescriptor) {
            
            this.currentViewLabel.text = propertyDescriptor?.object?.constructor?.name +
                "_" + propertyDescriptor?.name
            
            const fileObject = (await SocketClient.EditProperty({
                className: propertyDescriptor.object.constructor.name,
                propertyKey: propertyDescriptor.name
            })).result
            
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
            
            
        }
        
        
        this._selectedView.backgroundColor = this._selectedViewColor
        this._selectedViewColor = view.backgroundColor
        
        view.backgroundColor = UIColor.redColor
        
        this._selectedView = view
        
        
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
        
        this._selectedView.backgroundColor = this._selectedViewColor
        
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
        
        const editorFrame = this.currentViewLabel.frame.rectangleForNextRow(
            padding,
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




