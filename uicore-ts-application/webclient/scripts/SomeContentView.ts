import { UIView } from "uicore-ts"


export class SomeContentView extends UIView {
    
    
    constructor(elementID: string) {
        
        super(elementID)
    
        // Code for further setup if necessary
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        const bounds = this.bounds.rectangleWithInset(padding)
        
    }
    
    
}




























