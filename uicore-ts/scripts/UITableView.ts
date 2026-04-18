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
    
    // -------------------------------------------------------------------------
    // Keyboard navigation state
    // -------------------------------------------------------------------------
    
    /** Row index with -1 meaning the header row. undefined means no focus. */
    _keyboardFocusedRowIndex: number | undefined = undefined
    /** Cell index within the focused row. */
    _keyboardFocusedCellIndex: number = 0
    /** Total number of data columns (excludes left/right side cells). Set by CBDataView. */
    _columnCount: number = 0
    /** Called by UITableView when the focused row/cell changes. CBDataView overrides this. */
    keyboardFocusDidChange?: (rowIndex: number | undefined, cellIndex: number) => void
    /** Fired when Enter is pressed on a focused cell. Passes rowIndex and cellIndex. */
    keyboardDidActivateCell?: (rowIndex: number, cellIndex: number) => void
    
    _keydownHandler?: (event: KeyboardEvent) => void
    _keyboardListenersAttached = false
    
    
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
        this._setupGridAccessibility()
        this._setupKeyboardNavigation()
        
    }
    
    
    // -------------------------------------------------------------------------
    // ARIA / Accessibility setup
    // -------------------------------------------------------------------------
    
    /**
     * The element that receives tabIndex, ARIA grid role, and all keyboard/pointer
     * listeners. Defaults to the table's own element. CBDataView overrides this
     * to a container that wraps both the header and the table, so the focus ring
     * encompasses both.
     */
    _keyboardListenerElement: HTMLElement = this.viewHTMLElement
    
    _setupGridAccessibility() {
        const el = this._keyboardListenerElement
        el.setAttribute("role", "grid")
        el.setAttribute("aria-rowcount", "0")
        el.setAttribute("aria-colcount", "0")
        el.tabIndex = 0
    }
    
    /** Called by CBDataView after descriptors change. */
    setColumnCount(count: number) {
        this._columnCount = count
        this._keyboardListenerElement.setAttribute("aria-colcount", String(count))
    }
    
    /** Called by CBDataView after data loads. */
    setRowCount(count: number) {
        this._keyboardListenerElement.setAttribute("aria-rowcount", String(count))
    }
    
    
    // -------------------------------------------------------------------------
    // Keyboard navigation
    // -------------------------------------------------------------------------
    
    _setupKeyboardNavigation() {
        
        this._keydownHandler = (event: KeyboardEvent) => {
            
            if (!this.isMemberOfViewTree) {
                return
            }
            
            const target = event.target as HTMLElement
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
                return
            }
            
            const rowCount = this.numberOfRows()
            const hasHeader = this._keyboardFocusedRowIndex !== undefined
            
            if (event.key === "ArrowDown") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex === undefined) {
                    this._setKeyboardFocus(0, this._keyboardFocusedCellIndex)
                }
                else if (event.metaKey || event.ctrlKey) {
                    this._setKeyboardFocus(rowCount - 1, this._keyboardFocusedCellIndex)
                }
                else if (event.altKey) {
                    const pageSize = Math.max(1, Math.floor(this.bounds.height / (this._heightForAnyRow() || 50)))
                    const next = Math.min(
                        (this._keyboardFocusedRowIndex < 0 ? 0 : this._keyboardFocusedRowIndex) + pageSize,
                        rowCount - 1
                    )
                    this._setKeyboardFocus(next, this._keyboardFocusedCellIndex)
                }
                else if (this._keyboardFocusedRowIndex === -1) {
                    this._setKeyboardFocus(0, this._keyboardFocusedCellIndex)
                }
                else if (this._keyboardFocusedRowIndex < rowCount - 1) {
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex + 1, this._keyboardFocusedCellIndex)
                }
            }
            else if (event.key === "ArrowUp") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex === undefined) {
                    this._setKeyboardFocus(rowCount - 1, this._keyboardFocusedCellIndex)
                }
                else if (event.metaKey || event.ctrlKey) {
                    this._setKeyboardFocus(-1, this._keyboardFocusedCellIndex)
                }
                else if (event.altKey) {
                    const pageSize = Math.max(1, Math.floor(this.bounds.height / (this._heightForAnyRow() || 50)))
                    const prev = Math.max(
                        (this._keyboardFocusedRowIndex < 0 ? 0 : this._keyboardFocusedRowIndex) - pageSize, -1)
                    this._setKeyboardFocus(prev, this._keyboardFocusedCellIndex)
                }
                else if (this._keyboardFocusedRowIndex === 0) {
                    this._setKeyboardFocus(-1, this._keyboardFocusedCellIndex)
                }
                else if (this._keyboardFocusedRowIndex > 0) {
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex - 1, this._keyboardFocusedCellIndex)
                }
            }
            else if (event.key === "ArrowRight") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined && this._columnCount > 0) {
                    const nextCell = event.metaKey || event.ctrlKey
                                     ? this._columnCount - 1
                                     : Math.min(this._keyboardFocusedCellIndex + 1, this._columnCount - 1)
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex, nextCell)
                }
            }
            else if (event.key === "ArrowLeft") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined && this._columnCount > 0) {
                    const prevCell = event.metaKey || event.ctrlKey
                                     ? 0
                                     : Math.max(this._keyboardFocusedCellIndex - 1, 0)
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex, prevCell)
                }
            }
            else if (event.key === "Home") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined) {
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex, 0)
                }
            }
            else if (event.key === "End") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined && this._columnCount > 0) {
                    this._setKeyboardFocus(this._keyboardFocusedRowIndex, this._columnCount - 1)
                }
            }
            else if (event.key === "PageDown") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined) {
                    const pageSize = Math.max(1, Math.floor(this.bounds.height / (this._heightForAnyRow() || 50)))
                    const next = Math.min(
                        (this._keyboardFocusedRowIndex < 0 ? 0 : this._keyboardFocusedRowIndex) + pageSize,
                        rowCount - 1
                    )
                    this._setKeyboardFocus(next, this._keyboardFocusedCellIndex)
                }
            }
            else if (event.key === "PageUp") {
                event.preventDefault()
                if (this._keyboardFocusedRowIndex !== undefined) {
                    const pageSize = Math.max(1, Math.floor(this.bounds.height / (this._heightForAnyRow() || 50)))
                    const prev = Math.max(
                        (this._keyboardFocusedRowIndex < 0 ? 0 : this._keyboardFocusedRowIndex) - pageSize, -1)
                    this._setKeyboardFocus(prev, this._keyboardFocusedCellIndex)
                }
            }
            else if (event.key === "Enter" || event.key === " ") {
                if (this._keyboardFocusedRowIndex !== undefined && this._keyboardFocusedRowIndex >= 0) {
                    event.preventDefault()
                    this.keyboardDidActivateCell?.(this._keyboardFocusedRowIndex, this._keyboardFocusedCellIndex)
                }
            }
            else if (event.key === "Escape") {
                // Release focus from the table — move to next focusable element
                this._clearKeyboardFocus()
                this._keyboardListenerElement.blur()
            }
            
        }
        
        // Listeners are attached in wasAddedToViewTree to guarantee they land
        // on the final stable viewHTMLElement after the framework has fully
        // initialised the view.
        
    }
    
    /**
     * Move keyboard focus to a specific row and cell.
     * rowIndex = -1 means the header row.
     */
    _setKeyboardFocus(rowIndex: number, cellIndex: number) {
        
        const previousRowIndex = this._keyboardFocusedRowIndex
        const previousCellIndex = this._keyboardFocusedCellIndex
        
        // When moving to a different data row, land on the first button cell by default
        if (rowIndex >= 0 && rowIndex !== previousRowIndex) {
            const row = this.visibleRowWithIndex(rowIndex) as any
            if (row && typeof row.firstButtonCellIndex === "function") {
                cellIndex = row.firstButtonCellIndex()
            }
        }
        
        this._keyboardFocusedRowIndex = rowIndex
        this._keyboardFocusedCellIndex = cellIndex
        
        // Clear highlight from old position
        if (previousRowIndex !== undefined && previousRowIndex !== rowIndex) {
            this._clearKeyboardFocusOnRow(previousRowIndex)
        }
        else if (previousRowIndex === rowIndex && previousCellIndex !== cellIndex) {
            this._clearKeyboardFocusOnRow(rowIndex)
        }
        
        // Scroll the focused row into view if it is a data row
        if (rowIndex >= 0) {
            this._scrollRowIntoView(rowIndex)
        }
        
        // Apply highlight to new position
        this._applyKeyboardFocusToVisibleRows()
        
        // Notify observers (CBDataView uses this to sync header highlight)
        this.keyboardFocusDidChange?.(rowIndex, cellIndex)
        
    }
    
    _clearKeyboardFocus() {
        const previous = this._keyboardFocusedRowIndex
        this._keyboardFocusedRowIndex = undefined
        if (previous !== undefined) {
            this._clearKeyboardFocusOnRow(previous)
        }
        this.keyboardFocusDidChange?.(undefined, this._keyboardFocusedCellIndex)
    }
    
    _clearKeyboardFocusOnRow(rowIndex: number) {
        if (rowIndex === -1) {
            // Header — notify via callback; CBDataView handles the header view
            this.keyboardFocusDidChange?.(-1, -1)
            return
        }
        const row = this.visibleRowWithIndex(rowIndex) as any
        if (row && typeof row.setKeyboardFocusedCellIndex === "function") {
            row.setKeyboardFocusedCellIndex(undefined)
        }
    }
    
    _applyKeyboardFocusToVisibleRows(clearAll = false) {
        this._visibleRows.forEach((row: any) => {
            if (typeof row.setKeyboardFocusedCellIndex !== "function") {
                return
            }
            if (clearAll || row._UITableViewRowIndex !== this._keyboardFocusedRowIndex) {
                row.setKeyboardFocusedCellIndex(undefined)
            }
            else {
                row.setKeyboardFocusedCellIndex(this._keyboardFocusedCellIndex)
            }
        })
    }
    
    _scrollRowIntoView(rowIndex: number) {
        const position = this._rowPositionWithIndex(rowIndex)
        if (!position) {
            return
        }
        const offsetY = this.contentOffset.y
        const visibleHeight = this.bounds.height
        if (position.topY < offsetY) {
            const duration = this.animationDuration
            this.animationDuration = 0
            this.contentOffset = this.contentOffset.pointWithY(position.topY)
            this.animationDuration = duration
        }
        else if (position.bottomY > offsetY + visibleHeight) {
            const duration = this.animationDuration
            this.animationDuration = 0
            this.contentOffset = this.contentOffset.pointWithY(position.bottomY - visibleHeight)
            this.animationDuration = duration
        }
    }
    
    /** Expose so CBDataView can call it after loading data. */
    focusRowAtIndex(rowIndex: number, cellIndex: number = 0) {
        this._setKeyboardFocus(rowIndex, cellIndex)
        this._keyboardListenerElement.focus({ preventScroll: true })
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
    
    override wasRemovedFromViewTree() {
        super.wasRemovedFromViewTree()
        this._cleanupViewportScrollListeners()
        if (this._keydownHandler) {
            this.viewHTMLElement.removeEventListener("keydown", this._keydownHandler)
        }
        // Reset so listeners are re-attached if added back to the tree
        this._keyboardListenersAttached = false
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
            
            // Ensure the row and all its children stay out of the natural tab order
            view.tabIndex = -1
            view.forEachViewInSubtree(subview => {
                subview.tabIndex = -1
            })
        })
        
        // 3. Clean up DOM
        removedViews.forEach(row => {
            // Check that the row has not been added back
            if (this._visibleRows.indexOf(row) == -1) {
                row.removeFromSuperview()
            }
        })
        
        // 4. Re-apply keyboard focus highlight after rows are re-rendered
        this._applyKeyboardFocusToVisibleRows()
        
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
        
        // Attach keyboard and pointer listeners now that the element is stable
        // in the DOM. Guarded so repeated wasAddedToViewTree calls (e.g. after
        // navigation returns) don't stack duplicate listeners.
        if (!this._keyboardListenersAttached) {
            this._keyboardListenersAttached = true
            const el = this._keyboardListenerElement
            
            el.addEventListener("keydown", this._keydownHandler!)
            
            el.addEventListener("pointerdown", (event: PointerEvent) => {
                const target = event.target as HTMLElement | null
                if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
                    return
                }
                let walkedTarget = target
                while (walkedTarget && walkedTarget !== el) {
                    const viewObject = (walkedTarget as any).UIViewObject as UITableViewRowView | undefined
                    if (viewObject?._UITableViewRowIndex !== undefined) {
                        el.focus({ preventScroll: true })
                        this._setKeyboardFocus(viewObject._UITableViewRowIndex, this._keyboardFocusedCellIndex)
                        return
                    }
                    walkedTarget = walkedTarget.parentElement
                }
                el.focus({ preventScroll: true })
            })
            
            el.addEventListener("focus", () => {
                if (this._keyboardFocusedRowIndex === undefined && this.numberOfRows() > 0) {
                    this._setKeyboardFocus(0, this._keyboardFocusedCellIndex)
                }
                else if (this._keyboardFocusedRowIndex !== undefined) {
                    this._applyKeyboardFocusToVisibleRows()
                }
            })
            
            el.addEventListener("blur", (event: FocusEvent) => {
                if (!el.contains(event.relatedTarget as Node)) {
                    this._applyKeyboardFocusToVisibleRows(true)
                }
            })
        }
        
        // Remove all subviews from the browser's natural tab order.
        // The container (_keyboardListenerElement) is the single tab stop.
        // Internal navigation is handled exclusively via arrow keys.
        this.forEachViewInSubtree(view => {
            if (view !== this) {
                view.tabIndex = -1
            }
        })
        // Re-assert tabIndex=0 on the listener element — wasAddedToViewTree fires
        // on every tree insertion including navigation returns.
        this._keyboardListenerElement.tabIndex = 0
        
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
        
        const sortedRows = this._visibleRows.sort(
            (rowA, rowB) => rowA._UITableViewRowIndex! - rowB._UITableViewRowIndex!
        )
        
        sortedRows.forEach((row, i) => {
            
            const frame = bounds.copy()
            
            const positionObject = this._rowPositionWithIndex(row._UITableViewRowIndex!, positions)
            frame.min.y = positionObject.topY
            frame.max.y = positionObject.bottomY
            row.frame = frame
            
            row.style.width = "" + (bounds.width - this.sidePadding * 2).integerValue + "px"
            row.style.left = "" + this.sidePadding.integerValue + "px"
            
            // Set aria-rowindex (1-based per ARIA spec)
            row.viewHTMLElement.setAttribute("aria-rowindex", String((row._UITableViewRowIndex ?? 0) + 1))
            
            // Insert before the correct next sibling so DOM order always matches
            // row index order. The nextSibling check makes this a no-op when the
            // element is already in the right position, avoiding unnecessary DOM
            // mutations and the focus loss that appendChild causes.
            const nextSiblingElement = sortedRows[i + 1]?.viewHTMLElement
                ?? this._fullHeightView.viewHTMLElement
            if (row.viewHTMLElement.nextSibling !== nextSiblingElement) {
                this.viewHTMLElement.insertBefore(row.viewHTMLElement, nextSiblingElement)
            }
            
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
    
    // UITableView has usesVirtualLayoutingForIntrinsicSizing = NO and is always
    // given a fixed viewport frame by its parent — so frame.height never changes
    // between layout passes. The base didLayoutSubviews compares frame.height and
    // therefore never propagates upward, even when row positions have changed and
    // intrinsicContentHeight now returns a different value.
    // We override here to track the intrinsic content height instead, so that
    // parents (e.g. CBDataView) get their cache invalidated and re-layout whenever
    // the total row stack height changes.
    override didLayoutSubviews() {
        this.viewController?.viewDidLayoutSubviews()
        
        if (!this.isVirtualLayouting && IS(this.superview) && this.isMemberOfViewTree) {
            const currentContentHeight = this.intrinsicContentHeight()
            if (currentContentHeight !== this._lastReportedHeight) {
                this._lastReportedHeight = currentContentHeight
                this.clearIntrinsicSizeCache()
                this.superview.setNeedsLayout()
            }
        }
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
