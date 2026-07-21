import { UIButton } from "./UIButton"
import { UINativeScrollView } from "./UINativeScrollView"
import { EXTEND, FIRST_OR_NIL, IS, IS_DEFINED, MAKE_ID, NO, YES } from "./UIObject"
import { UIPoint } from "./UIPoint"
import { UIRectangle } from "./UIRectangle"
import { UIView, UIViewBroadcastEvent } from "./UIView"


interface UITableViewRowView extends UIView {
    
    _UITableViewRowIndex?: number;
    _UITableViewWasHiddenBeforeLayout?: boolean;
    _UITableViewRequiresLayout?: boolean;
    
}


interface UITableViewViewportState {
    visibleFrameTop: number;
    visibleFrameBottom: number;
    overscanLength: number;
    scrollTop: number;
    viewportHeight: number;
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
    /** Fallback used for rows whose intrinsic height has not been measured yet. */
    _estimatedRowHeight = 50
    _measuredRowHeights = new Map<number, number>()
    _rowHeightDeltaTree: number[] = [0]
    _rowHeightModelRowCount = 0
    _rowHeightModelWidth = -1
    _isAssigningRowFrames = NO
    _isPreparingRowsForMeasurement = NO
    _isLayingOutRowsForViewport = NO
    
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
    
    
    get estimatedRowHeight() {
        return this._estimatedRowHeight
    }
    
    set estimatedRowHeight(height: number) {
        if (height <= 0 || height === this._estimatedRowHeight) {
            return
        }
        this._estimatedRowHeight = height
        this._rowHeightModelRowCount = this.numberOfRows()
        this._rowHeightDeltaTree = new Array(this._rowHeightModelRowCount + 1).fill(0)
        this._measuredRowHeights.forEach((measuredHeight, index) => {
            this._addRowHeightDeltaAtIndex(index, measuredHeight - height)
        })
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        this.setNeedsLayout()
    }
    
    
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
    
    _measureAttachedRowsAtOrBelowVisibleAnchor() {
        if (this.allRowsHaveEqualHeight || !this.numberOfRows()) {
            return NO
        }
        const viewportState = this._viewportState()
        const anchorContentY = viewportState.scrollTop + viewportState.visibleFrameTop
        const firstVisibleIndex = this._rowIndexAtContentPosition(anchorContentY)
        let didMeasureRow = NO
        this._visibleRows.forEach(row => {
            const rowIndex = row._UITableViewRowIndex
            if (!IS_DEFINED(rowIndex) || rowIndex < firstVisibleIndex || this._measuredRowHeights.has(rowIndex)) {
                return
            }
            const measuredHeight = this.heightForRowWithIndex(rowIndex)
            if (this._recordMeasuredHeightForRowWithIndex(measuredHeight, rowIndex)) {
                didMeasureRow = YES
            }
        })
        if (didMeasureRow) {
            this._assignFullHeightViewFrameForContentHeight(this._estimatedContentHeight())
        }
        return didMeasureRow
    }
    
    _assignFullHeightViewFrameForContentHeight(contentHeight: number) {
        const contentBounds = this.contentBounds
        const frame = contentBounds.rectangleWithHeight(contentHeight)
            .rectangleWithWidth(contentBounds.width * 0.5)
        this._fullHeightView.frame = frame
        // The spacer's height change is table-owned and must not propagate back
        // through UIView.didLayoutSubviews as a fresh table layout request.
        this._fullHeightView._lastReportedHeight = frame.height.integerValue
    }
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this._equalRowHeightCacheIdentifier = (elementID ?? MAKE_ID()) + "_rowHeight"
        
        this._fullHeightView = new UIView()
        this._fullHeightView.hidden = YES
        this._fullHeightView.userInteractionEnabled = NO
        this.addSubview(this._fullHeightView)
        this.style.overflowAnchor = "none"
        this.broadcastsPageDidScrollInSubtree = NO
        
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
    
    /**
     * When YES, suppresses the grid ARIA role, tabIndex, and all keyboard/pointer
     * focus listeners. Set this on table views that are controlled by an external
     * focus owner (e.g. an autocomplete text field) so clicks inside the table
     * never steal focus away from that owner.
     */
    disablesKeyboardNavigation: boolean = NO
    
