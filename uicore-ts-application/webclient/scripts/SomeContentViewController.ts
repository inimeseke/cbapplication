import { UIButton, UIColor, UIRoute, UITextView, UIView, UIViewController } from "uicore-ts"


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
            self.text = "Open the editor and click to edit this element."
            
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
    asdasd: UITextView = new UITextView().addedAsSubviewToView(this.view).configuredWithObject({
        text: "asdasdasdasdasdasdasd"
    })
    autopood = new UITextView().addedAsSubviewToView(this.view).configuredWithObject({
        innerHTML: "autopood asdasd",
        textColor: UIColor.redColor
    })
    autopoodasd = new UITextView().addedAsSubviewToView(this.view).configuredWithObject({
        innerHTML: "Autopood asdasd",
        text: "Autopood asd"
    })
    autopoodasdasd: UIButton = new UIButton().addedAsSubviewToView(this.view).configuredWithObject({
        innerHTML: "Autopood asdasd"
    })
    testview: UITextView = new UITextView().addedAsSubviewToView(this.view).configuredWithObject({
        text: "Test view"
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
        this.asdasd.frame = this.titleLabel.frame.rectangleForNextRow(padding)
        this.autopood.frame = this.asdasd.frame.rectangleForNextRow(padding)
        this.autopoodasd.frame = this.autopood.frame.rectangleForNextRow(
            padding,
            [this.autopoodasd.intrinsicContentHeight(this.autopood.frame.width), padding].max()
        )
        this.autopoodasdasd.frame = this.autopoodasd.frame.rectangleForNextRow(
            padding,
            [this.autopoodasdasd.intrinsicContentHeight(this.autopoodasd.frame.width), padding].max()
        )
        this.testview.frame = this.autopoodasdasd.frame.rectangleForNextRow(
            padding,
            [this.testview.intrinsicContentHeight(this.autopoodasdasd.frame.width), padding].max()
        )
    
    
    }
}








































































