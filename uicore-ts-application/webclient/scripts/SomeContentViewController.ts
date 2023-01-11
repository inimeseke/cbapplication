import { UIColor, UIRoute, UITextView, UIView, UIViewController } from "uicore-ts"


export class SomeContentViewController extends UIViewController {
    
    readonly titleLabel: UITextView = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Some content that can be changed using the editor.",
        hoverText: "",
        //localizedTextObject: { en: "Some content", est: "Mingi sisu" },
        backgroundColor: UIColor.transparentColor
    }).addedAsSubviewToView(this.view).performingFunctionWithSelf(function (self) {
        
        var textValue = self.text

        self.controlEventTargetAccumulator.PointerHover = () => {
            
            textValue = self.text
            self.text = "Click to edit this element."
            
            // @ts-ignore
            if (self._CBEditorOverlayElement) {
    
                // @ts-ignore
                self.viewHTMLElement.appendChild(self._CBEditorOverlayElement)
    
            }
            
        }
        
        self.controlEventTargetAccumulator.PointerLeave.PointerCancel = () => {
            
            self.text = textValue
    
            // @ts-ignore
            if (self._CBEditorOverlayElement) {
        
                // @ts-ignore
                self.viewHTMLElement.appendChild(self._CBEditorOverlayElement)
        
            }
            
        }
        
    })
    
    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
        //this.view.backgroundColor = new UIColor("#ffffff")
        
        //this.view = this.view.configuredWithObject({ backgroundColor: new UIColor("#df5858") })
        
        //     .configuredWithObject({
        //     //backgroundColor: new UIColor("#d94545")
        //     backgroundColor: new UIColor("#ca0707")
        // })
        
        this.view.configureWithObject({
            backgroundColor: UIColor.whiteColor,
            hoverText: ""
        })
        
    }
    
    get titleLabel() {}
    
    
    static override readonly routeComponentName = "somecontent"
    
    static override readonly ParameterIdentifierName = {}
    
    override async viewDidAppear() {
    
    }
    
    
    override async viewWillDisappear() {
    
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(SomeContentViewController.routeComponentName)
        
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
        
    }
    
    
}








































































