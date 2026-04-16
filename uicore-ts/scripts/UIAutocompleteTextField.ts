import { UIAutocompleteDropdownView } from "./UIAutocompleteDropdownView"
import { UIAutocompleteItem } from "./UIAutocompleteRowView"
import { IS, IS_NOT, NO, YES } from "./UIObject"
import { UITextField } from "./UITextField"
import { UIView, UIViewAddControlEventTargetObject } from "./UIView"


export class UIAutocompleteTextField<T = string> extends UITextField {
    
    _autocompleteItems: UIAutocompleteItem<T>[] = []
    _selectedItem?: UIAutocompleteItem<T>
    _dropdownView: UIAutocompleteDropdownView<T>
    _isDropdownOpen: boolean = NO
    _strictSelection: boolean = NO
    _isValid: boolean = YES
    
    /**
     * When YES, the filter text is split on whitespace and all words must appear
     * in the item label (AND logic). When NO (default), the full filter string is
     * matched as a single substring.
     */
    usesMultiWordAndSearch: boolean = NO
    
    
    static override controlEvent = Object.assign({}, UITextField.controlEvent, {
        "SelectionDidChange": "SelectionDidChange"
    })
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof UIAutocompleteTextField> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this._dropdownView = this.newDropdownView()
        
        this._dropdownView.didSelectItem = (item) => {
            this.commitSelection(item)
        }
        
        let textBeforeFocus = this.text
        let itemBeforeFocus = this.selectedItem
        // Open dropdown on focus
        this.controlEventTargetAccumulator.Focus = () => {
            textBeforeFocus = this.text
            itemBeforeFocus = this.selectedItem
            this.text = ""
            this.openDropdown()
            this.textElementView.viewHTMLElement.select()
            const matchIndex = this._dropdownView.filteredItems.findIndex(
                item => item.label === textBeforeFocus
            )
            if (matchIndex !== -1) {
                this._dropdownView.highlightedRowIndex = matchIndex
            }
        }
        
        // Close on blur
        this.controlEventTargetAccumulator.Blur = () => {
            this.closeDropdown()
        }
        
        // Filter on text change
        this.addTargetForControlEvent(UITextField.controlEvent.TextChange, () => {
            this._selectedItem = undefined
            this.updateFilteredItems()
            if (!this._isDropdownOpen) {
                this.openDropdown()
            }
        })
        
        // Keyboard navigation: down arrow
        this.textElementView.addTargetForControlEvent(UIView.controlEvent.DownArrowDown, (sender, event) => {
            event.preventDefault()
            if (!this._isDropdownOpen) {
                this.openDropdown()
                return
            }
            const maxIndex = this._dropdownView.filteredItems.length - 1
            if (this._dropdownView.highlightedRowIndex < maxIndex) {
                this._dropdownView.highlightedRowIndex = this._dropdownView.highlightedRowIndex + 1
            }
        })
        
        // Keyboard navigation: up arrow
        this.textElementView.addTargetForControlEvent(UIView.controlEvent.UpArrowDown, (sender, event) => {
            event.preventDefault()
            if (this._dropdownView.highlightedRowIndex > 0) {
                this._dropdownView.highlightedRowIndex = this._dropdownView.highlightedRowIndex - 1
            }
        })
        
        // Enter: commit focused item
        this.addTargetForControlEvent(UIView.controlEvent.EnterDown, () => {
            const highlightedItem = this._dropdownView.highlightedItem
            if (IS(highlightedItem)) {
                this.commitSelection(highlightedItem)
            }
            else if (this._isDropdownOpen) {
                this.closeDropdown()
            }
        })
        
