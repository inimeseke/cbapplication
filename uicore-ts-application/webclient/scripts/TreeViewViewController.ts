import { CALL, UIColor, UIRoute, UITextField, UITextView, UIView, UIViewController, YES } from "uicore-ts"
import { CBButton } from "./Custom components/CBButton"
import { CBDataView } from "./Custom components/CBDataView"


export class TreeViewViewController extends UIViewController {
    
    readonly titleLabel: UITextView = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "TreeViewViewController",
        //localizedTextObject: { en: "Some content", est: "Mingi sisu" },
        backgroundColor: UIColor.transparentColor
    }).addedAsSubviewToView(this.view)
    
    treeView = new CBDataView<{ title: string, subData?: any[], asd: string }>().configuredWithObject({
        descriptors: [
            {
                keyPath: "title",
                title: "Title",
                defaultTitle: "Default title",
                allowSorting: YES,
                initialOrderingState: "ascending"
            },
            {
                keyPath: "asd",
                title: "Title asd",
                defaultTitle: "Default title",
                allowSorting: YES
            }
        ],
        setTreeData: CALL([
            {
                title: "Level 1 of 1",
                asd: "Asd",
                subData: [
                    {
                        title: "Level 2 of 1 1",
                        asd: "Asdasd",
                        subData: [
                            { title: "Level 3 of 1", asd: "Asdasdasd" }
                        ]
                    },
                    { title: "Level 2 of 1 2", asd: "Asdasd" }
                ]
            },
            { title: "Level 1 of 2", asd: "Asd" }
        ], "subData")
    }).addedAsSubviewToView(this.view)
    
    exampleButton: CBButton = new CBButton().addedAsSubviewToView(this.view).configuredWithObject({
        titleLabel: {
            text: "This text was written live",
            textAlignment: "center"
        }
    })
    
    bottomView = new UIView().addedAsSubviewToView(this.view)
    testView: UITextField = new UITextField().addedAsSubviewToView(this.view).configuredWithObject({
        placeholderText: "This is the test view text field",
        textAlignment: "center"
    });
    asdasd = new UIView().addedAsSubviewToView(this.view)
    

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
            backgroundColor: UIColor.whiteColor
        })
        
    }
    
    
    static override readonly routeComponentName = "treeview"
    
    static override readonly ParameterIdentifierName = {}
    
    override async viewDidAppear() {
    
    }
    
    
    override async viewWillDisappear() {
        
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(TreeViewViewController.routeComponentName)
        
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
        this.treeView.frame = this.titleLabel.frame.rectangleForNextRow(
            padding,
            [this.treeView.intrinsicContentHeight(this.titleLabel.frame.width), padding, 500].max()
        )
        this.exampleButton.frame = this.treeView.frame.rectangleForNextRow(
            padding,
            150
        )
        this.bottomView.frame = this.exampleButton.frame.rectangleForNextRow(
            padding,
            1
        )
        this.testView.frame = this.bottomView.frame.rectangleForNextRow(
            padding,
            [this.testView.intrinsicContentHeight(this.bottomView.frame.width), padding].max()
        )
        this.asdasd.frame = this.testView.frame.rectangleForNextRow(
            padding,
            [this.asdasd.intrinsicContentHeight(this.asdasd.frame.width), padding].max()
        )


    }
}














































