    _setupGridAccessibility() {
        if (this.disablesKeyboardNavigation) {
            return
        }
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
        if (this._rowHeightModelWidth !== this.bounds.width) {
            this._rowPositions.everyElement.isValid = NO
            this._highestValidRowPositionIndex = -1
            this._resetEstimatedRowHeightModel()
        }
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
        
        if (this.allRowsHaveEqualHeight) {
            this._calculatePositionsUntilIndex(this.numberOfRows() - 1)
        }
        else {
            this._prepareEstimatedRowHeightModel()
        }
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        
        this.setNeedsLayout()
        
    }
    
    reloadData() {
        
        this._removeVisibleRows()
        this._removeAllReusableRows()
        
        this._rowPositions = []
        this._highestValidRowPositionIndex = -1
        this._resetEstimatedRowHeightModel()
        
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
        const unwrappedTableView = (this as any).wrapped_nil_target as UITableView | undefined
        if (unwrappedTableView) {
            unwrappedTableView.invalidateSizeOfRowWithIndex(index, animateChange)
            return
        }
        // UIView's constructor can reach overridden invalidation methods before
        // UITableView field initializers run. There is no row state to invalidate yet.
        if (!this._rowPositions || !this._measuredRowHeights || !this._rowHeightDeltaTree) {
            return
        }
        // Assigning a table-computed row frame naturally changes that row's bounds.
        // It must not invalidate the height that produced the frame.
        if (this._isAssigningRowFrames || this._isLayingOutRowsForViewport) {
            return
        }
        if (this._isPreparingRowsForMeasurement) {
            return
        }
        const firstInvalidIndex = Math.max(0, index)
        if (!this.allRowsHaveEqualHeight) {
            this._forgetMeasuredRowHeightsStartingAtIndex(firstInvalidIndex)
        }
        else {
            UIView.invalidateSharedIntrinsicSizeCache(this._equalRowHeightCacheIdentifier)
            if (this._rowPositions[0]) {
                this._rowPositions[0].isValid = NO
            }
        }
        this._rowPositions.slice(firstInvalidIndex).everyElement.isValid = NO
        this._highestValidRowPositionIndex = Math.min(this._highestValidRowPositionIndex, firstInvalidIndex - 1)
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
        this._shouldAnimateNextLayout = animateChange
    }
    
    _invalidateOnlySizeOfRowWithIndex(index: number) {
        if (!this._rowPositions || !this._measuredRowHeights || !this._rowHeightDeltaTree) {
            return
        }
        if (!this.allRowsHaveEqualHeight) {
            this._recordEstimatedHeightForRowWithIndex(index)
        }
        else {
            UIView.invalidateSharedIntrinsicSizeCache(this._equalRowHeightCacheIdentifier)
        }
        if (this.allRowsHaveEqualHeight && this._rowPositions[0]) {
            this._rowPositions[0].isValid = NO
            this._highestValidRowPositionIndex = -1
        }
        else if (this._rowPositions[index]) {
            this._rowPositions[index].isValid = NO
        }
        this._needsDrawingOfVisibleRowsBeforeLayout = YES
    }
    
    
    _rowPositionWithIndex(index: number, positions = this._rowPositions) {
        if (positions !== this._rowPositions && positions[index]) {
            return positions[index]
        }
        if (this.allRowsHaveEqualHeight) {
            if (!positions[0]) {
                this._calculatePositionsUntilIndex(0)
            }
            const firstPositionObject = positions[0] ?? this._rowPositions[0]
            const rowHeight = firstPositionObject.bottomY - firstPositionObject.topY
            const result = {
                bottomY: rowHeight * (index + 1),
                topY: rowHeight * index,
                isValid: firstPositionObject.isValid
            }
            return result
        }
        if (!this.allRowsHaveEqualHeight) {
            this._prepareEstimatedRowHeightModel()
            const topY = index * this.estimatedRowHeight + this._rowHeightDeltaBeforeIndex(index)
            const height = this._measuredRowHeights.get(index) ?? this.estimatedRowHeight
            return {
                bottomY: topY + height,
                topY,
                isValid: this._measuredRowHeights.has(index)
            }
        }
        return positions[index]
    }
    
    _calculateAllPositions() {
        if (!this.allRowsHaveEqualHeight) {
            this._prepareEstimatedRowHeightModel()
            return
        }
        this._calculatePositionsUntilIndex(this.numberOfRows() - 1)
    }
    
