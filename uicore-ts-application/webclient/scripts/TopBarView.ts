import { LooseObject, nil, UITextView, UIView } from "uicore-ts"
import { CBColor } from "./Custom components/CBColor"


export class TopBarView extends UIView {
    
    titleLabel: UITextView
    
    constructor(elementID: string | undefined, element?: HTMLElement & LooseObject) {
        
        super(elementID, element)
        
        this.backgroundColor = CBColor.whiteColor
        //this.initStyleSelector("." + this.styleClassName, "position: static; left: 0; right: 0; top: 0; height: 50px;")
        this.addStyleClass("TopBarView")
        
        this.setBorder(nil, 0, CBColor.primaryContentColor)
        this.style.borderBottomWidth = "1px"
        
        this.style.fontSize = "15pt"
        
        
        this.titleLabel = new UITextView("TopBarTitleLabel")
        this.titleLabel.setText("topBarTitle", "TestPage")
        this.titleLabel.textColor = CBColor.primaryContentColor
        this.titleLabel.fontSize = 25
        this.addSubview(this.titleLabel)
        
        this.style.zIndex = "10"
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        // Variables
        const bounds = this.bounds
        const sidePadding = 10
        
        
        // Title
        this.titleLabel.centerInContainer()
        
        
    }
    
    
}


















