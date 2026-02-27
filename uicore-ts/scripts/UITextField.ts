import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import { nil, NO, ValueOf, YES } from "./UIObject"
import { UITextView } from "./UITextView"
import { UIView, UIViewAddControlEventTargetObject, UIViewBroadcastEvent } from "./UIView"


export class UITextField extends UITextView {
    
    _placeholderTextKey?: string
    _defaultPlaceholderText?: string
    
    override _viewHTMLElement!: HTMLInputElement
    
    // --- Native Autocomplete (HTML datalist) ---
    
    _datalistElement?: HTMLDataListElement
    _nativeAutocompleteData: string[] = []
    _hasCommittedSelection: boolean = NO
    
    /** Minimum characters required before showing autocomplete suggestions */
    minCharactersForAutocomplete: number = 0
    
    /**
     * When YES, hides the datalist if the current text exactly matches
     * a single autocomplete option (avoids showing redundant single suggestion).
     * Default is YES for better UX.
     */
    hideNativeAutocompleteOnExactMatch: boolean = YES
    
    // --- Validation against autocomplete list ---
    
    _validatesAgainstNativeAutocomplete: boolean = NO
    _isValidAgainstNativeAutocomplete: boolean = YES
    _validationInvalidBackgroundColor = UIColor.redColor.colorWithAlpha(0.5)
    _validationInvalidBorderColor = UIColor.colorWithRGBA(200, 0, 0, 0.5)
    
    
    static override controlEvent = Object.assign({}, UITextView.controlEvent, {
        
        "TextChange": "TextChange",
        "ValidationChange": "ValidationChange"
        
    })
    
    
    constructor(
        elementID?: string,
        viewHTMLElement = null,
        type: string | ValueOf<typeof UITextView.type> = UITextView.type.textField
    ) {
        
        super(elementID, type, viewHTMLElement)
        
        this.textElementView.viewHTMLElement.setAttribute("type", "text")
        this.backgroundColor = UIColor.transparentColor
        this.addTargetForControlEvent(
            UIView.controlEvent.PointerUpInside,
            (sender, event) => sender.focus()
        )
        this.textElementView.viewHTMLElement.oninput = (event) => {
            this._hasCommittedSelection = NO
            this.sendControlEventForKey(UITextField.controlEvent.TextChange, event)
            this._validateAgainstNativeAutocompleteIfNeeded()
            this._updateDatalistVisibility()
        }
        this.textElementView.viewHTMLElement.onchange = (event) => {
            this.sendControlEventForKey(UITextField.controlEvent.TextChange, event)
            // Fires when the user commits a selection from the datalist (enter or click).
            // Regular typing does not trigger onchange, only committing a value does.
            if (this._datalistElement && this._nativeAutocompleteData.includes(this.text)) {
                this._hasCommittedSelection = YES
                this._updateDatalistVisibility()
            }
            // Validate on change (commit) when validation is enabled
            this._validateAgainstNativeAutocompleteIfNeeded()
        }
        this.textElementView.controlEventTargetAccumulator.Blur = (sender, event) => {
            // Final validation when leaving the field
            this._validateAgainstNativeAutocompleteIfNeeded()
        }
        this.textElementView.style.webkitUserSelect = "text"
        this.nativeSelectionEnabled = YES
        this.pausesPointerEvents = NO
        this.changesOften = YES
        
    }
    
    
    override get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof UITextField> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    public override get viewHTMLElement() {
        return this._viewHTMLElement
    }
    
    
    public override set text(text: string) {
        this.textElementView.viewHTMLElement.value = text
        // Re-validate when text is set programmatically
        this._validateAgainstNativeAutocompleteIfNeeded()
        this._updateDatalistVisibility()
    }
    
    public override get text(): string {
        return this.textElementView.viewHTMLElement.value
    }
    
    
    public set placeholderText(text: string) {
        this.textElementView.viewHTMLElement.placeholder = text
    }
    
