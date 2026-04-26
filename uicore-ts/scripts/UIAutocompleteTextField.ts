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
    // Set to YES only when the user has explicitly interacted with the dropdown
    // (typed text or navigated with arrow keys). Prevents Tab-to-focus from
    // auto-committing the first item.
    _userHasNavigatedDropdown: boolean = NO
    
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
        
        // Open dropdown on focus.
        // If a selection is already committed we keep the confirmed text visible
        // and do not clear it — this covers Tab-into-field after a prior selection,
        // as well as returning focus after commitSelection.
        this.controlEventTargetAccumulator.Focus = () => {
            textBeforeFocus = this.text
            itemBeforeFocus = this.selectedItem
            this._userHasNavigatedDropdown = NO
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
            this._userHasNavigatedDropdown = this.text.length > 0
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
            this._userHasNavigatedDropdown = YES
            const maxIndex = this._dropdownView.filteredItems.length - 1
            if (this._dropdownView.highlightedRowIndex < maxIndex) {
                this._dropdownView.highlightedRowIndex = this._dropdownView.highlightedRowIndex + 1
            }
        })
        
        // Keyboard navigation: up arrow
        this.textElementView.addTargetForControlEvent(UIView.controlEvent.UpArrowDown, (sender, event) => {
            event.preventDefault()
            this._userHasNavigatedDropdown = YES
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
        
        // Tab: commit highlighted item only if the user has explicitly interacted
        // with the dropdown (typed or used arrow keys). This prevents tabbing
        // through the form from silently committing the first suggestion.
        // When the user has not navigated, we do NOT consume the event — the
        // dropdown will close via the Blur handler and RHPageFocusManager will
        // handle the Tab navigation normally.
        this.addTargetForControlEvent(UIView.controlEvent.TabDown, (sender, event) => {
            if (this._isDropdownOpen && this._userHasNavigatedDropdown) {
                const highlightedItem = this._dropdownView.highlightedItem
                if (IS(highlightedItem)) {
                    event.preventDefault()
                    this.commitSelection(highlightedItem)
                }
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
        
        // Set the selection state and close the dropdown without blurring.
        // Keeping focus on this view means the next Tab press is handled by
        // our TabDown handler rather than being picked up natively by the browser.
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
    
    
    /**
     * Returns true when the character immediately before `position` in `label`
     * is a word separator (or the position is at the start of the string).
     * Used to give a bonus to matches that start at a word boundary.
     */
    _isWordBoundary(label: string, position: number): boolean {
        if (position === 0) {
            return YES
        }
        const charBefore = label[position - 1]
        return " -/\\|._,;:()[]".includes(charBefore)
    }
    
    
    /**
     * Scores a label against the filter words. Lower score = better match.
     *
     * Scoring factors (in priority order):
     *   1. Non-sequential penalty — words must appear in typed order to avoid
     *      a large penalty that pushes them below all sequential matches.
     *   2. Per-word boundary score — for each filter word, a mid-word match
     *      scores worse than a word-boundary match. The sum across all words
     *      determines the boundary tier.
     *   3. Position of the first matched word — within the same boundary tier,
     *      earlier appearances rank higher.
     *   4. Total label length — shorter labels are more specific (tiebreaker).
     *
     * Example: query "põ pu"
     *   "Põhjavee puhastusvahendid"   → "põ" at boundary(0), "pu" at boundary(9) → low boundary score
     *   "põrandapuhastusvahendid"     → "põ" at boundary(0), "pu" mid-word(7)    → higher boundary score
     *   → "Põhjavee puhastusvahendid" ranks first.
     */
    _scoreLabel(label: string, filterWords: string[]): number {
        
        if (filterWords.length === 0) {
            return label.length
        }
        
        // --- Sequential check ---
        // Scan left-to-right; if all words appear in order record the positions.
        let cursor = 0
        let isSequential = YES
        const sequentialPositions: number[] = []
        for (const word of filterWords) {
            const position = label.indexOf(word, cursor)
            if (position === -1) {
                isSequential = NO
                break
            }
            sequentialPositions.push(position)
            cursor = position + word.length
        }
        
        // --- Boundary score ---
        // For each filter word find its best (leftmost) match and check whether
        // it lands on a word boundary. Non-boundary matches incur a per-word
        // penalty of 1, so the boundary score is 0..filterWords.length.
        let boundaryScore = 0
        for (const word of filterWords) {
            const position = label.indexOf(word)
            if (position !== -1 && !this._isWordBoundary(label, position)) {
                boundaryScore += 1
            }
        }
        
        // Position of the first word's earliest match.
        const firstMatchPosition = label.indexOf(filterWords[0])
        
        // Compose score — each tier must not overflow into the next:
        //   Non-sequential penalty : 10 000 000  (dominates everything)
        //   Boundary score         :     10 000  (per word, max ~10 words → 100 000 max, safe)
        //   First-match position   :        100  (labels rarely exceed 200 chars)
        //   Label length           :          1  (tiebreaker)
        const sequentialPenalty = isSequential ? 0 : 10_000_000
        
        return sequentialPenalty +
            boundaryScore * 10_000 +
            firstMatchPosition * 100 +
            label.length
        
    }
    
    
    updateFilteredItems() {
        
        const rawFilterText = this.text.toLowerCase().trim()
        const filterWords = this._filterWordsFromText(rawFilterText)
        
        let filtered: UIAutocompleteItem<T>[]
        
        if (filterWords.length === 0) {
            filtered = this._autocompleteItems
        }
        else {
            filtered = this._autocompleteItems
                .filter(item => this._labelMatchesFilterWords(item.label.toLowerCase(), filterWords))
                .map((item, originalIndex) => ({ item, originalIndex, score: this._scoreLabel(item.label.toLowerCase(), filterWords) }))
                .sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex)
                .map(({ item }) => item)
        }
        
        // If the only remaining result is an exact match for the current text,
        // the user has already made their selection — no need to show the dropdown.
        const isExactSingleMatch = filtered.length === 1 &&
            filtered[0].label.toLowerCase() === rawFilterText
        
        this._dropdownView.filterWords = filterWords
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
        this._dropdownView.filterWords = []
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
                    this.sendControlEventForKey(UITextField.controlEvent.TextChange)
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
