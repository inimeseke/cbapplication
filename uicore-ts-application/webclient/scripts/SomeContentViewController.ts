import { CALL, UIButton, UIColor, UIRoute, UITextView, UIView, UIViewController } from "uicore-ts"
import { CBButton } from "./Custom components/CBButton"


export class SomeContentViewController extends UIViewController {
    
    readonly titleLabel: UITextView = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Some content that can be changed using the editor.",
        hoverText: "",
        backgroundColor: UIColor.transparentColor
    }).addedAsSubviewToView(this.view)
    testingTheSpeedView: UITextView = new UITextView().addedAsSubviewToView(this.view).configuredWithObject({
        text: "Autopood testing the speed view asdasd"
    })
    someButton: CBButton = new CBButton().addedAsSubviewToView(this.view).configuredWithObject({
        titleLabel: {
            text: "Some button"
        },
        controlEventTargetAccumulator: {
            PointerUpInside: (sender, event) => {
                
                console.log(sender)
                //alert(sender.elementID)

                UIRoute.currentRoute.routeWithComponent("treeview", {}).apply()

            }
        },
        hoverText: "Some button",
        style: { margin: "20px" }
    })
    bottomView = new UIView().addedAsSubviewToView(this.view);

    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
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
        this.testingTheSpeedView.frame = this.titleLabel.frame.rectangleForNextRow(
            padding,
            [this.testingTheSpeedView.intrinsicContentHeight(this.titleLabel.frame.width), padding].max()
        )
        this.someButton.frame = this.testingTheSpeedView.frame.rectangleForNextRow(
            padding ** 0,
            labelHeight * 2
        ).rectangleByAddingX(-padding)
        this.bottomView.frame = this.someButton.frame.rectangleForNextRow(
            padding,
            [this.bottomView.intrinsicContentHeight(this.someButton.frame.width), padding].max()
        )


    }
}


