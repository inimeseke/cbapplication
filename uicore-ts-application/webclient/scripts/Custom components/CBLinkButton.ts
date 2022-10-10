import { UILinkButton } from "uicore-ts"
import { CBButton } from "./CBButton"


export class CBLinkButton extends UILinkButton {
    
    constructor(elementID?: string, elementType?: string) {
        
        super(elementID, elementType)
    
        this.button.removeFromSuperview()
        this.button = new CBButton(this.elementID + "Button", elementType)
        this.addSubview(this.button)
        
    }
    
}



























