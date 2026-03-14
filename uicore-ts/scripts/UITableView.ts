import { UIButton } from "./UIButton"
import { UINativeScrollView } from "./UINativeScrollView"
import { FIRST_OR_NIL, IF, IS, IS_DEFINED, MAKE_ID, nil, NO, YES } from "./UIObject"
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
    
    /** Shared intrinsic size cache identifier used for all row views when
     *  allRowsHaveEqualHeight is YES.  Stable for the lifetime of the table;
     *  the shared cache bucket is invalidated on reloadData and
     *  clearIntrinsicSizeCache so the height is re-measured after data changes. */
    _equalRowHeightCacheIdentifier: string
    
    _rowPositions: UITableViewReusableViewPositionObject[] = []
    
    _highestValidRowPositionIndex: number = 0
    
    _unusedReusableViews: UITableViewReusableViewsContainerObject = {}
    
    _fullHeightView: UIView
    _rowIDIndex: number = 0
    reloadsOnLanguageChange = YES
    sidePadding = 0
    
    cellWeights?: number[]
    
    _persistedData: any[] = []
    _needsDrawingOfVisibleRowsBeforeLayout = NO
    _isDrawVisibleRowsScheduled = NO
    _shouldAnimateNextLayout?: boolean
    
    override usesVirtualLayoutingForIntrinsicSizing = NO
    
    override animationDuration = 0.25
    
    // Viewport scrolling properties
    _intersectionObserver?: IntersectionObserver
    
    
    get _reusableViews(): UITableViewReusableViewsContainerObject {
        
        const result: UITableViewReusableViewsContainerObject = {}
        
        const addView = (view: UIView) => {
            const identifier = view._UITableViewReusabilityIdentifier
            if (!identifier) {
                return
            }
            if (!result[identifier]) {
                result[identifier] = []
            }
            result[identifier].push(view)
        }
        
        this._visibleRows.forEach(addView)
        
        this._unusedReusableViews.forEach((views: UIView[]) => views.forEach(addView))
        
        return result
        
    }
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this._equalRowHeightCacheIdentifier = (elementID ?? MAKE_ID()) + "_rowHeight"
        
        this._fullHeightView = new UIView()
        this._fullHeightView.hidden = YES
        this._fullHeightView.userInteractionEnabled = NO
        this.addSubview(this._fullHeightView)
        
        this.scrollsX = NO
        
        this._setupViewportScrollAndResizeHandlersIfNeeded()
        
    }
    
    
    _windowScrollHandler = () => {
        if (!this.isMemberOfViewTree) {
            return
        }
        this._scheduleDrawVisibleRows()
    }
    
    _resizeHandler = () => {
        if (!this.isMemberOfViewTree) {
            return
        }
        // Invalidate all row positions on resize as widths may have changed
        this._rowPositions.everyElement.isValid = NO
        this._highestValidRowPositionIndex = -1
        this._scheduleDrawVisibleRows()
    }
    
    _setupViewportScrollAndResizeHandlersIfNeeded() {
        if (this._intersectionObserver) {
            return
        }
        
        window.addEventListener("scroll", this._windowScrollHandler, { passive: true })
        window.addEventListener("resize", this._resizeHandler, { passive: true })
        
        // Use IntersectionObserver to detect when table enters/exits viewport
        this._intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.isMemberOfViewTree) {
                        this._scheduleDrawVisibleRows()
                    }
                })
            },
            {
                root: null,
                rootMargin: "100% 0px", // Load rows 100% viewport height before/after
                threshold: 0
            }
        )
        this._intersectionObserver.observe(this.viewHTMLElement)
    }
    
    
    _cleanupViewportScrollListeners() {
        window.removeEventListener("scroll", this._windowScrollHandler)
        window.removeEventListener("resize", this._resizeHandler)
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect()
            this._intersectionObserver = undefined
        }
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
        this._highestValidRowPositionIndex = -1
        
        if (this.allRowsHaveEqualHeight) {
            UIView.invalidateSharedIntrinsicSizeCache(this._equalRowHeightCacheIdentifier)
        }
        
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
                this.highlightRowAsNew(
                    this.visibleRowWithIndex(index) ?? this.viewForRowWithIndex(index)
                )
            }
            
        })
        
    }
    
    
    highlightRowAsNew(row: UIView) {
    
    
    }
    
    
    invalidateSizeOfRowWithIndex(index: number, animateChange = NO) {
        if (this._rowPositions?.[index]) {
            FIRST_OR_NIL(this._rowPositions[index]).isValid = NO
            this._rowPositions.slice(index).everyElement.isValid = NO
        }
        this._highestValidRowPositionIndex = Math.min(this._highestValidRowPositionIndex, index - 1)
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        this._shouldAnimateNextLayout = animateChange
    }
    
    
    _rowPositionWithIndex(index: number, positions = this._rowPositions) {
        if (this.allRowsHaveEqualHeight && index > 0) {
            const firstPositionObject = positions[0]
            const rowHeight = firstPositionObject.bottomY - firstPositionObject.topY
            const result = {
                bottomY: rowHeight * (index + 1),
                topY: rowHeight * index,
                isValid: firstPositionObject.isValid
            }
            return result
        }
        return positions[index]
    }
    
    _calculateAllPositions() {
        this._calculatePositionsUntilIndex(this.numberOfRows() - 1)
    }
    
    _calculatePositionsUntilIndex(maxIndex: number) {
        
        if (this.allRowsHaveEqualHeight) {
            const positionObject: UITableViewReusableViewPositionObject = {
                bottomY: this._heightForAnyRow(),
                topY: 0,
                isValid: YES
            }
            this._rowPositions = [positionObject]
            return
        }
        
        let validPositionObject = this._rowPositions[this._highestValidRowPositionIndex]
        if (!IS(validPositionObject)) {
            validPositionObject = {
                bottomY: 0,
                topY: 0,
                isValid: YES
            }
        }
        
        let previousBottomY = validPositionObject.bottomY
        if (!this._rowPositions.length) {
            this._highestValidRowPositionIndex = -1
        }
        
        for (let i = this._highestValidRowPositionIndex + 1; i <= maxIndex; i++) {
            
            let height: number
            
            const rowPositionObject = this._rowPositions[i]
            
            if (IS((rowPositionObject || nil).isValid)) {
                height = rowPositionObject.bottomY - rowPositionObject.topY
            }
            // Do not calculate heights if all rows have equal heights, and we already have a height
            else if (this.allRowsHaveEqualHeight && i > 0) {
                height = this._rowPositions[0].bottomY - this._rowPositions[0].topY
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
    
    
    _heightForAnyRow(calculateVisibleRows = YES) {
        return this.heightForRowWithIndex(
            this._visibleRows.firstElement?._UITableViewRowIndex ??
            (calculateVisibleRows ? this.indexesForVisibleRows().firstElement : 0) ??
            0
        )
    }
    
    indexesForVisibleRows(paddingRatio = 0.5): number[] {
        
        // 1. Calculate the visible frame relative to the Table's bounds (0,0 is top-left of the table view)
        // This accounts for the Window viewport clipping the table if it is partially off-screen.
        const tableRect = this.viewHTMLElement.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const pageScale = UIView.pageScale
        
        // The top of the visible window relative to the view's top edge.
        // If tableRect.top is negative, the table is scrolled up and clipped by the window top.
        const visibleFrameTop = Math.max(0, -tableRect.top / pageScale)
        
        // The bottom of the visible window relative to the view's top edge.
        // We clip it to the table's actual bounds height so we don't look past the table content.
        const visibleFrameBottom = Math.min(
            this.bounds.height,
            (viewportHeight - tableRect.top) / pageScale
        )
        
        // If the table is completely off-screen, return empty
        if (visibleFrameBottom <= visibleFrameTop) {
            return []
        }
        
        // 2. Convert to Content Coordinates (Scroll Offset)
        // contentOffset.y is the internal scroll position.
        // If using viewport scrolling (full height), contentOffset.y is typically 0.
        // If using internal scrolling, this shifts the visible frame to the correct content rows.
        let firstVisibleY = this.contentOffset.y + visibleFrameTop
        let lastVisibleY = this.contentOffset.y + visibleFrameBottom
        
        // 3. Apply Padding
        // We calculate padding based on the viewport height to ensure smooth scrolling
        const paddingPx = (viewportHeight / pageScale) * paddingRatio
        firstVisibleY = Math.max(0, firstVisibleY - paddingPx)
        lastVisibleY = lastVisibleY + paddingPx
        
        const numberOfRows = this.numberOfRows()
        
        // 4. Find Indexes
        if (this.allRowsHaveEqualHeight) {
            
            const rowHeight = this._heightForAnyRow(NO)
            
            let firstIndex = Math.floor(firstVisibleY / rowHeight)
            let lastIndex = Math.floor(lastVisibleY / rowHeight)
            
            // Clamp BOTH indexes to [0, numberOfRows-1].
            // Without the upper clamp on firstIndex, when the viewport extends below the
            // last row firstIndex can exceed numberOfRows-1 while lastIndex is already
            // clamped there. firstIndex > lastIndex → empty result → _removeVisibleRows →
            // browser collapses scrollHeight → scrollTop resets to 0 → rows pile at top.
            firstIndex = Math.max(0, Math.min(firstIndex, numberOfRows - 1))
            lastIndex = Math.max(0, Math.min(lastIndex, numberOfRows - 1))
            
            const result = []
            for (let i = firstIndex; i <= lastIndex; i++) {
                result.push(i)
            }
            return result
        }
        
        // Variable Heights
        this._calculateAllPositions()
        const result = []
        
        // Clamp firstVisibleY to the actual content height so that when the viewport
        // extends below the last row the intersection check still matches the final rows
        // rather than producing an empty result.
        const totalContentHeight = IF(this._rowPositions.lastElement)(() =>
            this._rowPositions.lastElement.bottomY
        ).ELSE(() =>
            0
        )
        firstVisibleY = Math.min(firstVisibleY, totalContentHeight)
        
        for (let i = 0; i < numberOfRows; i++) {
            
            const position = this._rowPositionWithIndex(i)
            if (!position) {
                break
            }
            
            const rowTop = position.topY
            const rowBottom = position.bottomY
            
            // Check intersection
            if (rowBottom >= firstVisibleY && rowTop <= lastVisibleY) {
                result.push(i)
            }
            
            if (rowTop > lastVisibleY) {
                break
            }
            
        }
        
        return result
        
    }
    
    
    // This is called when no rows are supposed to be visible as a performance shortcut
    _removeVisibleRows() {
        
        this._visibleRows.forEach((row: UIView) => {
            
            this._persistedData[row._UITableViewRowIndex as number] = this.persistenceDataItemForRowWithIndex(
                row._UITableViewRowIndex as number,
                row
            )
            row.removeFromSuperview()
            this._markReusableViewAsUnused(row)
            
        })
        this._visibleRows = []
        
    }
    
    
    _removeAllReusableRows() {
        this._unusedReusableViews.forEach((rows: UIView[]) =>
            rows.forEach((row: UIView) => {
                
                this._persistedData[row._UITableViewRowIndex as number] = this.persistenceDataItemForRowWithIndex(
                    row._UITableViewRowIndex as number,
                    row
                )
                row.removeFromSuperview()
                
            })
        )
        this._unusedReusableViews = {}
    }
    
    
    _markReusableViewAsUnused(row: UIView) {
        const identifier = row._UITableViewReusabilityIdentifier
        if (!this._unusedReusableViews[identifier]) {
            this._unusedReusableViews[identifier] = []
        }
        if (!this._unusedReusableViews[identifier].contains(row)) {
            this._unusedReusableViews[identifier].push(row)
        }
    }
    
    _scheduleDrawVisibleRows() {
        if (!this._isDrawVisibleRowsScheduled) {
            this._isDrawVisibleRowsScheduled = YES
            
            UIView.runFunctionBeforeNextFrame(() => {
                this._calculateAllPositions()
                this._drawVisibleRows()
                this.setNeedsLayout()
                this._isDrawVisibleRowsScheduled = NO
            })
        }
    }
    
    _drawVisibleRows() {
        
        if (!this.isMemberOfViewTree) {
            return
        }
        
        // Uses the unified method above
        const visibleIndexes = this.indexesForVisibleRows()
        
        // If no rows are visible, remove all current rows
        if (visibleIndexes.length === 0) {
            this._removeVisibleRows()
            return
        }
        
        const minIndex = visibleIndexes[0]
        const maxIndex = visibleIndexes[visibleIndexes.length - 1]
        
        const removedViews: UITableViewRowView[] = []
        const visibleRows: UITableViewRowView[] = []
        
        // 1. Identify rows that have moved off-screen
        this._visibleRows.forEach((row) => {
            if (IS_DEFINED(row._UITableViewRowIndex) &&
                (row._UITableViewRowIndex < minIndex || row._UITableViewRowIndex > maxIndex)) {
                
                // Persist state before removal
                this._persistedData[row._UITableViewRowIndex] = this.persistenceDataItemForRowWithIndex(
                    row._UITableViewRowIndex,
                    row
                )
                this._markReusableViewAsUnused(row)
                removedViews.push(row)
            }
            else {
                visibleRows.push(row)
            }
        })
        
        this._visibleRows = visibleRows
        
        // 2. Add new rows that have moved onto the screen
        visibleIndexes.forEach((rowIndex: number) => {
            // If the view is already in this._visibleRows, do nothing to it
            if (this.isRowWithIndexVisible(rowIndex)) {
                return
            }
            
            // Get view from reuse pool (marked as unused before) or make a new one
            const view: UITableViewRowView = this.viewForRowWithIndex(rowIndex)
            this._visibleRows.push(view)
            this.addSubview(view)
        })
        
        // 3. Clean up DOM
        removedViews.forEach(row => {
            // Check that the row has not been added back
            if (this._visibleRows.indexOf(row) == -1) {
                row.removeFromSuperview()
            }
        })
        
    }
    
    
    visibleRowWithIndex(rowIndex: number | undefined): UIView | undefined {
        for (let i = 0; i < this._visibleRows.length; i++) {
            const row = this._visibleRows[i]
            if (row._UITableViewRowIndex == rowIndex) {
                return row
            }
        }
    }
    
    
    isRowWithIndexVisible(rowIndex: number) {
        return IS(this.visibleRowWithIndex(rowIndex))
    }
    
    
    reusableViewForIdentifier(identifier: string, rowIndex: number): UITableViewRowView {
        
        const visibleRowView = this.visibleRowWithIndex(rowIndex)
        if (visibleRowView?._UITableViewReusabilityIdentifier === identifier) {
            return visibleRowView
        }
        
        if (!this._unusedReusableViews[identifier]) {
            this._unusedReusableViews[identifier] = []
        }
        
        let view: UITableViewRowView
        
        if (this._unusedReusableViews[identifier]?.length) {
            
            view = this._unusedReusableViews[identifier].pop() as UITableViewRowView
            view._UITableViewRowIndex = rowIndex
            Object.assign(view, this._persistedData[rowIndex] || this.defaultRowPersistenceDataItem())
            
        }
        else {
            
            view = this.newReusableViewForIdentifier(identifier, this._rowIDIndex) as UITableViewRowView
            this._rowIDIndex = this._rowIDIndex + 1
            
            view._UITableViewReusabilityIdentifier = identifier
            view._UITableViewRowIndex = rowIndex
            
            Object.assign(view, this._persistedData[rowIndex] || this.defaultRowPersistenceDataItem())
            
        }
        
        // When all rows are uniform, opt the view into the shared height cache so
        // only the first measurement is ever computed for the whole table.
        if (this.allRowsHaveEqualHeight) {
            view.sharedIntrinsicSizeCacheIdentifier = this._equalRowHeightCacheIdentifier
        }
        else {
            view.sharedIntrinsicSizeCacheIdentifier = undefined
        }
        
        return view
        
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
        const row = this.reusableViewForIdentifier("Row", rowIndex)
        row._UITableViewRowIndex = rowIndex
        FIRST_OR_NIL((row as unknown as UIButton).titleLabel).text = "Row " + rowIndex
        return row
    }
    
    // Functions that should be overridden to draw the correct content END
    
    
    // Functions that trigger redrawing of the content
    override didScrollToPosition(offsetPosition: UIPoint) {
        
        super.didScrollToPosition(offsetPosition)
        
        this.forEachViewInSubtree((view: UIView) => {
            view._isPointerValid = NO
        })
        
        this._scheduleDrawVisibleRows()
        
    }
    
    override willMoveToSuperview(superview: UIView) {
        super.willMoveToSuperview(superview)
        
        if (IS(superview)) {
            // Set up viewport listeners when added to a superview
            this._setupViewportScrollAndResizeHandlersIfNeeded()
        }
        else {
            // Clean up when removed from superview
            this._cleanupViewportScrollListeners()
        }
    }
    
    override wasAddedToViewTree() {
        super.wasAddedToViewTree()
        this.loadData()
        
        // Ensure listeners are set up
        this._setupViewportScrollAndResizeHandlersIfNeeded()
        
    }
    
    override wasRemovedFromViewTree() {
        super.wasRemovedFromViewTree()
        this._cleanupViewportScrollListeners()
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
    
    
    override clearIntrinsicSizeCache() {
        super.clearIntrinsicSizeCache()
        if (this.allRowsHaveEqualHeight) {
            UIView.invalidateSharedIntrinsicSizeCache(this._equalRowHeightCacheIdentifier)
        }
        this.invalidateSizeOfRowWithIndex(0)
    }
    
    private _layoutAllRows(positions = this._rowPositions) {
        
        const bounds = this.bounds
        
        this._visibleRows.sort((rowA, rowB) => rowA._UITableViewRowIndex! - rowB._UITableViewRowIndex!)
            .forEach(row => {
                
                const frame = bounds.copy()
                
                const positionObject = this._rowPositionWithIndex(row._UITableViewRowIndex!, positions)
                frame.min.y = positionObject.topY
                frame.max.y = positionObject.bottomY
                row.frame = frame
                
                row.style.width = "" + (bounds.width - this.sidePadding * 2).integerValue + "px"
                row.style.left = "" + this.sidePadding.integerValue + "px"
                
                // This is to reorder the elements in the DOM
                this.viewHTMLElement.appendChild(row.viewHTMLElement)
                
            })
        
        // Use _rowPositionWithIndex rather than positions.lastElement.
        // When allRowsHaveEqualHeight = YES, _rowPositions contains only a single
        // entry (row 0). positions.lastElement.bottomY would therefore equal just
        // ONE row's height (e.g. 50px) instead of the full content height.
        // _rowPositionWithIndex correctly uses the computed formula for equal-height
        // tables (numberOfRows × rowHeight) and falls back to positions[N-1] otherwise.
        // This ensures _fullHeightView maintains the correct scroll height even when
        // all visible rows have been removed from the DOM (e.g. after crossing the
        // bottom edge), preventing the browser from clamping scrollTop to 0.
        const numberOfRows = this.numberOfRows()
        const fullContentHeight = numberOfRows
                                  ? this._rowPositionWithIndex(numberOfRows - 1, positions).bottomY
                                  : 0
        this._fullHeightView.frame = bounds.rectangleWithHeight(fullContentHeight)
            .rectangleWithWidth(bounds.width * 0.5)
        
    }
    
    private _animateLayoutAllRows() {
        
        UIView.animateViewOrViewsWithDurationDelayAndFunction(
            this._visibleRows,
            this.animationDuration,
            0,
            undefined,
            () => {
                
                this._layoutAllRows()
                
            },
            () => {
            
            
            }
        )
        
    }
    
    
    override layoutSubviews() {
        
        if (this.isVirtualLayouting) {
            console.error("layout subviews called during virtual layouting on UITableView, " +
                "indicating a possible error in the layout system.")
            return
        }
        
        const previousPositions: UITableViewReusableViewPositionObject[] = JSON.parse(
            JSON.stringify(this._rowPositions))
        
        const previousVisibleRowsLength = this._visibleRows.length
        
        if (this._needsDrawingOfVisibleRowsBeforeLayout) {
            
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
                
                
                UIView.runFunctionBeforeNextFrame(() => {
                    
                    this._animateLayoutAllRows()
                    
                })
                
            }
            else {
                
                this._animateLayoutAllRows()
                
            }
            
            
            this._shouldAnimateNextLayout = NO
            
        }
        else {
            
            this._calculateAllPositions()
            
            this._layoutAllRows()
            
            
        }
        
        
    }
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        let result = 0
        this._calculateAllPositions()
        
        const numberOfRows = this.numberOfRows()
        if (numberOfRows) {
            result = this._rowPositionWithIndex(numberOfRows - 1).bottomY
        }
        
        return result
        
    }
    
    
}