    _calculatePositionsUntilIndex(_maxIndex: number) {
        
        if (this.allRowsHaveEqualHeight) {
            const positionObject: UITableViewReusableViewPositionObject = {
                bottomY: this._heightForAnyRow(NO),
                topY: 0,
                isValid: YES
            }
            this._rowPositions = [positionObject]
            return
        }
        this._prepareEstimatedRowHeightModel()
    }
    
    _prepareEstimatedRowHeightModel() {
        const rowCount = this.numberOfRows()
        if (rowCount === this._rowHeightModelRowCount && this._rowHeightDeltaTree.length === rowCount + 1) {
            return
        }
        this._rowHeightModelRowCount = rowCount
        this._rowHeightDeltaTree = new Array(rowCount + 1).fill(0)
        const outOfRangeIndexes: number[] = []
        this._measuredRowHeights.forEach((measuredHeight, measuredIndex) => {
            if (measuredIndex >= rowCount) {
                outOfRangeIndexes.push(measuredIndex)
                return
            }
            this._addRowHeightDeltaAtIndex(measuredIndex, measuredHeight - this.estimatedRowHeight)
        })
        outOfRangeIndexes.forEach(measuredIndex => this._measuredRowHeights.delete(measuredIndex))
    }
    
    _resetEstimatedRowHeightModel() {
        if (!this._measuredRowHeights || !this._rowHeightDeltaTree) {
            return
        }
        this._measuredRowHeights.clear()
        this._rowHeightModelRowCount = this.numberOfRows()
        this._rowHeightModelWidth = this.bounds.width
        if (this.allRowsHaveEqualHeight) {
            this._rowHeightDeltaTree = [0]
        }
        else {
            this._rowHeightDeltaTree = new Array(this._rowHeightModelRowCount + 1).fill(0)
        }
    }
    
    _forgetMeasuredRowHeightsStartingAtIndex(index: number) {
        this._prepareEstimatedRowHeightModel()
        Array.from(this._measuredRowHeights.keys()).forEach(measuredIndex => {
            if (measuredIndex >= index) {
                this._recordEstimatedHeightForRowWithIndex(measuredIndex)
            }
        })
    }
    
    _recordEstimatedHeightForRowWithIndex(index: number) {
        const previousHeight = this._measuredRowHeights.get(index)
        if (previousHeight === undefined) {
            return
        }
        this._measuredRowHeights.delete(index)
        this._addRowHeightDeltaAtIndex(index, this.estimatedRowHeight - previousHeight)
    }
    
    _recordMeasuredHeightForRowWithIndex(height: number, index: number) {
        this._prepareEstimatedRowHeightModel()
        if (!Number.isFinite(height) || height < 0) {
            height = this.estimatedRowHeight
        }
        const previousHeight = this._measuredRowHeights.get(index) ?? this.estimatedRowHeight
        if (Math.abs(previousHeight - height) < 0.01 && this._measuredRowHeights.has(index)) {
            return NO
        }
        this._measuredRowHeights.set(index, height)
        this._addRowHeightDeltaAtIndex(index, height - previousHeight)
        return YES
    }
    
    _addRowHeightDeltaAtIndex(index: number, delta: number) {
        if (index < 0 || index >= this._rowHeightModelRowCount) {
            return
        }
        for (let treeIndex = index + 1; treeIndex < this._rowHeightDeltaTree.length;
             treeIndex += treeIndex & -treeIndex) {
            this._rowHeightDeltaTree[treeIndex] += delta
        }
    }
    
    _rowHeightDeltaBeforeIndex(index: number) {
        let result = 0
        let treeIndex = Math.min(index, this._rowHeightModelRowCount)
        for (; treeIndex > 0; treeIndex -= treeIndex & -treeIndex) {
            result += this._rowHeightDeltaTree[treeIndex]
        }
        return result
    }
    
    _estimatedContentHeight() {
        const rowCount = this.numberOfRows()
        if (!rowCount) {
            return 0
        }
        if (this.allRowsHaveEqualHeight) {
            return this._rowPositionWithIndex(rowCount - 1).bottomY
        }
        this._prepareEstimatedRowHeightModel()
        return rowCount * this.estimatedRowHeight + this._rowHeightDeltaBeforeIndex(rowCount)
    }
    
    _rowIndexAtContentPosition(contentY: number) {
        const rowCount = this.numberOfRows()
        if (!rowCount) {
            return 0
        }
        let lowerIndex = 0
        let upperIndex = rowCount - 1
        while (lowerIndex < upperIndex) {
            const middleIndex = Math.floor((lowerIndex + upperIndex) * 0.5)
            if (this._rowPositionWithIndex(middleIndex).bottomY <= contentY) {
                lowerIndex = middleIndex + 1
            }
            else {
                upperIndex = middleIndex
            }
        }
        return lowerIndex
    }
    
