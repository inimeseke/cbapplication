import { UIButton } from "./UIButton"
import { UINativeScrollView } from "./UINativeScrollView"
import { FIRST_OR_NIL, IS, IS_DEFINED, nil, NO, YES } from "./UIObject"
import { UIPoint } from "./UIPoint"
import { UIRectangle } from "./UIRectangle"
import { UIView, UIViewBroadcastEvent } from "./UIView"


interface UITableViewRowView extends UIView {
    
    _UITableViewRowIndex?: number;
    
}


export interface UITableViewReusableViewsContainerObject {
    
    [key: string]: UIView[];
    
}


export interface UITableViewReusableViewPositionObject {
    
    bottomY: number;
    topY: number;
    
    isValid: boolean;
    
}


export class UITableView extends UINativeScrollView {
    
    
    allRowsHaveEqualHeight: boolean = NO
    _visibleRows: UITableViewRowView[] = []
    _firstLayoutVisibleRows: UITableViewRowView[] = []
    
    _rowPositions: UITableViewReusableViewPositionObject[] = []
    
    _highestValidRowPositionIndex: number = 0
    
    _reusableViews: UITableViewReusableViewsContainerObject = {}
    _removedReusableViews: UITableViewReusableViewsContainerObject = {}
    
    _fullHeightView: UIView
    _rowIDIndex: number = 0
    reloadsOnLanguageChange = YES
    sidePadding = 0

    cellWeights?: number[]
    
    _persistedData: any[] = []
    _needsDrawingOfVisibleRowsBeforeLayout = NO
    _isDrawVisibleRowsScheduled = NO
    _shouldAnimateNextLayout?: boolean
    
    override animationDuration = 0.25
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this._fullHeightView = new UIView()
        this._fullHeightView.hidden = YES
        this._fullHeightView.userInteractionEnabled = NO
        this.addSubview(this._fullHeightView)
        
