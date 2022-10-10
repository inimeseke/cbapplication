import { UIObject } from "./UIObject"


export class UIPoint extends UIObject {
    
    constructor(public x: number, public y: number) {
        
        super()
        
    }
    
    
    copy() {
        return new UIPoint(this.x, this.y)
    }
    
    
    isEqualTo(point: UIPoint) {
        return (this.x == point.x && this.y == point.y)
    }
    
    scale(zoom: number) {
        const x = this.x
        const y = this.y
        this.x = x * zoom
        this.y = y * zoom
        return this
    }
    
    
    add(point: UIPoint) {
        this.x = this.x + point.x
        this.y = this.y + point.y
        return this
    }
    
    subtract(point: UIPoint) {
        this.x = this.x - point.x
        this.y = this.y - point.y
        return this
    }
    
    to(targetPoint: UIPoint) {
        return targetPoint.copy().add(this.copy().scale(-1))
    }
    
    pointWithX(x: number) {
        const result = this.copy()
        result.x = x
        return result
    }
    
    pointWithY(y: number) {
        const result = this.copy()
        result.y = y
        return result
    }
    
    pointByAddingX(x: number) {
        return this.pointWithX(this.x + x)
    }
    
    pointByAddingY(y: number) {
        return this.pointWithY(this.y + y)
    }
    
    
    get length() {
        let result = this.x * this.x + this.y * this.y
        result = Math.sqrt(result)
        return result
    }
    
    
    didChange(b: any) {
        
        // Callback to be set by delegate
        
    }
    
    
}






















