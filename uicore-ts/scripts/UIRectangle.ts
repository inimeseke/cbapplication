import { FIRST_OR_NIL, IS, IS_DEFINED, IS_NIL, IS_NOT_LIKE_NULL, IS_NOT_NIL, nil, NO, UIObject, YES } from "./UIObject"
import { UIPoint } from "./UIPoint"
import { UIView } from "./UIView"


export type SizeNumberOrFunctionOrView = number | ((constrainingOrthogonalSize: number) => number) | UIView

export class UIRectangle extends UIObject {
    
    _isBeingUpdated: boolean
    rectanglePointDidChange?: (b: any) => void
    max: UIPoint
    min: UIPoint
    
    // The min and max values are just for storage.
    // You need to call rectangleByEnforcingMinAndMaxSizes to make use of them.
    minHeight?: number
    maxHeight?: number
    minWidth?: number
    maxWidth?: number
    
    
    constructor(x: number = 0, y: number = 0, height: number = 0, width: number = 0) {
        
        super()
        
        this.min = new UIPoint(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
        this.max = new UIPoint(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
        
        this.min.didChange = (point) => {
            this.rectanglePointDidChange?.(point)
            this._rectanglePointDidChange()
        }
        this.max.didChange = (point) => {
            this.rectanglePointDidChange?.(point)
            this._rectanglePointDidChange()
        }
        
        this._isBeingUpdated = NO
        
        this.min = new UIPoint(x, y)
        this.max = new UIPoint(x + width, y + height)
        
        if (IS_NIL(height)) {
            this.max.y = height
        }
        
        if (IS_NIL(width)) {
            this.max.x = width
        }
        
    }
    
    
    copy() {
        
        const result = new UIRectangle(this.x, this.y, this.height, this.width)
        
        result.minHeight = this.minHeight
        result.minWidth = this.minWidth
        result.maxHeight = this.maxHeight
        result.maxWidth = this.maxWidth
        
        return result
        
    }
    
    isEqualTo(rectangle: UIRectangle | null | undefined) {
        return (IS(rectangle) && this.min.isEqualTo(rectangle.min) && this.max.isEqualTo(rectangle.max))
    }
    
    static zero() {
        return new UIRectangle(0, 0, 0, 0)
    }
    
    containsPoint(point: UIPoint) {
        return this.min.x <= point.x && this.min.y <= point.y &&
            point.x <= this.max.x && point.y <= this.max.y
    }
    
    updateByAddingPoint(point: UIPoint) {
        
        if (!point) {
            point = new UIPoint(0, 0)
        }
        
        this.beginUpdates()
        
        const min = this.min.copy()
        if (min.x === nil) {
            min.x = this.max.x
        }
        if (min.y === nil) {
            min.y = this.max.y
        }
        
        const max = this.max.copy()
        if (max.x === nil) {
            max.x = this.min.x
        }
        if (max.y === nil) {
            max.y = this.min.y
        }
        
        this.min.x = Math.min(min.x, point.x)
        this.min.y = Math.min(min.y, point.y)
        this.max.x = Math.max(max.x, point.x)
        this.max.y = Math.max(max.y, point.y)
        
        this.finishUpdates()
        
    }
    
    scale(scale: number) {
        if (IS_NOT_NIL(this.max.y)) {
            this.height = this.height * scale
        }
        if (IS_NOT_NIL(this.max.x)) {
            this.width = this.width * scale
        }
    }
    
    get height() {
        if (this.max.y === nil) {
            return nil
        }
        return this.max.y - this.min.y
    }
    
    set height(height: number) {
        this.max.y = this.min.y + height
    }
    
    
    get width() {
        if (this.max.x === nil) {
            return nil
        }
        return this.max.x - this.min.x
    }
    
    set width(width: number) {
        this.max.x = this.min.x + width
    }
    
    
    get x() {
        return this.min.x
    }
    
    set x(x: number) {
        
        this.beginUpdates()
        
        const width = this.width
        this.min.x = x
        this.max.x = this.min.x + width
        
        this.finishUpdates()
        
    }
    
    
    get y() {
        return this.min.y
    }
    
    
    set y(y: number) {
        
        this.beginUpdates()
        
        const height = this.height
        this.min.y = y
        this.max.y = this.min.y + height
        
        this.finishUpdates()
        
    }
    
    
    get topLeft() {
        return this.min.copy()
    }
    
    get topRight() {
        return new UIPoint(this.max.x, this.y)
    }
    
    get bottomLeft() {
        return new UIPoint(this.x, this.max.y)
    }
    
    get bottomRight() {
        return this.max.copy()
    }
    
    
    get center() {
        return this.min.copy().add(this.min.to(this.max).scale(0.5))
    }
    
    set center(center: UIPoint) {
        const offset = this.center.to(center)
        this.offsetByPoint(offset)
    }
    
    offsetByPoint(offset: UIPoint) {
        this.min.add(offset)
        this.max.add(offset)
        
        return this
    }
    
    
    concatenateWithRectangle(rectangle: UIRectangle) {
        this.updateByAddingPoint(rectangle.bottomRight)
        this.updateByAddingPoint(rectangle.topLeft)
        return this
    }
    
    rectangleByConcatenatingWithRectangle(rectangle: UIRectangle) {
        return this.copy().concatenateWithRectangle(rectangle)
    }
    
    
    intersectionRectangleWithRectangle(rectangle: UIRectangle): UIRectangle {
        
        const result = this.copy()
        
        result.beginUpdates()
        
        const min = result.min
        if (min.x === nil) {
            min.x = rectangle.max.x - Math.min(result.width, rectangle.width)
        }
        if (min.y === nil) {
            min.y = rectangle.max.y - Math.min(result.height, rectangle.height)
        }
        
        const max = result.max
        if (max.x === nil) {
            max.x = rectangle.min.x + Math.min(result.width, rectangle.width)
        }
        if (max.y === nil) {
            max.y = rectangle.min.y + Math.min(result.height, rectangle.height)
        }
        
        result.min.x = Math.max(result.min.x, rectangle.min.x)
        result.min.y = Math.max(result.min.y, rectangle.min.y)
        result.max.x = Math.min(result.max.x, rectangle.max.x)
        result.max.y = Math.min(result.max.y, rectangle.max.y)
        
        
        if (result.height < 0) {
            
            const averageY = (this.center.y + rectangle.center.y) * 0.5
            result.min.y = averageY
            result.max.y = averageY
            
        }
        
        if (result.width < 0) {
            
            const averageX = (this.center.x + rectangle.center.x) * 0.5
            result.min.x = averageX
            result.max.x = averageX
            
        }
        
        result.finishUpdates()
        
        return result
        
    }
    
    
    get area() {
        return this.height * this.width
    }
    
    
    intersectsWithRectangle(rectangle: UIRectangle) {
        return (this.intersectionRectangleWithRectangle(rectangle).area != 0)
    }
    
    
    // add some space around the rectangle
    rectangleWithInsets(left: number, right: number, bottom: number, top: number) {
        const result = this.copy()
        result.min.x = this.min.x + left
        result.max.x = this.max.x - right
        result.min.y = this.min.y + top
        result.max.y = this.max.y - bottom
        return result
    }
    
    rectangleWithInset(inset: number) {
        return this.rectangleWithInsets(inset, inset, inset, inset)
    }
    
    rectangleWithHeight(height: number, centeredOnPosition: number = nil) {
        
        if (isNaN(centeredOnPosition)) {
            centeredOnPosition = nil
        }
        
        const result = this.copy()
        result.height = height
        
        if (centeredOnPosition != nil) {
            const change = height - this.height
            result.offsetByPoint(new UIPoint(0, change * centeredOnPosition).scale(-1))
        }
        
        return result
        
    }
    
    rectangleWithWidth(width: number, centeredOnPosition: number = nil) {
        
        if (isNaN(centeredOnPosition)) {
            centeredOnPosition = nil
        }
        
        const result = this.copy()
        result.width = width
        
        if (centeredOnPosition != nil) {
            const change = width - this.width
            result.offsetByPoint(new UIPoint(change * centeredOnPosition, 0).scale(-1))
        }
        
        return result
        
    }
    
    rectangleWithHeightRelativeToWidth(heightRatio: number = 1, centeredOnPosition: number = nil) {
        return this.rectangleWithHeight(this.width * heightRatio, centeredOnPosition)
    }
    
    rectangleWithWidthRelativeToHeight(widthRatio: number = 1, centeredOnPosition: number = nil) {
        return this.rectangleWithWidth(this.height * widthRatio, centeredOnPosition)
    }
    
    rectangleWithX(x: number, centeredOnPosition: number = 0) {
        
        const result = this.copy()
        result.x = x - result.width * centeredOnPosition
        
        return result
        
    }
    
    rectangleWithY(y: number, centeredOnPosition: number = 0) {
        
        const result = this.copy()
        result.y = y - result.height * centeredOnPosition
        
        return result
        
    }
    
    
    rectangleByAddingX(x: number) {
        
        const result = this.copy()
        result.x = this.x + x
        
        return result
        
    }
    
    rectangleByAddingY(y: number) {
        
        const result = this.copy()
        result.y = this.y + y
        
        return result
        
    }
    
    rectangleByAddingWidth(widthToAdd: number, centeredOnPosition = 0) {
        
        const result = this.rectangleWithWidth(this.width + widthToAdd, centeredOnPosition)
        
        return result
        
    }
    
    rectangleByAddingHeight(heightToAdd: number, centeredOnPosition = 0) {
        
        const result = this.rectangleWithHeight(this.height + heightToAdd, centeredOnPosition)
        
        return result
        
    }
    
    
    rectangleWithRelativeValues(
        relativeXPosition: number,
        widthMultiplier: number,
        relativeYPosition: number,
        heightMultiplier: number
    ) {
        
        const result = this.copy()
        
        const width = result.width
        const height = result.height
        
        result.width = widthMultiplier * width
        result.height = heightMultiplier * height
        
        result.center = new UIPoint(
            relativeXPosition * width,
            relativeYPosition * height
        )
        
        return result
        
    }
    
    
    /**
     * Returns a rectangle with a maximum width constraint
     * If current width exceeds max, centers the constrained width
     */
    rectangleWithMaxWidth(maxWidth: number, centeredOnPosition: number = 0): UIRectangle {
        if (this.width <= maxWidth) {
            return this.copy()
        }
        return this.rectangleWithWidth(maxWidth, centeredOnPosition)
    }
    
    /**
     * Returns a rectangle with a maximum height constraint
     */
    rectangleWithMaxHeight(maxHeight: number, centeredOnPosition: number = 0): UIRectangle {
        if (this.height <= maxHeight) {
            return this.copy()
        }
        return this.rectangleWithHeight(maxHeight, centeredOnPosition)
    }
    
    /**
     * Returns a rectangle with minimum width constraint
     */
    rectangleWithMinWidth(minWidth: number, centeredOnPosition: number = 0): UIRectangle {
        if (this.width >= minWidth) {
            return this.copy()
        }
        return this.rectangleWithWidth(minWidth, centeredOnPosition)
    }
    
    /**
     * Returns a rectangle with minimum height constraint
     */
    rectangleWithMinHeight(minHeight: number, centeredOnPosition: number = 0): UIRectangle {
        if (this.height >= minHeight) {
            return this.copy()
        }
        return this.rectangleWithHeight(minHeight, centeredOnPosition)
    }
    
    // Returns a new rectangle that is positioned relative to the reference rectangle
    // By default, it makes a copy of this rectangle taht is centered in the target rectangle
    rectangleByCenteringInRectangle(referenceRectangle: UIRectangle, xPosition = 0.5, yPosition = 0.5) {
        const result = this.copy()
        result.center = referenceRectangle.topLeft
            .pointByAddingX(xPosition * referenceRectangle.width)
            .pointByAddingY(yPosition * referenceRectangle.height)
        return result
    }
    
    
    rectanglesBySplittingWidth(
        weights: SizeNumberOrFunctionOrView[],
        paddings: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 0,
        absoluteWidths: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = nil
    ) {
        
        if (IS_NIL(paddings)) {
            paddings = 1
        }
        if (!((paddings as any) instanceof Array)) {
            paddings = [paddings].arrayByRepeating(weights.length - 1)
        }
        paddings = (paddings as any[]).arrayByTrimmingToLengthIfLonger(weights.length - 1)
        paddings = paddings.map(padding => this._widthNumberFromSizeNumberOrFunctionOrView(padding))
        if (!(absoluteWidths instanceof Array) && IS_NOT_NIL(absoluteWidths)) {
            absoluteWidths = [absoluteWidths].arrayByRepeating(weights.length)
        }
        absoluteWidths = absoluteWidths.map(
            width => this._widthNumberFromSizeNumberOrFunctionOrView(width)
        )
        
        weights = weights.map(weight => this._widthNumberFromSizeNumberOrFunctionOrView(weight))
        const result: UIRectangle[] = []
        const sumOfWeights = (weights as number[]).reduce(
            (a, b, index) => {
                if (IS_NOT_NIL((absoluteWidths as number[])[index])) {
                    b = 0
                }
                return a + b
            },
            0
        )
        const sumOfPaddings = paddings.summedValue as number
        const sumOfAbsoluteWidths = (absoluteWidths as number[]).summedValue
        const totalRelativeWidth = this.width - sumOfPaddings - sumOfAbsoluteWidths
        let previousCellMaxX = this.x
        
        for (let i = 0; i < weights.length; i++) {
            
            let resultWidth: number
            if (IS_NOT_NIL(absoluteWidths[i])) {
                resultWidth = (absoluteWidths[i] || 0) as number
            }
            else {
                resultWidth = totalRelativeWidth * (weights[i] as number / sumOfWeights)
            }
            
            const rectangle = this.rectangleWithWidth(resultWidth)
            
            let padding = 0
            if (paddings.length > i && paddings[i]) {
                padding = paddings[i] as number
            }
            
            rectangle.x = previousCellMaxX
            previousCellMaxX = rectangle.max.x + padding
            result.push(rectangle)
            
        }
        
        return result
        
    }
    
    rectanglesBySplittingHeight(
        weights: SizeNumberOrFunctionOrView[],
        paddings: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 0,
        absoluteHeights: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = nil
    ) {
        
        if (IS_NIL(paddings)) {
            paddings = 1
        }
        if (!((paddings as any) instanceof Array)) {
            paddings = [paddings].arrayByRepeating(weights.length - 1)
        }
        paddings = (paddings as number[]).arrayByTrimmingToLengthIfLonger(weights.length - 1)
        paddings = paddings.map(padding => this._heightNumberFromSizeNumberOrFunctionOrView(padding))
        if (!(absoluteHeights instanceof Array) && IS_NOT_NIL(absoluteHeights)) {
            absoluteHeights = [absoluteHeights].arrayByRepeating(weights.length)
        }
        absoluteHeights = absoluteHeights.map(
            height => this._heightNumberFromSizeNumberOrFunctionOrView(height)
        )
        
        weights = weights.map(weight => this._heightNumberFromSizeNumberOrFunctionOrView(weight))
        const result: UIRectangle[] = []
        const sumOfWeights = (weights as number[]).reduce(
            (a, b, index) => {
                if (IS_NOT_NIL((absoluteHeights as number[])[index])) {
                    b = 0
                }
                return a + b
            },
            0
        )
        const sumOfPaddings = paddings.summedValue as number
        const sumOfAbsoluteHeights = (absoluteHeights as number[]).summedValue
        const totalRelativeHeight = this.height - sumOfPaddings - sumOfAbsoluteHeights
        let previousCellMaxY = this.y
        
        for (let i = 0; i < weights.length; i++) {
            let resultHeight: number
            if (IS_NOT_NIL(absoluteHeights[i])) {
                
                resultHeight = (absoluteHeights[i] || 0) as number
                
            }
            else {
                
                resultHeight = totalRelativeHeight * (weights[i] as number / sumOfWeights)
                
            }
            
            const rectangle = this.rectangleWithHeight(resultHeight)
            
            let padding = 0
            if (paddings.length > i && paddings[i]) {
                padding = paddings[i] as number
            }
            
            rectangle.y = previousCellMaxY
            previousCellMaxY = rectangle.max.y + padding
            //rectangle = rectangle.rectangleWithInsets(0, 0, padding, 0);
            result.push(rectangle)
        }
        
        return result
        
    }
    
    
    rectanglesByEquallySplittingWidth(numberOfFrames: number, padding: number = 0) {
        const result: UIRectangle[] = []
        const totalPadding = padding * (numberOfFrames - 1)
        const resultWidth = (this.width - totalPadding) / numberOfFrames
        for (var i = 0; i < numberOfFrames; i++) {
            const rectangle = this.rectangleWithWidth(resultWidth, i / (numberOfFrames - 1))
            result.push(rectangle)
        }
        return result
    }
    
    rectanglesByEquallySplittingHeight(numberOfFrames: number, padding: number = 0) {
        const result: UIRectangle[] = []
        const totalPadding = padding * (numberOfFrames - 1)
        const resultHeight = (this.height - totalPadding) / numberOfFrames
        for (var i = 0; i < numberOfFrames; i++) {
            const rectangle = this.rectangleWithHeight(resultHeight, i / (numberOfFrames - 1))
            result.push(rectangle)
        }
        return result
    }
    
    
    distributeViewsAlongWidth(
        views: UIView[],
        weights: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 1,
        paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
        absoluteWidths?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
    ) {
        if (!(weights instanceof Array)) {
            weights = [weights].arrayByRepeating(views.length)
        }
        const frames = this.rectanglesBySplittingWidth(weights, paddings, absoluteWidths)
        frames.forEach((frame, index) => FIRST_OR_NIL(views[index]).frame = frame)
        return this
    }
    
    distributeViewsAlongHeight(
        views: UIView[],
        weights: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 1,
        paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
        absoluteHeights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
    ) {
        if (!(weights instanceof Array)) {
            weights = [weights].arrayByRepeating(views.length)
        }
        const frames = this.rectanglesBySplittingHeight(weights, paddings, absoluteHeights)
        frames.forEach((frame, index) => FIRST_OR_NIL(views[index]).frame = frame)
        return this
    }
    
    
    distributeViewsEquallyAlongWidth(views: UIView[], padding: number) {
        const frames = this.rectanglesByEquallySplittingWidth(views.length, padding)
        frames.forEach((frame, index) => views[index].frame = frame)
        return this
    }
    
    distributeViewsEquallyAlongHeight(views: UIView[], padding: number) {
        const frames = this.rectanglesByEquallySplittingHeight(views.length, padding)
        frames.forEach((frame, index) => views[index].frame = frame)
        return this
    }
    
    
    _heightNumberFromSizeNumberOrFunctionOrView(height: SizeNumberOrFunctionOrView) {
        if (height instanceof Function) {
            return height(this.width)
        }
        if (height instanceof UIView) {
            return height.intrinsicContentHeight(this.width)
        }
        return height
    }
    
    _widthNumberFromSizeNumberOrFunctionOrView(width: SizeNumberOrFunctionOrView) {
        if (width instanceof Function) {
            return width(this.height)
        }
        if (width instanceof UIView) {
            return width.intrinsicContentWidth(this.height)
        }
        return width
    }
    
    rectangleForNextRow(padding: number = 0, height: SizeNumberOrFunctionOrView = this.height) {
        const heightNumber = this._heightNumberFromSizeNumberOrFunctionOrView(height)
        const result = this.rectangleWithY(this.max.y + padding)
        if (heightNumber != this.height) {
            result.height = heightNumber
        }
        return result
    }
    
    rectangleForNextColumn(padding: number = 0, width: SizeNumberOrFunctionOrView = this.width) {
        const widthNumber = this._widthNumberFromSizeNumberOrFunctionOrView(width)
        const result = this.rectangleWithX(this.max.x + padding)
        if (widthNumber != this.width) {
            result.width = widthNumber
        }
        return result
    }
    
    rectangleForPreviousRow(padding: number = 0, height: SizeNumberOrFunctionOrView = this.height) {
        const heightNumber = this._heightNumberFromSizeNumberOrFunctionOrView(height)
        const result = this.rectangleWithY(this.min.y - heightNumber - padding)
        if (heightNumber != this.height) {
            result.height = heightNumber
        }
        return result
    }
    
    rectangleForPreviousColumn(padding: number = 0, width: SizeNumberOrFunctionOrView = this.width) {
        const widthNumber = this._widthNumberFromSizeNumberOrFunctionOrView(width)
        const result = this.rectangleWithX(this.min.x - widthNumber - padding)
        if (widthNumber != this.width) {
            result.width = widthNumber
        }
        return result
        
    }
    
    /**
     * Distributes views vertically as a column, assigning frames and returning them.
     * Each view is positioned below the previous one with optional padding between them.
     * @param views - Array of views to distribute
     * @param paddings - Padding between views (single value or array of values)
     * @param absoluteHeights - Optional fixed heights for views (overrides intrinsic height)
     * @returns Array of rectangles representing the frame for each view
     */
    framesByDistributingViewsAsColumn(
        views: UIView[],
        paddings: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 0,
        absoluteHeights: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = nil
    ) {
        const frames: UIRectangle[] = []
        let currentRectangle = this.copy()
        
        if (!(paddings instanceof Array)) {
            paddings = [paddings].arrayByRepeating(views.length - 1)
        }
        paddings = paddings.map(padding => this._heightNumberFromSizeNumberOrFunctionOrView(padding))
        
        if (!(absoluteHeights instanceof Array) && IS_NOT_NIL(absoluteHeights)) {
            absoluteHeights = [absoluteHeights].arrayByRepeating(views.length)
        }
        absoluteHeights = absoluteHeights.map(
            height => this._heightNumberFromSizeNumberOrFunctionOrView(height)
        )
        
        for (let i = 0; i < views.length; i++) {
            const frame = currentRectangle.rectangleWithIntrinsicContentHeightForView(views[i])
            
            if (IS_NOT_NIL(absoluteHeights[i])) {
                frame.height = absoluteHeights[i] as number
            }
            
            views[i].frame = frame
            frames.push(frame)
            
            const padding = (paddings[i] || 0) as number
            currentRectangle = frame.rectangleForNextRow(padding)
        }
        
        return frames
    }
    
    /**
     * Distributes views horizontally as a row, assigning frames and returning them.
     * Each view is positioned to the right of the previous one with optional padding between them.
     * @param views - Array of views to distribute
     * @param paddings - Padding between views (single value or array of values)
     * @param absoluteWidths - Optional fixed widths for views (overrides intrinsic width)
     * @returns Array of rectangles representing the frame for each view
     */
    framesByDistributingViewsAsRow(
        views: UIView[],
        paddings: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 0,
        absoluteWidths: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = nil
    ) {
        const frames: UIRectangle[] = []
        let currentRectangle = this.copy()
        
        if (!(paddings instanceof Array)) {
            paddings = [paddings].arrayByRepeating(views.length - 1)
        }
        paddings = paddings.map(padding => this._widthNumberFromSizeNumberOrFunctionOrView(padding))
        
        if (!(absoluteWidths instanceof Array) && IS_NOT_NIL(absoluteWidths)) {
            absoluteWidths = [absoluteWidths].arrayByRepeating(views.length)
        }
        absoluteWidths = absoluteWidths.map(
            width => this._widthNumberFromSizeNumberOrFunctionOrView(width)
        )
        
        for (let i = 0; i < views.length; i++) {
            const frame = currentRectangle.rectangleWithIntrinsicContentWidthForView(views[i])
            
            if (IS_NOT_NIL(absoluteWidths[i])) {
                frame.width = absoluteWidths[i] as number
            }
            
            views[i].frame = frame
            frames.push(frame)
            
            const padding = (paddings[i] || 0) as number
            currentRectangle = frame.rectangleForNextColumn(padding)
        }
        
        return frames
    }
    
    /**
     * Distributes views as a grid (2D array), assigning frames and returning them.
     * The first index represents rows (vertical), the second index represents columns (horizontal).
     * Example: views[0] is the first row, views[0][0] is the first column in the first row.
     * Each row is laid out horizontally, and rows are stacked vertically.
     * @param views - 2D array where views[row][column] represents the grid structure
     * @param paddings - Vertical padding between rows (single value or array of values)
     * @param absoluteHeights - Optional fixed heights for each row (overrides intrinsic height)
     * @returns 2D array of rectangles where frames[row][column] matches views[row][column]
     */
    framesByDistributingViewsAsGrid(
        views: UIView[][],
        paddings: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = 0,
        absoluteHeights: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[] = nil
    ) {
        const frames: UIRectangle[][] = []
        let currentRowRectangle = this.copy()
        
        if (!(paddings instanceof Array)) {
            paddings = [paddings].arrayByRepeating(views.length - 1)
        }
        paddings = paddings.map(padding => this._heightNumberFromSizeNumberOrFunctionOrView(padding))
        
        if (!(absoluteHeights instanceof Array) && IS_NOT_NIL(absoluteHeights)) {
            absoluteHeights = [absoluteHeights].arrayByRepeating(views.length)
        }
        absoluteHeights = absoluteHeights.map(
            height => this._heightNumberFromSizeNumberOrFunctionOrView(height)
        )
        
        for (let i = 0; i < views.length; i++) {
            const rowViews = views[i]
            const rowFrames = currentRowRectangle.framesByDistributingViewsAsRow(rowViews)
            
            if (IS_NOT_NIL(absoluteHeights[i])) {
                const heightNumber = absoluteHeights[i] as number
                rowFrames.forEach((frame, j) => {
                    frame.height = heightNumber
                    rowViews[j].frame = frame
                })
            }
            
            frames.push(rowFrames)
            
            const padding = (paddings[i] || 0) as number
            const maxHeight = Math.max(...rowFrames.map(f => f.height))
            currentRowRectangle = currentRowRectangle.rectangleForNextRow(padding, maxHeight)
        }
        
        return frames
    }
    
    rectangleWithIntrinsicContentSizeForView(view: UIView, centeredOnXPosition = 0, centeredOnYPosition = 0) {
        const intrinsicContentSize = view.intrinsicContentSize()
        return this.rectangleWithHeight(intrinsicContentSize.height, centeredOnYPosition)
            .rectangleWithWidth(intrinsicContentSize.width, centeredOnXPosition)
    }
    
    rectangleWithIntrinsicContentHeightForView(view: UIView, centeredOnPosition = 0) {
        return this.rectangleWithHeight(view.intrinsicContentHeight(this.width), centeredOnPosition)
    }
    
    rectangleWithIntrinsicContentWidthForView(view: UIView, centeredOnPosition = 0) {
        return this.rectangleWithWidth(view.intrinsicContentWidth(this.height), centeredOnPosition)
    }
    
    settingMinHeight(minHeight?: number) {
        this.minHeight = minHeight
        return this
    }
    
    settingMinWidth(minWidth?: number) {
        this.minWidth = minWidth
        return this
    }
    
    settingMaxHeight(maxHeight?: number) {
        this.maxHeight = maxHeight
        return this
    }
    
    settingMaxWidth(maxWidth?: number) {
        this.maxWidth = maxWidth
        return this
    }
    
    rectangleByEnforcingMinAndMaxSizes(centeredOnXPosition = 0, centeredOnYPosition = 0) {
        return this.rectangleWithHeight(
            [
                [this.height, this.maxHeight].filter(value => IS_NOT_LIKE_NULL(value)).min(),
                this.minHeight
            ].filter(value => IS_NOT_LIKE_NULL(value)).max(),
            centeredOnYPosition
        ).rectangleWithWidth(
            [
                [this.width, this.maxWidth].filter(value => IS_NOT_LIKE_NULL(value)).min(),
                this.minWidth
            ].filter(value => IS_NOT_LIKE_NULL(value)).max(),
            centeredOnXPosition
        )
    }
    
    
    assignedAsFrameOfView(view: UIView) {
        view.frame = this
        return this
    }
    
    
    override toString() {
        
        const result = "[" + this.class.name + "] { x: " + this.x + ", y: " + this.y + ", " +
            "height: " + this.height.toFixed(2) + ", width: " + this.height.toFixed(2) + " }"
        
        return result
        
    }
    
    get [Symbol.toStringTag]() {
        return this.toString()
    }
    
    
    // Bounding box
    static boundingBoxForPoints(points: UIPoint[]) {
        const result = new UIRectangle()
        for (let i = 0; i < points.length; i++) {
            result.updateByAddingPoint(points[i])
        }
        return result
    }
    
    static boundingBoxForRectanglesAndPoints(rectanglesAndPoints: (UIPoint | UIRectangle)[]) {
        const result = new UIRectangle()
        for (let i = 0; i < rectanglesAndPoints.length; i++) {
            const rectangleOrPoint = rectanglesAndPoints[i]
            if (rectangleOrPoint instanceof UIRectangle) {
                result.updateByAddingPoint(rectangleOrPoint.min)
                result.updateByAddingPoint(rectangleOrPoint.max)
            }
            else {
                result.updateByAddingPoint(rectangleOrPoint)
            }
        }
        return result
    }
    
    
    beginUpdates() {
        this._isBeingUpdated = YES
    }
    
    finishUpdates() {
        this._isBeingUpdated = NO
        this.didChange()
    }
    
    
    didChange() {
        
        // Callback to be set by delegate
        
    }
    
    _rectanglePointDidChange() {
        if (!this._isBeingUpdated) {
            this.didChange()
        }
    }
    
    
}