    _heightForAnyRow(calculateVisibleRows = YES) {
        if (!this.allRowsHaveEqualHeight) {
            let rowIndex = this._visibleRows.firstElement?._UITableViewRowIndex
            if (!IS_DEFINED(rowIndex) && calculateVisibleRows) {
                rowIndex = this.indexesForVisibleRows().firstElement
            }
            if (!IS_DEFINED(rowIndex)) {
                rowIndex = 0
            }
            return this._measuredRowHeights.get(rowIndex) ?? this.estimatedRowHeight
        }
        let rowIndex = this._visibleRows.firstElement?._UITableViewRowIndex
        if (!IS_DEFINED(rowIndex) && calculateVisibleRows) {
            rowIndex = this.indexesForVisibleRows().firstElement
        }
        if (!IS_DEFINED(rowIndex)) {
            rowIndex = 0
        }
        return this.heightForRowWithIndex(rowIndex)
    }
    
    _viewportState(paddingRatio = 0.5): UITableViewViewportState {
        const tableRect = this.viewHTMLElement.getBoundingClientRect()
        const pageScale = UIView.pageScale
        const visibleFrameTop = Math.max(0, -tableRect.top / pageScale)
        const visibleFrameBottom = Math.min(
            this.bounds.height,
            (window.innerHeight - tableRect.top) / pageScale
        )
        let viewportHeight = this.viewHTMLElement.clientHeight
        if (!viewportHeight) {
            viewportHeight = this.bounds.height
        }
        return {
            visibleFrameTop,
            visibleFrameBottom,
            overscanLength: Math.max(0, visibleFrameBottom - visibleFrameTop) * paddingRatio,
            scrollTop: this.viewHTMLElement.scrollTop,
            viewportHeight
        }
    }
    
    _indexesForViewportState(viewportState: UITableViewViewportState, scrollTop = viewportState.scrollTop) {
        const numberOfRows = this.numberOfRows()
        if (!numberOfRows || viewportState.visibleFrameBottom <= viewportState.visibleFrameTop) {
            return [] as number[]
        }
        let firstVisibleY = scrollTop + viewportState.visibleFrameTop - viewportState.overscanLength
        let lastVisibleY = scrollTop + viewportState.visibleFrameBottom + viewportState.overscanLength
        firstVisibleY = Math.max(0, firstVisibleY)
        const contentHeight = this._estimatedContentHeight()
        lastVisibleY = Math.min(contentHeight, lastVisibleY)
        
        if (this.allRowsHaveEqualHeight) {
            const rowHeight = this._heightForAnyRow(NO)
            if (rowHeight <= 0) {
                return [] as number[]
            }
            let firstIndex = Math.floor(firstVisibleY / rowHeight)
            let lastIndex = Math.floor(lastVisibleY / rowHeight)
            firstIndex = Math.max(0, Math.min(firstIndex, numberOfRows - 1))
            lastIndex = Math.max(0, Math.min(lastIndex, numberOfRows - 1))
            const result: number[] = []
            for (let rowIndex = firstIndex; rowIndex <= lastIndex; rowIndex++) {
                result.push(rowIndex)
            }
            return result
        }
        this._prepareEstimatedRowHeightModel()
        firstVisibleY = Math.min(firstVisibleY, contentHeight)
        const firstIndex = this._rowIndexAtContentPosition(firstVisibleY)
        const lastIndex = this._rowIndexAtContentPosition(lastVisibleY)
        const result: number[] = []
        for (let rowIndex = firstIndex; rowIndex <= lastIndex; rowIndex++) {
            result.push(rowIndex)
        }
        return result
    }
    
