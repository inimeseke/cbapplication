// noinspection JSConstantReassignment

import { UIAutocompleteItem, UIAutocompleteRowView } from "./UIAutocompleteRowView"
import { UIColor } from "./UIColor"
import { IS, IS_NOT, NO, YES } from "./UIObject"
import { UIRectangle } from "./UIRectangle"
import { UITableView } from "./UITableView"
import { UIView } from "./UIView"


export class UIAutocompleteDropdownView<T> extends UIView {
    
    tableView: UITableView
    _fullHeightView: UIView
    
    _filteredItems: UIAutocompleteItem<T>[] = []
    _highlightedRowIndex: number = -1
    _rowHeight: number = 36
    _maxVisibleRows: number = 8
    _isPointerInsideDropdown: boolean = NO
    _suppressHoverHighlight: boolean = NO
    
    didSelectItem?: (item: UIAutocompleteItem<T>) => void
    anchorView?: UIView
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this.hidden = YES
        this.userInteractionEnabled = YES
        
        this.backgroundColor = UIColor.whiteColor
        this.setBorder(0, 1)
        this.style.boxSizing = "content-box"
        
        this.tableView = new UITableView(elementID ? elementID + "TableView" : undefined)
        this.addSubview(this.tableView)
        
        this.tableView.allRowsHaveEqualHeight = YES
        this.tableView.numberOfRows = () => this._filteredItems.length
        this.tableView.heightForRowWithIndex = () => this._rowHeight
        this.tableView.newReusableViewForIdentifier = (identifier, rowIndex) => this.newRowView(identifier, rowIndex)
        this.tableView.viewForRowWithIndex = (index) => this.viewForRowWithIndex(index)
        
        // A transparent full-height view so the native scrollbar reflects the total
        // content height rather than just the virtualised visible rows.
        this._fullHeightView = new UIView(elementID ? elementID + "FullHeightView" : undefined)
        this._fullHeightView.userInteractionEnabled = NO
        this.tableView.addSubview(this._fullHeightView)
        
