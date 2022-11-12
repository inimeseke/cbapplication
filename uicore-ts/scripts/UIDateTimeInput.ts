import { nil } from "./UIObject"
import { UIView, UIViewAddControlEventTargetObject } from "./UIView"


export class UIDateTimeInput extends UIView {
    
    
    constructor(elementID: string, type: string = UIDateTimeInput.type.DateTime) {
        
        super(elementID, nil, "input")
        
        this.viewHTMLElement.setAttribute("type", type)
        
        this.viewHTMLElement.onchange = (event) => {
            this.sendControlEventForKey(UIDateTimeInput.controlEvent.ValueChange, event)
        }
    
    }
    
    
    static override controlEvent = Object.assign({}, UIView.controlEvent, {
    
        "ValueChange": "ValueChange"
    
    })
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<UIDateTimeInput> {
        return super.controlEventTargetAccumulator as any
    }
    
    
    static type = {
        
        "Date": "date",
        "Time": "time",
        "DateTime": "datetime"
        
        
    }
    
    
    static format = {
        
        "European": "DD-MM-YYYY",
        "ISOComputer": "YYYY-MM-DD",
        "American": "MM/DD/YYYY"
        
    }
    
    
    get date() {
        
        const result = new Date((this.viewHTMLElement as HTMLInputElement).value)
        
        return result
        
    }
    
    
}
