        this.scrollsX = NO
        
    }
    
    
    loadData() {
        
        this._persistedData = []
        
        this._calculatePositionsUntilIndex(this.numberOfRows() - 1)
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        
        this.setNeedsLayout()
        
    }
    
    reloadData() {
        
        this._removeVisibleRows()
        this._removeAllReusableRows()
        
        this._rowPositions = []
        this._highestValidRowPositionIndex = 0
        
        this.loadData()
        
    }
    
    
    highlightChanges(previousData: any[], newData: any[]) {
    
        previousData = previousData.map(dataPoint => JSON.stringify(dataPoint))
        newData = newData.map(dataPoint => JSON.stringify(dataPoint))
    
        const newIndexes: number[] = []
    
        newData.forEach((value, index) => {
        
            if (!previousData.contains(value)) {
            
                newIndexes.push(index)
            
            }
        
        })
    
        newIndexes.forEach(index => {
        
            if (this.isRowWithIndexVisible(index)) {
                this.highlightRowAsNew(this.visibleRowWithIndex(index) as UIView)
            }
        
        })
        
    }
    
    
    highlightRowAsNew(row: UIView) {
        
        
    }
    
    
    invalidateSizeOfRowWithIndex(index: number, animateChange = NO) {
        
        if (this._rowPositions[index]) {
            this._rowPositions[index].isValid = NO
        }
        
        this._highestValidRowPositionIndex = Math.min(this._highestValidRowPositionIndex, index - 1)
        
        // if (index == 0) {
        
        //     this._highestValidRowPositionIndex = 0;
        
        //     this._rowPositions = [];
        
        // }
        
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        
        this._shouldAnimateNextLayout = animateChange
        
    }
    
    
    _calculateAllPositions() {
        this._calculatePositionsUntilIndex(this.numberOfRows() - 1)
    }
    
    _calculatePositionsUntilIndex(maxIndex: number) {
        
        var validPositionObject = this._rowPositions[this._highestValidRowPositionIndex]
        if (!IS(validPositionObject)) {
            validPositionObject = {
                bottomY: 0,
                topY: 0,
                isValid: YES
            }
        }
        
        var previousBottomY = validPositionObject.bottomY
        
        if (!this._rowPositions.length) {
            
            this._highestValidRowPositionIndex = -1
            
        }
        
        for (var i = this._highestValidRowPositionIndex + 1; i <= maxIndex; i++) {
            
            var height: number
            
            const rowPositionObject = this._rowPositions[i]
            
            if (IS((rowPositionObject || nil).isValid)) {
                
                height = rowPositionObject.bottomY - rowPositionObject.topY
                
            }
            else {
                
                height = this.heightForRowWithIndex(i)
                
            }
            
            
            const positionObject: UITableViewReusableViewPositionObject = {
                bottomY: previousBottomY + height,
                topY: previousBottomY,
                isValid: YES
            }
            
            if (i < this._rowPositions.length) {
                this._rowPositions[i] = positionObject
            }
            else {
                this._rowPositions.push(positionObject)
            }
            this._highestValidRowPositionIndex = i
            previousBottomY = previousBottomY + height
            
        }
        
    }
    
    
    indexesForVisibleRows(paddingRatio = 0.5): number[] {
        
        const firstVisibleY = this.contentOffset.y - this.bounds.height * paddingRatio
        const lastVisibleY = firstVisibleY + this.bounds.height * (1 + paddingRatio)
        
        const numberOfRows = this.numberOfRows()
        
        if (this.allRowsHaveEqualHeight) {
            
            const rowHeight = this.heightForRowWithIndex(0)
            
            var firstIndex = firstVisibleY / rowHeight
            var lastIndex = lastVisibleY / rowHeight
            
            firstIndex = Math.trunc(firstIndex)
            lastIndex = Math.trunc(lastIndex) + 1
            
            firstIndex = Math.max(firstIndex, 0)
            lastIndex = Math.min(lastIndex, numberOfRows - 1)
            
            var result = []
            for (var i = firstIndex; i < lastIndex + 1; i++) {
                result.push(i)
            }
            return result
        }
        
        var accumulatedHeight = 0
        var result = []
        
        this._calculateAllPositions()
        
        const rowPositions = this._rowPositions
        
        for (var i = 0; i < numberOfRows; i++) {
            
            const height = rowPositions[i].bottomY - rowPositions[i].topY  // this.heightForRowWithIndex(i)
            
            accumulatedHeight = accumulatedHeight + height
            if (accumulatedHeight >= firstVisibleY) {
                result.push(i)
            }
            if (accumulatedHeight >= lastVisibleY) {
                break
            }
            
        }
        
        return result
        
    }
    
    
    _removeVisibleRows() {
    
        const visibleRows: UITableViewRowView[] = []
        this._visibleRows.forEach((row: UIView) => {
        
            this._persistedData[row._UITableViewRowIndex as number] = this.persistenceDataItemForRowWithIndex(
                row._UITableViewRowIndex as number,
                row
            )
            row.removeFromSuperview()
            this._removedReusableViews[row?._UITableViewReusabilityIdentifier]?.push(row)
        
        
        })
        this._visibleRows = visibleRows
        
    }
    
    
    _removeAllReusableRows() {
        this._reusableViews.forEach((rows: UIView[]) =>
            rows.forEach((row: UIView) => {
            
                this._persistedData[row._UITableViewRowIndex as number] = this.persistenceDataItemForRowWithIndex(
                    row._UITableViewRowIndex as number,
                    row
                )
                row.removeFromSuperview()
            
                this._markReusableViewAsUnused(row)
            
            })
        )
    }
    
    
    _markReusableViewAsUnused(row: UIView) {
        if (!this._removedReusableViews[row._UITableViewReusabilityIdentifier].contains(row)) {
            this._removedReusableViews[row._UITableViewReusabilityIdentifier].push(row)
        }
    }
    
    _drawVisibleRows() {
        
        if (!this.isMemberOfViewTree) {
            return
        }
    
        const visibleIndexes = this.indexesForVisibleRows()
        
        const minIndex = visibleIndexes[0]
        const maxIndex = visibleIndexes[visibleIndexes.length - 1]
    
        const removedViews: UITableViewRowView[] = []
        
        const visibleRows: UITableViewRowView[] = []
        this._visibleRows.forEach((row) => {
            if (IS_DEFINED(row._UITableViewRowIndex) && (row._UITableViewRowIndex < minIndex || row._UITableViewRowIndex > maxIndex)) {
            
                //row.removeFromSuperview();
            
                this._persistedData[row._UITableViewRowIndex] = this.persistenceDataItemForRowWithIndex(
                    row._UITableViewRowIndex,
                    row
                )
            
                this._removedReusableViews[row._UITableViewReusabilityIdentifier].push(row)
            
                removedViews.push(row)
            
            }
            else {
                visibleRows.push(row)
            }
        })
        this._visibleRows = visibleRows
    
        visibleIndexes.forEach((rowIndex: number) => {
        
            if (this.isRowWithIndexVisible(rowIndex)) {
                return
            }
            const view: UITableViewRowView = this.viewForRowWithIndex(rowIndex)
            //view._UITableViewRowIndex = rowIndex;
            this._firstLayoutVisibleRows.push(view)
            this._visibleRows.push(view)
            this.addSubview(view)
        
        })
    
        for (let i = 0; i < removedViews.length; i++) {
        
            const view = removedViews[i]
            if (this._visibleRows.indexOf(view) == -1) {
            
                //this._persistedData[view._UITableViewRowIndex] = this.persistenceDataItemForRowWithIndex(view._UITableViewRowIndex, view);
                view.removeFromSuperview()
            
                //this._removedReusableViews[view._UITableViewReusabilityIdentifier].push(view);
            
            }
            
        }
        
        //this.setNeedsLayout();
        
    }
    
    
    visibleRowWithIndex(rowIndex: number | undefined): UIView {
        for (var i = 0; i < this._visibleRows.length; i++) {
            const row = this._visibleRows[i]
            if (row._UITableViewRowIndex == rowIndex) {
                return row
            }
        }
        return nil
    }
    
    
    isRowWithIndexVisible(rowIndex: number) {
        return IS(this.visibleRowWithIndex(rowIndex))
    }
    
    
    reusableViewForIdentifier(identifier: string, rowIndex: number): UITableViewRowView {
        
        if (!this._removedReusableViews[identifier]) {
            this._removedReusableViews[identifier] = []
        }
        
        if (this._removedReusableViews[identifier] && this._removedReusableViews[identifier].length) {
            
            const view = this._removedReusableViews[identifier].pop() as UITableViewRowView
            view._UITableViewRowIndex = rowIndex
            Object.assign(view, this._persistedData[rowIndex] || this.defaultRowPersistenceDataItem())
            return view
            
        }
        
        if (!this._reusableViews[identifier]) {
            this._reusableViews[identifier] = []
        }
        
        const newView = this.newReusableViewForIdentifier(identifier, this._rowIDIndex) as UITableViewRowView
        this._rowIDIndex = this._rowIDIndex + 1
        
        newView._UITableViewReusabilityIdentifier = identifier
        newView._UITableViewRowIndex = rowIndex
        
        Object.assign(newView, this._persistedData[rowIndex] || this.defaultRowPersistenceDataItem())
        this._reusableViews[identifier].push(newView)
        
        return newView
        
    }
    
    
    // Functions that should be overridden to draw the correct content START
    newReusableViewForIdentifier(identifier: string, rowIDIndex: number): UIView {
        
        const view = new UIButton(this.elementID + "Row" + rowIDIndex)
        
        view.stopsPointerEventPropagation = NO
        view.pausesPointerEvents = NO
        
        return view
        
    }
    
    heightForRowWithIndex(index: number): number {
        return 50
    }
    
    numberOfRows() {
        return 10000
    }
    
    defaultRowPersistenceDataItem(): any {
        
        
    }
    
    persistenceDataItemForRowWithIndex(rowIndex: number, row: UIView): any {
        
        
    }
    
    viewForRowWithIndex(rowIndex: number): UITableViewRowView {
        const row = this.reusableViewForIdentifier("Row", rowIndex);
        row._UITableViewRowIndex = rowIndex
        FIRST_OR_NIL((row as unknown as UIButton).titleLabel).text = "Row " + rowIndex
        return row
    }
    
    // Functions that should be overridden to draw the correct content END
    
    
    // Functions that trigger redrawing of the content
    override didScrollToPosition(offsetPosition: UIPoint) {
        
        super.didScrollToPosition(offsetPosition)
        
        this.forEachViewInSubtree(function (view: UIView) {
            
            view._isPointerValid = NO
            
        })
        
        if (!this._isDrawVisibleRowsScheduled) {
            
            this._isDrawVisibleRowsScheduled = YES
            
            UIView.runFunctionBeforeNextFrame(function (this: UITableView) {
                
                this._calculateAllPositions()
                
                this._drawVisibleRows()
                
                this.setNeedsLayout()
                
                this._isDrawVisibleRowsScheduled = NO
                
            }.bind(this))
            
        }
        
    }
    
    override wasAddedToViewTree() {
        this.loadData()
    }
    
    override setFrame(rectangle: UIRectangle, zIndex?: number, performUncheckedLayout?: boolean) {
        
        const frame = this.frame
        super.setFrame(rectangle, zIndex, performUncheckedLayout)
        if (frame.isEqualTo(rectangle) && !performUncheckedLayout) {
            return
        }
        
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.LanguageChanged && this.reloadsOnLanguageChange) {
            
            this.reloadData()
            
        }
        
        
    }
    
    
    private _layoutAllRows(positions = this._rowPositions) {
        
        const bounds = this.bounds
    
        this._visibleRows.forEach(row => {
        
            const frame = bounds.copy()
        
            const positionObject = positions[row._UITableViewRowIndex!]
            frame.min.y = positionObject.topY
            frame.max.y = positionObject.bottomY
            row.frame = frame
        
            row.style.width = "" + (bounds.width - this.sidePadding * 2).integerValue + "px"
            row.style.left = "" + this.sidePadding.integerValue + "px"
        
        
        })
        
        this._fullHeightView.frame = bounds.rectangleWithHeight((positions.lastElement ||
            nil).bottomY).rectangleWithWidth(bounds.width * 0.5)
        
        this._firstLayoutVisibleRows = []
        
    }
    
    private _animateLayoutAllRows() {
        
        UIView.animateViewOrViewsWithDurationDelayAndFunction(
            this._visibleRows,
            this.animationDuration,
            0,
            undefined,
            function (this: UITableView) {
                
                this._layoutAllRows()
                
            }.bind(this),
            function (this: UITableView) {
                
                // this._calculateAllPositions()
                // this._layoutAllRows()
                
            }.bind(this)
        )
        
    }
    
    
    override layoutSubviews() {
        
        const previousPositions: UITableViewReusableViewPositionObject[] = JSON.parse(JSON.stringify(this._rowPositions))
        
        const previousVisibleRowsLength = this._visibleRows.length
        
        if (this._needsDrawingOfVisibleRowsBeforeLayout) {
            
            //this._calculateAllPositions()
            
            this._drawVisibleRows()
            
            this._needsDrawingOfVisibleRowsBeforeLayout = NO
            
        }
        
        
        super.layoutSubviews()
        
        
        if (!this.numberOfRows() || !this.isMemberOfViewTree) {
            
            return
            
        }
        
        
        if (this._shouldAnimateNextLayout) {
            
            
            // Need to do layout with the previous positions
            
            this._layoutAllRows(previousPositions)
            
            
            if (previousVisibleRowsLength < this._visibleRows.length) {
                
                
                UIView.runFunctionBeforeNextFrame(function (this: UITableView) {
                    
                    this._animateLayoutAllRows()
                    
                }.bind(this))
                
            }
            else {
                
                this._animateLayoutAllRows()
                
            }
            
            
            this._shouldAnimateNextLayout = NO
            
        }
        else {
            
            // if (this._needsDrawingOfVisibleRowsBeforeLayout) {
            
            //     this._drawVisibleRows();
            
            //     this._needsDrawingOfVisibleRowsBeforeLayout = NO;
            
            // }
            
            this._calculateAllPositions()
            
            this._layoutAllRows()
            
            
        }
        
        
    }
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        
        var result = 0
        
        this._calculateAllPositions()
        
        if (this._rowPositions.length) {
            
            result = this._rowPositions[this._rowPositions.length - 1].bottomY
            
        }
        
        return result
        
    }
    
    
}
