        // Use a native mousemove listener on the tableView element so we catch movement
        // regardless of which child row the pointer is over (framework events don't bubble
        // up through the scroll container from its row children).
        this.tableView.viewHTMLElement.addEventListener("mousemove", () => {
            this._suppressHoverHighlight = NO
        })
        
    }
    
    
    /** Override in subclass to provide custom row views. */
    newRowView(identifier: string, rowIndex: number): UIAutocompleteRowView<T> {
        return new UIAutocompleteRowView<T>(this.elementID + identifier + rowIndex)
    }
    
    
    viewForRowWithIndex(index: number): UIView {
        
        const row = this.tableView.reusableViewForIdentifier(
            "AutocompleteRow",
            index
        ) as UIAutocompleteRowView<T>
        
        const item = this._filteredItems[index]
        if (IS(item)) {
            row.item = item
        }
        
        // Reflect current keyboard highlight state via the native selected flag.
        row.selected = (index === this._highlightedRowIndex)
        
        // PointerHover fires as the pointer moves over the row.
        // We suppress scroll-into-view since the user is already looking at the row.
        // We also suppress highlight changes after a keyboard-triggered scroll, until
        // the pointer actually moves (PointerMove clears the suppression flag).
        const rowWasHovered = () => {
            if (this._suppressHoverHighlight) {
                return
            }
            this._setHighlightedRowIndex(index, NO)
        }
        if ((row as any)._autocompleteHoverHandler) {
            row.removeTargetForControlEvent(
                UIView.controlEvent.PointerHover,
                (row as any)._autocompleteHoverHandler
            )
        }
        row.controlEventTargetAccumulator.PointerHover = rowWasHovered;
        (row as any)._autocompleteHoverHandler = rowWasHovered
        
        // Clicking a row selects it.
        const rowWasTapped = () => {
            if (IS(item) && this.didSelectItem) {
                this.didSelectItem(item)
            }
        }
        if ((row as any)._autocompleteTapHandler) {
            row.removeTargetForControlEvent(
                UIView.controlEvent.PointerUpInside,
                (row as any)._autocompleteTapHandler
            )
        }
        row.controlEventTargetAccumulator.PointerUpInside = rowWasTapped;
        (row as any)._autocompleteTapHandler = rowWasTapped
        
        return row
        
    }
    
    
    get highlightedRowIndex(): number {
        return this._highlightedRowIndex
    }
    
    set highlightedRowIndex(index: number) {
        this._setHighlightedRowIndex(index, YES)
    }
    
    
    /** Internal setter. scrollIntoView=YES for keyboard navigation, NO for pointer hover. */
    _setHighlightedRowIndex(index: number, scrollIntoView: boolean) {
        
        const previousIndex = this._highlightedRowIndex
        this._highlightedRowIndex = index
        
        // Clear selected state on previous row.
        const previousRow = this.tableView.visibleRowWithIndex(previousIndex) as
            UIAutocompleteRowView<T> | undefined
        if (IS(previousRow)) {
            previousRow.selected = NO
        }
        
        // Set selected state on newly highlighted row.
        const currentRow = this.tableView.visibleRowWithIndex(index) as
            UIAutocompleteRowView<T> | undefined
        if (IS(currentRow)) {
            currentRow.selected = YES
            
            if (scrollIntoView) {
                // Scroll the view if needed
                let contentOffset = this.tableView.contentOffset
                if (currentRow.frame.y < contentOffset.y) {
                    contentOffset.y = currentRow.frame.y
                }
                if (currentRow.frame.max.y > (contentOffset.y + this.tableView.bounds.height)) {
                    contentOffset = contentOffset.pointByAddingY(-(contentOffset.y + this.tableView.bounds.height -
                        currentRow.frame.max.y))
                }
                const animationDuration = this.tableView.animationDuration
                this.tableView.animationDuration = 0
                this.tableView.contentOffset = contentOffset
                this.tableView.animationDuration = animationDuration
                
                // Suppress hover-driven highlight changes until the user physically
                // moves the mouse — the native mousemove listener on the tableView
                // element clears this flag when actual movement is detected.
                this._suppressHoverHighlight = YES
            }
        }
        
    }
    
    
    get highlightedItem(): UIAutocompleteItem<T> | undefined {
        if (this._highlightedRowIndex >= 0 && this._highlightedRowIndex < this._filteredItems.length) {
            return this._filteredItems[this._highlightedRowIndex]
        }
        return undefined
    }
    
    
    set filteredItems(items: UIAutocompleteItem<T>[]) {
        this._filteredItems = items
        this._highlightedRowIndex = -1
        this.tableView.reloadData()
        this.hidden = (items.length === 0)
        this._updateFullHeightView()
        this.setNeedsLayout()
    }
    
    get filteredItems(): UIAutocompleteItem<T>[] {
        return this._filteredItems
    }
    
    
    /** Anchors this dropdown below the given field view inside the rootView. */
    showAnchoredToView(anchorView: UIView) {
        
        this.anchorView = anchorView
        
        this.calculateAndSetViewFrame = () => {
            
            const rootView = anchorView.rootView
            
            const padding = anchorView.core.paddingLength
            
            if (!this.superview || this.superview !== rootView) {
                this.removeFromSuperview()
                rootView.addSubview(this)
            }
            
            const fieldFrameInRoot = (this.anchorView?.superview?.rectangleInView(
                this.anchorView?.frame,
                rootView
            ) as UIRectangle)
                .rectangleByAddingX(padding)
                .rectangleByAddingY(padding)
            
            if (IS_NOT(fieldFrameInRoot)) {
                return
            }
            
            const dropdownHeight = Math.min(
                this._filteredItems.length * this._rowHeight,
                this._maxVisibleRows * this._rowHeight
            )
            
            
            this.frame = fieldFrameInRoot.rectangleForNextRow(0, dropdownHeight)
            
        }
        
        this.setNeedsLayoutUpToRootView()
        this.calculateAndSetViewFrame()
        
        this.style.zIndex = "10000"
        this.hidden = (this._filteredItems.length === 0)
        
    }
    
    
    dismiss() {
        this.hidden = YES
        this._highlightedRowIndex = -1
        this._isPointerInsideDropdown = NO
    }
    
    
    _updateFullHeightView() {
        const totalHeight = this._filteredItems.length * this._rowHeight
        this._fullHeightView.frame = this._fullHeightView.frame
            .rectangleWithY(0)
            .rectangleWithHeight(totalHeight)
            .rectangleWithWidth(1)
        this._fullHeightView.hasWeakFrame = YES
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const bounds = this.contentBounds
        this.tableView.frame = bounds
        this._updateFullHeightView()
        
    }
    
    
}



