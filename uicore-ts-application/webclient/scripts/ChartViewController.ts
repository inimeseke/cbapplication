import { UIColor, UIRoute, UITextArea, UITextView, UIView, UIViewController } from "uicore-ts";


export class ChartViewController extends UIViewController {
    
    readonly titleLabel: UITextView = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "ChartViewController",
        hoverText: "",
        backgroundColor: UIColor.transparentColor
    }).addedAsSubviewToView(this.view)
    dataInputTextArea: UITextArea = new UITextArea().addedAsSubviewToView(this.view).configuredWithObject({
        placeholderText: "Input your data here in JSON format"
    });

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
    
    
    static override readonly routeComponentName = "chart"
    
    static override readonly ParameterIdentifierName = {}
    
    override async viewDidAppear() {
    
    }
    
    
    override async viewWillDisappear() {
        
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(ChartViewController.routeComponentName)
        
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

        this.view.setPaddings(0, 0, padding, 0)
        this.dataInputTextArea.frame = this.titleLabel.frame.rectangleForNextRow(
            padding,
            [this.dataInputTextArea.intrinsicContentHeight(this.titleLabel.frame.width), 50].max
        )


    }
}








































