    public get placeholderText(): string {
        return this.textElementView.viewHTMLElement.placeholder
    }
    
    
    setPlaceholderText(key: string, defaultString: string) {
        
        this._placeholderTextKey = key
        this._defaultPlaceholderText = defaultString
        
        const languageName = UICore.languageService.currentLanguageKey
        this.placeholderText = UICore.languageService.stringForKey(key, languageName, defaultString, nil)
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.LanguageChanged || event.name ==
            UIView.broadcastEventName.AddedToViewTree) {
            
            this._setPlaceholderFromKeyIfPossible()
            
        }
        
    }
    
    
    override willMoveToSuperview(superview: UIView) {
        
        super.willMoveToSuperview(superview)
        
        this._setPlaceholderFromKeyIfPossible()
        
    }
    
    _setPlaceholderFromKeyIfPossible() {
        
        if (this._placeholderTextKey && this._defaultPlaceholderText) {
            
            this.setPlaceholderText(this._placeholderTextKey, this._defaultPlaceholderText)
            
        }
        
    }
    
    
    public get isSecure(): boolean {
        const result = (this.textElementView.viewHTMLElement.type == "password")
        return result
    }
    
    public set isSecure(secure: boolean) {
        let type = "text"
        if (secure) {
            type = "password"
        }
        this.textElementView.viewHTMLElement.type = type
    }
    
    
    // MARK: - Native Autocomplete Methods
    
    /**
     * Sets the data for native browser autocomplete using HTML datalist.
     * Setting an empty array will remove the autocomplete functionality.
     *
     * @param data Array of strings to show as autocomplete suggestions
     */
    public set nativeAutocompleteData(data: string[]) {
        this._nativeAutocompleteData = data
        this._hasCommittedSelection = NO
        this._updateDatalist()
        this._validateAgainstNativeAutocompleteIfNeeded()
        this._updateDatalistVisibility()
    }
    
    public get nativeAutocompleteData(): string[] {
        return this._nativeAutocompleteData
    }
    
    // MARK: - Validation Methods
    
    /**
     * When enabled, the text field will validate its content against the autocomplete list.
     * Invalid values will trigger a ValidationChange event and can be checked via isValidAgainstAutocomplete.
     *
     * Empty text is always considered valid (use required field validation separately if needed).
     */
    public set validatesAgainstNativeAutocomplete(validate: boolean) {
        if (this._validatesAgainstNativeAutocomplete !== validate) {
            this._validatesAgainstNativeAutocomplete = validate
            this._validateAgainstNativeAutocompleteIfNeeded()
        }
    }
    
    public get validatesAgainstNativeAutocomplete(): boolean {
        return this._validatesAgainstNativeAutocomplete
    }
    
    /**
     * Returns YES if the current text value is valid according to autocomplete validation.
     * Always returns YES if validatesAgainstAutocomplete is disabled.
     * Empty text is considered valid.
     */
    public get isValidAgainstNativeAutocomplete(): boolean {
        return this._isValidAgainstNativeAutocomplete
    }
    
    /**
     * Background color to apply when validation fails.
     * Set to nil to disable background color change on invalid state.
     */
    public set validationInvalidBackgroundColor(color: UIColor) {
        this._validationInvalidBackgroundColor = color
        this._updateValidationVisualState()
    }
    
    public get validationInvalidBackgroundColor(): UIColor {
        return this._validationInvalidBackgroundColor
    }
    
    /**
     * Border color to apply when validation fails.
     * Set to nil to disable border color change on invalid state.
     */
    public set validationInvalidBorderColor(color: UIColor) {
        this._validationInvalidBorderColor = color
        this._updateValidationVisualState()
    }
    
    public get validationInvalidBorderColor(): UIColor {
        return this._validationInvalidBorderColor
    }
    
    /**
     * Validates the current text against the autocomplete list if validation is enabled.
     * Updates the _isValidAgainstAutocomplete flag and fires ValidationChange event on state change.
     */
    _validateAgainstNativeAutocompleteIfNeeded() {
        if (!this._validatesAgainstNativeAutocomplete) {
            this._setValidationState(YES)
            return
        }
        
        const currentText = this.text
        
        // Empty text is considered valid (use separate required validation if needed)
        if (currentText.length === 0) {
            this._setValidationState(YES)
            return
        }
        
        const isValid = this._nativeAutocompleteData.includes(currentText)
        this._setValidationState(isValid)
    }
    
    _setValidationState(isValid: boolean) {
        const wasValid = this._isValidAgainstNativeAutocomplete
        this._isValidAgainstNativeAutocomplete = isValid
        
        // Update visual state
        this._updateValidationVisualState()
        
        // Fire event only on state change
        if (wasValid !== isValid) {
            this.sendControlEventForKey(UITextField.controlEvent.ValidationChange)
        }
    }
    
    /**
     * Updates the visual state of the text field based on validation status.
     * Override this method to customize validation styling.
     */
    _updateValidationVisualState() {
        const inputElement = this.textElementView.viewHTMLElement
        
        if (!this._validatesAgainstNativeAutocomplete || this._isValidAgainstNativeAutocomplete) {
            // Restore normal state - clear validation-specific styles
            inputElement.classList.remove("autocomplete-invalid")
            
            // Reset to default colors if we had set validation colors
            if (this._validationInvalidBackgroundColor) {
                inputElement.style.removeProperty("background-color")
            }
            if (this._validationInvalidBorderColor) {
                inputElement.style.removeProperty("border-color")
            }
        } else {
            // Apply invalid state
            inputElement.classList.add("autocomplete-invalid")
            
            // Apply validation colors if set
            if (this._validationInvalidBackgroundColor) {
                inputElement.style.backgroundColor = this._validationInvalidBackgroundColor.stringValue
            }
            if (this._validationInvalidBorderColor) {
                inputElement.style.borderColor = this._validationInvalidBorderColor.stringValue
            }
        }
    }
    
    /**
     * Clears the text field if the current value is not in the autocomplete list.
     * Useful for enforcing selection from the list only.
     * @returns YES if the text was cleared (was invalid), NO otherwise
     */
    public clearIfInvalid(): boolean {
        if (this._validatesAgainstNativeAutocomplete && !this._isValidAgainstNativeAutocomplete && this.text.length > 0) {
            this.text = ""
            return YES
        }
        return NO
    }
    
    /**
     * Returns a list of autocomplete options that match the current text (case-insensitive).
     * Useful for implementing custom filtering or showing filtered results elsewhere.
     */
    public getMatchingAutocompleteOptions(): string[] {
        const currentText = this.text
        if (currentText.length === 0) {
            return [...this._nativeAutocompleteData]
        }
        return this._getFilteredAutocompleteOptions(currentText)
    }
    
    // MARK: - Datalist Management
    
    _updateDatalist() {
        // If no data, remove the datalist
        if (this._nativeAutocompleteData.length === 0) {
            if (this._datalistElement) {
                this._datalistElement.remove()
                this.textElementView.viewHTMLElement.removeAttribute("list")
                this._datalistElement = undefined
            }
            return
        }
        
        // Create datalist if it doesn't exist
        if (!this._datalistElement) {
            const datalistId = this.elementID + "_datalist"
            this._datalistElement = document.createElement("datalist")
            this._datalistElement.id = datalistId
            // Add datalist as a sibling to the text element within this view's container
            this.viewHTMLElement.appendChild(this._datalistElement)
            this.textElementView.viewHTMLElement.setAttribute("list", datalistId)
        }
        
        // Update the options
        this._datalistElement.innerHTML = ""
        this._nativeAutocompleteData.forEach(item => {
            const option = document.createElement("option")
            option.value = item
            this._datalistElement!.appendChild(option)
        })
    }
    
    _updateDatalistVisibility() {
        if (!this._datalistElement) {
            return
        }
        
        // After the user has picked a value from the list, hide suggestions until
        // they start typing again. oninput clears _hasCommittedSelection, so this
        // gate only holds for exactly as long as the selection stands untouched.
        if (this._hasCommittedSelection) {
            this.textElementView.viewHTMLElement.removeAttribute("list")
            return
        }
        
        const currentText = this.text
        
        // Check minimum character requirement
        if (this.minCharactersForAutocomplete > 0 &&
            currentText.length < this.minCharactersForAutocomplete) {
            this.textElementView.viewHTMLElement.removeAttribute("list")
            return
        }
        
        // Hide datalist when it would show only a single redundant option
        if (this.hideNativeAutocompleteOnExactMatch && currentText.length > 0) {
            // Count how many options would be offered (browser uses starts-with logic)
            const matchingOptions = this._nativeAutocompleteData.filter(item =>
                item.toLowerCase().startsWith(currentText.toLowerCase()) ||
                currentText.toLowerCase().startsWith(item.toLowerCase())
            )
            
            // If only one option matches, it's redundant - hide the datalist
            if (matchingOptions.length === 1) {
                this.textElementView.viewHTMLElement.removeAttribute("list")
                return
            }
        }
        
        // Show the datalist
        this.textElementView.viewHTMLElement.setAttribute("list", this._datalistElement.id)
    }
    
    /**
     * Returns autocomplete options that match the given search text.
     * Uses case-insensitive substring matching (consistent with browser behavior).
     */
    _getFilteredAutocompleteOptions(searchText: string): string[] {
        const searchLower = searchText.toLowerCase()
        return this._nativeAutocompleteData.filter(item =>
            item.toLowerCase().includes(searchLower)
        )
    }
    
    override wasRemovedFromViewTree() {
        
        super.wasRemovedFromViewTree()
        
        // Clean up datalist element when text field is removed
        if (this._datalistElement) {
            this._datalistElement.remove()
            this._datalistElement = undefined
        }
        
    }
    
    
}