        // Escape: dismiss dropdown
        this.addTargetForControlEvent(UIView.controlEvent.EscDown, () => {
            if (this._isDropdownOpen) {
                this.closeDropdown()
                if (this.strictSelection) {
                    this.commitSelection(itemBeforeFocus as any)
                }
                else {
                    this.text = textBeforeFocus
                }
            }
        })
        
    }
    
    
    /** Override in subclass to provide a custom dropdown view. */
    newDropdownView(): UIAutocompleteDropdownView<T> {
        return new UIAutocompleteDropdownView<T>(
            this.elementID ? this.elementID + "Dropdown" : undefined
        )
    }
    
    
    // MARK: - Selection
    
    get selectedItem(): T | undefined {
        return this._selectedItem?.value
    }
    
    
    get strictSelection(): boolean {
        return this._strictSelection
    }
    
    set strictSelection(strict: boolean) {
        this._strictSelection = strict
        this.updateValidationVisuals()
    }
    
    
    commitSelection(item: UIAutocompleteItem<T>) {
        
        this.blur()
        this._selectedItem = item
        this.text = item.label
        this.closeDropdown()
        this.updateValidationVisuals()
        this.sendControlEventForKey(UIAutocompleteTextField.controlEvent.SelectionDidChange)
        
    }
    
    
    // MARK: - Data
    
    /** Convenience: set string suggestions. Each string becomes { label: s, value: s }. */
    set autocompleteStrings(strings: string[]) {
        this._autocompleteItems = strings.map(s => ({
            label: s,
            value: s as unknown as T
        }))
        this.updateFilteredItems()
    }
    
    get autocompleteStrings(): string[] {
        return this._autocompleteItems.map(item => item.label)
    }
    
    set autocompleteData(items: UIAutocompleteItem<T>[]) {
        this._autocompleteItems = items
        this.updateFilteredItems()
    }
    
    get autocompleteData(): UIAutocompleteItem<T>[] {
        return this._autocompleteItems
    }
    
    
    // MARK: - Filtering
    
    /**
     * Splits the given lowercase-trimmed filter text into individual words when
     * usesMultiWordAndSearch is YES, or returns it as a single-element array otherwise.
     * Returns an empty array when the input is empty.
     */
    _filterWordsFromText(filterText: string): string[] {
        if (filterText.length === 0) {
            return []
        }
        if (this.usesMultiWordAndSearch) {
            return filterText.split(/\s+/).filter(word => word.length > 0)
        }
        return [filterText]
    }
    
    
    /**
     * Returns true when the given label (already lowercased) satisfies all filter
     * words — i.e. every word appears somewhere in the label.
     */
    _labelMatchesFilterWords(label: string, filterWords: string[]): boolean {
        return filterWords.every(word => label.includes(word))
    }
    
    
    updateFilteredItems() {
        
        const rawFilterText = this.text.toLowerCase().trim()
        const filterWords = this._filterWordsFromText(rawFilterText)
        
        let filtered: UIAutocompleteItem<T>[]
        
        if (filterWords.length === 0) {
            filtered = this._autocompleteItems
        }
        else {
            filtered = this._autocompleteItems.filter(item =>
                this._labelMatchesFilterWords(item.label.toLowerCase(), filterWords)
            )
        }
        
        // If the only remaining result is an exact match for the current text,
        // the user has already made their selection — no need to show the dropdown.
        const isExactSingleMatch = filtered.length === 1 &&
            filtered[0].label.toLowerCase() === rawFilterText
        
        this._dropdownView.filteredItems = isExactSingleMatch ? [] : filtered
        
        if (this._dropdownView.filteredItems.length > 0) {
            this._dropdownView.highlightedRowIndex = 0
        }
        
        if (this._isDropdownOpen) {
            this._dropdownView.showAnchoredToView(this)
        }
        
    }
    
    
    // MARK: - Dropdown Lifecycle
    
    openDropdown() {
        
        if (this._isDropdownOpen) {
            return
        }
        
        this._isDropdownOpen = YES
        this.updateFilteredItems()
        this._dropdownView.showAnchoredToView(this)
        
    }
    
    closeDropdown() {
        
        if (!this._isDropdownOpen) {
            return
        }
        
        this._isDropdownOpen = NO
        this._dropdownView.dismiss()
        
        // In strict mode, clear text if it doesn't match any item
        if (this._strictSelection && IS_NOT(this._selectedItem)) {
            const currentText = this.text.trim()
            if (currentText.length > 0) {
                const matchingItem = this._autocompleteItems.find(
                    item => item.label === currentText
                )
                if (IS(matchingItem)) {
                    this._selectedItem = matchingItem
                }
                else {
                    this.text = ""
                    this._selectedItem = undefined
                }
            }
        }
        
        this.updateValidationVisuals()
        
    }
    
    
    // MARK: - Validation
    
    /** Whether the current text is valid given the strictSelection setting. */
    get isValid(): boolean {
        
        if (!this._strictSelection) {
            return YES
        }
        
        const currentText = this.text.trim()
        
        if (currentText.length === 0) {
            return YES
        }
        
        return this._autocompleteItems.some(item => item.label === currentText)
        
    }
    
    
    /**
     * Hook for subclasses to apply custom visual styling based on validation state.
     * Called after dropdown closes and after selection changes.
     */
    updateValidationVisuals() {
        // Base implementation does nothing. Subclasses override.
    }
    
    
    // MARK: - Cleanup
    
    override wasRemovedFromViewTree() {
        
        super.wasRemovedFromViewTree()
        
        this._dropdownView.removeFromSuperview()
        
    }
    
    
    // MARK: - Layout
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        if (this._isDropdownOpen) {
            this._dropdownView.showAnchoredToView(this)
        }
        
    }
    
    
}

