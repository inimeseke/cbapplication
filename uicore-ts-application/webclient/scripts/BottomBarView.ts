import { UIColor, UIView } from "uicore-ts"


export class BottomBarView extends UIView {
    
    //label: UITextView;
    
    constructor(elementID: string) {
        
        super(elementID)
    
        this.backgroundColor = UIColor.colorWithRGBA(50, 50, 50)
    
        this.setInnerHTML("bottomBarContent", "bottomBarContent")
        
        // this.label = new UITextView("BottomBarLabel");
        // this.label.setText("bottomBarLabelText","Bottom bar for contact information and such");
        // this.label.textColor = UIColor.whiteColor;
        // this.label.textAlignment = UITextView.textAlignment.center;
    
        // this.addSubview(this.label);
        
    }
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        //this.label.centerInContainer();
        
    }
    
}
