    indexesForVisibleRows(paddingRatio = 0.5): number[] {
        return this._indexesForViewportState(this._viewportState(paddingRatio))
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
    
    _layoutRowsForCurrentViewport() {
        if (!this.isMemberOfViewTree || this._isLayingOutRowsForViewport) {
            return
        }
        this._isLayingOutRowsForViewport = YES
        try {
            const rowCount = this.numberOfRows()
            if (!rowCount) {
                this._removeVisibleRows()
                this._assignFullHeightViewFrameForContentHeight(0)
                this._needsDrawingOfVisibleRowsBeforeLayout = NO
                return
            }
            
            if (!this.allRowsHaveEqualHeight && this._rowHeightModelWidth !== this.bounds.width) {
                this._resetEstimatedRowHeightModel()
            }
            this._calculateAllPositions()
            
            const viewportState = this._viewportState()
            const contentHeightBeforeMeasurement = this._estimatedContentHeight()
            const anchorContentY = viewportState.scrollTop + viewportState.visibleFrameTop
            const anchorRowIndex = this._rowIndexAtContentPosition(anchorContentY)
            const anchorPosition = this._rowPositionWithIndex(anchorRowIndex)
            const anchorOffsetWithinRow = anchorContentY - anchorPosition.topY
            const bottomDistanceBeforeMeasurement = Math.max(
                0,
                contentHeightBeforeMeasurement - viewportState.scrollTop - viewportState.viewportHeight
            )
            const preservesBottomPosition = bottomDistanceBeforeMeasurement <= 1
            
            let workingScrollTop = viewportState.scrollTop
            let visibleIndexes = this._indexesForViewportState(viewportState, workingScrollTop)
            let measurementPass = 0
            while (measurementPass < rowCount) {
                this._reconcileVisibleRowsWithIndexes(visibleIndexes)
                const didMeasureRows = this._measureUnresolvedRowsWithIndexes(visibleIndexes)
                workingScrollTop = this._scrollTopByPreservingAnchorRow(
                    anchorRowIndex,
                    anchorOffsetWithinRow,
                    bottomDistanceBeforeMeasurement,
                    preservesBottomPosition,
                    viewportState
                )
                const nextVisibleIndexes = this._indexesForViewportState(viewportState, workingScrollTop)
                let rangesAreEqual = nextVisibleIndexes.length === visibleIndexes.length
                if (rangesAreEqual) {
                    for (let rowIndexOffset = 0; rowIndexOffset < visibleIndexes.length; rowIndexOffset++) {
                        if (visibleIndexes[rowIndexOffset] !== nextVisibleIndexes[rowIndexOffset]) {
                            rangesAreEqual = NO
                            break
                        }
                    }
                }
                visibleIndexes = nextVisibleIndexes
                if (rangesAreEqual && !didMeasureRows) {
                    break
                }
                measurementPass = measurementPass + 1
            }
            
            this._reconcileVisibleRowsWithIndexes(visibleIndexes)
            this._layoutAllRows()
            if (Math.abs(viewportState.scrollTop - workingScrollTop) >= 0.01) {
                this.viewHTMLElement.scrollTop = workingScrollTop
            }
            this._layoutVisibleRowSubtrees()
            this._applyKeyboardFocusToVisibleRows()
            this._needsDrawingOfVisibleRowsBeforeLayout = NO
        }
        finally {
            this._isLayingOutRowsForViewport = NO
        }
    }
    
    _layoutVisibleRowsForCurrentViewport() {
        this._layoutRowsForCurrentViewport()
    }
    
    _scrollTopByPreservingAnchorRow(
        anchorRowIndex: number,
        anchorOffsetWithinRow: number,
        bottomDistance: number,
        preservesBottomPosition: boolean,
        viewportState: UITableViewViewportState
    ) {
        const contentHeight = this._estimatedContentHeight()
        const maximumScrollTop = Math.max(0, contentHeight - viewportState.viewportHeight)
        let result = 0
        if (preservesBottomPosition) {
            result = contentHeight - viewportState.viewportHeight - bottomDistance
        }
        else {
            const anchorPosition = this._rowPositionWithIndex(anchorRowIndex)
            result = anchorPosition.topY + anchorOffsetWithinRow - viewportState.visibleFrameTop
        }
        return Math.max(0, Math.min(result, maximumScrollTop))
    }
    
    _measureUnresolvedRowsWithIndexes(rowIndexes: number[]) {
        if (this.allRowsHaveEqualHeight) {
            return NO
        }
        const rowBounds = this.contentBounds.rectangleWithInsets(this.sidePadding, this.sidePadding, 0, 0)
        let didMeasureRows = NO
        this._isPreparingRowsForMeasurement = YES
        try {
            rowIndexes.forEach(rowIndex => {
                if (this._measuredRowHeights.has(rowIndex)) {
                    return
                }
                const row = this.visibleRowWithIndex(rowIndex) as UITableViewRowView | undefined
                if (!row) {
                    return
                }
                const position = this._rowPositionWithIndex(rowIndex)
                const measurementFrame = rowBounds.copy()
                measurementFrame.min.y = position.topY
                measurementFrame.max.y = position.bottomY
                row.frame = measurementFrame
                row._UITableViewRequiresLayout = YES
                row.clearIntrinsicSizeCache()
                const measuredHeight = this.heightForRowWithIndex(rowIndex)
                this._recordMeasuredHeightForRowWithIndex(measuredHeight, rowIndex)
                didMeasureRows = YES
            })
        }
        finally {
            this._isPreparingRowsForMeasurement = NO
        }
        return didMeasureRows
    }
    
    _layoutVisibleRowSubtrees() {
        this._isPreparingRowsForMeasurement = YES
        try {
            this._visibleRows.forEach(row => {
                const shouldLayoutRowSubtree = row._UITableViewRequiresLayout || row.needsLayout
                if (shouldLayoutRowSubtree) {
                    row.setNeedsLayout()
                    row.forEachViewInSubtree(view => {
                        const frame = view.isVirtualLayouting ? view._frameForVirtualLayouting : view._frame
                        if (frame) {
                            view._lastReportedHeight = frame.height.integerValue
                        }
                        view.layoutIfNeeded()
                    })
                }
                row._UITableViewRequiresLayout = NO
                if (IS_DEFINED(row._UITableViewWasHiddenBeforeLayout)) {
                    row.hidden = row._UITableViewWasHiddenBeforeLayout
                    delete row._UITableViewWasHiddenBeforeLayout
                }
            })
        }
        finally {
            this._isPreparingRowsForMeasurement = NO
        }
    }
    
    _scheduleDrawVisibleRows() {
        if (!this._isDrawVisibleRowsScheduled) {
            this._isDrawVisibleRowsScheduled = YES
            
            UIView.runFunctionBeforeNextFrame(() => {
                try {
                    this._layoutRowsForCurrentViewport()
                }
                finally {
                    this._isDrawVisibleRowsScheduled = NO
                }
            })
        }
    }
    
    _drawVisibleRows() {
        this._layoutRowsForCurrentViewport()
    }
    
    _reconcileVisibleRowsWithIndexes(visibleIndexes: number[]) {
        
        if (visibleIndexes.length === 0) {
            this._removeVisibleRows()
            return
        }
        
        const minIndex = visibleIndexes[0]
        const maxIndex = visibleIndexes[visibleIndexes.length - 1]
        
        const removedViews: UITableViewRowView[] = []
        const visibleRows: UITableViewRowView[] = []
        
        this._visibleRows.forEach((row) => {
            if (IS_DEFINED(row._UITableViewRowIndex) &&
                (row._UITableViewRowIndex < minIndex || row._UITableViewRowIndex > maxIndex)) {
                this._persistedData[row._UITableViewRowIndex] = this.persistenceDataItemForRowWithIndex(
                    row._UITableViewRowIndex,
                    row
                )
                if (!IS_DEFINED(row._UITableViewWasHiddenBeforeLayout)) {
                    row._UITableViewWasHiddenBeforeLayout = row.hidden
                }
                row.hidden = YES
                this._markReusableViewAsUnused(row)
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
            if (!IS_DEFINED(view._UITableViewWasHiddenBeforeLayout)) {
                view._UITableViewWasHiddenBeforeLayout = view.hidden
            }
            view.hidden = YES
            view._UITableViewRequiresLayout = YES
            this._visibleRows.push(view)
            if (view.superview !== this) {
                this.addSubview(view, undefined, NO)
            }
            view.tabIndex = -1
            view.forEachViewInSubtree(subview => {
                subview.tabIndex = -1
            })
        })
        
        removedViews.forEach(row => {
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
            
            view.configureWithObject({
                _UITableViewReusabilityIdentifier: identifier,
                _UITableViewRowIndex: rowIndex,
                
                // Extend clearIntrinsicSizeCache so that when the row (or any of its
                // subviews) invalidates its own size cache, the table is notified to
                // re-measure that specific row index. EXTEND preserves the original
                // implementation and appends this behaviour after it.
                clearIntrinsicSizeCache: EXTEND(() => {
                    const currentRowIndex = view._UITableViewRowIndex
                    if (IS_DEFINED(currentRowIndex) && view.isMemberOfViewTree) {
                        if (this._isAssigningRowFrames || this._isPreparingRowsForMeasurement ||
                            this._isLayingOutRowsForViewport) {
                            return
                        }
                        this._invalidateOnlySizeOfRowWithIndex(currentRowIndex)
                        this.setNeedsLayout()
                    }
                })
            })
            
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
        
        UIView._invalidateViewsWithValidPointers()
        
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
                if (this.disablesKeyboardNavigation) {
                    return
                }
                const target = event.target as HTMLElement | null
                if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
                    return
                }
                let walkedTarget = target
                while (walkedTarget && walkedTarget !== el) {
                    const viewObject = (walkedTarget as any).UIViewObject as UITableViewRowView | undefined
                    if (viewObject?._UITableViewRowIndex !== undefined) {
                        this._setKeyboardFocus(viewObject._UITableViewRowIndex, this._keyboardFocusedCellIndex)
                        el.focus({ preventScroll: true })
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
        if (!this.disablesKeyboardNavigation) {
            this._keyboardListenerElement.tabIndex = 0
        }
        
    }
    
    override setFrame(rectangle: UIRectangle, zIndex?: number, performUncheckedLayout?: boolean) {
        
        const frame = this.frame
        super.setFrame(rectangle, zIndex, performUncheckedLayout)
        if (frame.isEqualTo(rectangle) && !performUncheckedLayout) {
            return
        }
        if (frame.width !== rectangle.width && !this.allRowsHaveEqualHeight) {
            this._resetEstimatedRowHeightModel()
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
    }
    
    _layoutAllRows(positions = this._rowPositions) {
        
        const rowBounds = this.contentBounds.rectangleWithInsets(this.sidePadding, this.sidePadding, 0, 0)
        
        const sortedRows = this._visibleRows.sort(
            (rowA, rowB) => rowA._UITableViewRowIndex! - rowB._UITableViewRowIndex!
        )
        
        this._isAssigningRowFrames = YES
        try {
            let nextSiblingElement = this._fullHeightView.viewHTMLElement
            for (let index = sortedRows.length - 1; index >= 0; index--) {
                const row = sortedRows[index]
                const frame = rowBounds.copy()
                const positionObject = this._rowPositionWithIndex(row._UITableViewRowIndex!, positions)
                frame.min.y = positionObject.topY
                frame.max.y = positionObject.bottomY
                row.frame = frame
                row._lastReportedHeight = frame.height.integerValue
                row.viewHTMLElement.setAttribute("aria-rowindex", String((row._UITableViewRowIndex ?? 0) + 1))
                if (row.viewHTMLElement.nextSibling !== nextSiblingElement) {
                    this.viewHTMLElement.insertBefore(row.viewHTMLElement, nextSiblingElement)
                }
                nextSiblingElement = row.viewHTMLElement
            }
        }
        finally {
            this._isAssigningRowFrames = NO
        }
        this._assignFullHeightViewFrameForContentHeight(this._estimatedContentHeight())
        
    }
    
    _animateLayoutAllRows() {
        
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
    
    override didLayoutSubviews() {
        super.didLayoutSubviews()
    }
    
    
    override layoutSubviews() {
        
        if (this.isVirtualLayouting) {
            console.error("layout subviews called during virtual layouting on UITableView, " +
                "indicating a possible error in the layout system.")
            return
        }
        
        const previousPositions: UITableViewReusableViewPositionObject[] = []
        if (this.allRowsHaveEqualHeight && this.numberOfRows()) {
            previousPositions[0] = {
                ...this._rowPositionWithIndex(0)
            }
        }
        this._visibleRows.forEach(row => {
            if (IS_DEFINED(row._UITableViewRowIndex)) {
                previousPositions[row._UITableViewRowIndex] = {
                    ...this._rowPositionWithIndex(row._UITableViewRowIndex)
                }
            }
        })
        
        const previousVisibleRowsLength = this._visibleRows.length
        
        const hasRowsToLayout = this.numberOfRows() > 0 && this.isMemberOfViewTree
        if (hasRowsToLayout) {
            this._layoutRowsForCurrentViewport()
            if (this._shouldAnimateNextLayout) {
                // Reapply the animation's previous frames after calculating the
                // target frames and heights above.
                this._layoutAllRows(previousPositions)
            }
        }
        
        super.layoutSubviews()
        
        if (!hasRowsToLayout) {
            return
        }
        
        if (this._shouldAnimateNextLayout) {
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
