import { NO, UIButton, UIObject, YES } from "uicore-ts"


export class CBButtonGroup extends UIObject {
    
    selectedButton?: UIButton
    readonly buttonsMap: Record<string, UIButton>
    
    get value() {
        const result = Object.entries(this.buttonsMap).find(
            ([_valueKey, button]) => button == this.selectedButton
        )?.[0]
        return result
    }
    
    set value(value: string | undefined) {
        this.buttonsMap.allValues.everyElement.selected = NO
        if (value) {
            this.buttonsMap[value].selected = YES
            // this.selectionDidChange(sender)
        }
    }
    
    
    constructor(buttons: Record<string, UIButton> | UIButton[]) {
        
        super()
        
        let buttonsObject: Record<string, UIButton> = buttons as any
        if (buttons instanceof Array) {
            buttonsObject = Object.fromEntries(buttons.map((button, index) => [index + "", button]))
        }
        this.buttonsMap = buttonsObject
        
        this.buttonsMap.forEach((button: UIButton, value) => {
            
            button.controlEventTargetAccumulator.EnterDown.PointerUpInside = (sender: UIButton, event?: Event) => {
                
                if (this.selectedButton == sender) {
                    return
                }
                
                // Select only the correct button
                this.buttonsMap.allValues.everyElement.selected = NO
                sender.selected = YES
                
                this.selectedButton = sender
                
                this.selectionDidChange(sender, value)
                
            }
            
        })
        
    }
    
    
    selectionDidChange(selectedButton: UIButton, value: string | undefined) {
        
        // Override this
        console.log("Selection changed to ", selectedButton)
        
    }
    
    
}






