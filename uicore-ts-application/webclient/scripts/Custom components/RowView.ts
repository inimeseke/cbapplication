import { IF, IS, IS_LIKE_NULL, IS_NOT, IS_NOT_NIL, nil, UIRectangle, UIView } from "uicore-ts"


export class RowView<CellType extends UIView = UIView> extends UIView {
    
    _previousLayoutBounds?: UIRectangle
    _cells: CellType[]
    _cellWeights: number[]
    
    padding = 0
    _cellWidths: number[] = []
    _rowHeight = 50
    
    
    constructor(elementID?: string, cells: CellType[] = [], cellWidths: number[] = []) {
        
        super(elementID)
        
        this._cells = cells
        this._cellWeights = cellWidths
        
    }
    
    
    get cells() {
        return this._cells
    }
    
    
    set cells(cells: CellType[]) {
        
        const previousCells = this.cells
        const cellWeights = this.cellWeights.copy()
        
        
        // The cells are added to this._cells in this.addCell()
        
        previousCells.copy().forEach((cell: CellType, index: number) => {
            
            if (!cells.contains(cell)) {
                
                cell.removeFromSuperview()
                this._cells.removeElement(cell)
                
                cellWeights[index] = nil
                
            }
            
        })
        
        this.cellWeights = cellWeights.filter((cellWeight) => IS_NOT_NIL(cellWeight))
        
        cells.copy().forEach((cell: CellType, index: number) => {
            if (!IS(cell.superview)) {
                this.addCell(cell, 1, index)
            }
        })
        
        this._previousLayoutBounds = nil
        this.setNeedsLayout()
        
    }
    
    
    removeCellAtIndex(index: number) {
        const remainingCells = this.cells.copy()
        remainingCells.removeElementAtIndex(index)
        this.cellWeights.removeElementAtIndex(index)
        this.cells = remainingCells
    }
    
    removeFirstCell() {
        this.removeCellAtIndex(0)
    }
    
    removeLastCell() {
        this.removeCellAtIndex(this.cells.length - 1)
    }
    
    
    addCell(cell: CellType, weight: number = 1, index = this.cells.length) {
        
        if (this.cells.contains(cell) && IS_NOT_NIL(cell)) {
            return
        }
        
        this.cells.insertElementAtIndex(index, cell)
        this.cellWeights.insertElementAtIndex(index, weight)
        this.addSubview(cell)
        this.setNeedsLayout()
        
    }
    
    
    get cellWeights() {
        return this._cellWeights
    }
    
    set cellWeights(widths: number[]) {
        this._cellWeights = widths
        this.layoutParametersDidChange()
    }
    
    layoutParametersDidChange() {
        this._previousLayoutBounds = nil
        this.setNeedsLayout()
    }
    
    get cellWidths() {
        return this._cellWidths
    }
    
    set cellWidths(widths: number[]) {
        this._cellWidths = widths
        this.layoutParametersDidChange()
    }
    
    
    override get frame(): UIRectangle & { zIndex?: number } {
        return super.frame
    }
    
    override set frame(frame: UIRectangle & { zIndex?: number }) {
        super.frame = frame
        this.cellWidths = []
    }
    
    
    get rowHeight() {
        if (IS_LIKE_NULL(this._rowHeight)) {
            this._rowHeight = this.cells.map(cell => cell.intrinsicContentHeight(this.bounds.width)).max()
        }
        return this._rowHeight
    }
    
    
    override layoutSubviews() {
        
        const bounds = this.bounds
        
        if (bounds.isEqualTo(this._previousLayoutBounds)) {
            return
        }
        
        super.layoutSubviews()
        
        this._previousLayoutBounds = bounds
        
        if (this.cellWidths.length < this.cells.length && this.cells.length) {
            
            this.cellWidths = [
                (bounds.width - this.padding * (this.cells.length - 1)) / this.cells.length
            ].arrayByRepeating(this.cells.length)
            
        }
        
        bounds.rectangleWithHeight(this.rowHeight)
            .distributeViewsAlongWidth(this.cells, this.cellWeights, this.padding, this._cellWidths)
        
        // this.forEachViewInSubtree((view: UIView) => {
        //
        //     // @ts-ignore
        //     const resizeObserver: ResizeObserver = view._resizeObserver
        //     resizeObserver?.disconnect()
        //
        //     // @ts-ignore
        //     view._resizeObserver = nil
        //
        // })
        
        // const widthFrames = bounds.rectangleWithHeight(this.rowHeight)
        //     .rectanglesBySplittingWidth(this._cellWeights, this.padding, this._cellWidths)
        //
        // this._cells.forEach((view, index, array) => {
        //
        //     var widthFrame = widthFrames[index]
        //
        //     const bounds = view.superview?.bounds ?? new UIRectangle(0, 0, 0, 0)
        //     const relativeXPosition = widthFrame.x / bounds.width
        //     const widthMultiplier = widthFrame.width / bounds.width
        //
        //     const relativeYPosition = widthFrame.y / bounds.height
        //     const heightMultiplier = widthFrame.height / bounds.height
        //
        //     //view._frame = nil
        //
        //     view.style.height = "" + (heightMultiplier * 100) + "%"
        //     view.style.width = "" + (widthMultiplier * 100) + "%"
        //     view.style.left = "" + (relativeXPosition * 100) + "%"
        //     view.style.top = "" + (relativeYPosition * 100) + "%"
        //
        // })
        
        
        
        
    }
    
    
}



























