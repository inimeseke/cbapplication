const YES = true
const NO = false


export class UITimer {
    
    
    _intervalID!: number
    
    isValid: boolean = YES
    
    
    constructor(public interval: number, public repeats: boolean, public target: Function) {
        
        this._schedule()
        
    }
    
    
    _schedule() {
        
        if (this.repeats) {
            this._intervalID = window.setInterval(() => {
                this.target()
            }, this.interval * 1000)
        }
        else {
            this._intervalID = window.setTimeout(() => {
                this.isValid = NO
                this.target()
            }, this.interval * 1000)
        }
        
    }
    
    
    reschedule() {
        
        this.invalidate()
        this._schedule()
        
    }
    
    
    fire() {
        if (this.repeats == NO) {
            this.invalidate()
        }
        this.target()
    }
    
    invalidate() {
        
        if (this.isValid) {
            
            if (this.repeats) {
                clearInterval(this._intervalID)
            }
            else {
                clearTimeout(this._intervalID)
            }
            
            this.isValid = NO
            
        }
        
    }
    
    
}
