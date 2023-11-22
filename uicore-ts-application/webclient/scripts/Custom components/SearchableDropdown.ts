import { CBSocketClient, SocketClient } from "cbcore-ts"
import { CBDropdownDataItem } from "cbcore-ts/compiledScripts/CBDataInterfaces"
import {
    FIRST, FIRST_OR_NIL,
    IS,
    IS_NOT,
    IS_UNDEFINED,
    MAKE_ID,
    nil,
    NO,
    UIButton,
    UIColor,
    UIDialogView,
    UIImageView,
    UIKeyValueStringFilter,
    UILocalizedTextObject, UIRectangle,
    UITableView,
    UITextView,
    UIView,
    UIViewAddControlEventTargetObject,
    YES
} from "uicore-ts"
import { LanguageService } from "../LanguageService"
import { CBColor } from "./CBColor"
import { SearchableDropdownRow } from "./SearchableDropdownRow"
import { SearchTextField } from "./SearchTextField"


export class SearchableDropdown<T> extends UIButton {
    
    _keyValueStringFilter: UIKeyValueStringFilter
    _containerView: UIView
    _searchTextField: SearchTextField
    _dialogView: UIDialogView
    _tableView: UITableView
    _rightImageView: UIImageView
    
    _data: CBDropdownDataItem<T>[] = []
    _filteredData: CBDropdownDataItem<T>[] = []
    
    _excludedData: string[] = []
    
    tintColor: UIColor = CBColor.primaryTintColor
    
    overflowLabel: UITextView
    selectedIndices: number[] = []
    _selectedData: CBDropdownDataItem<T>[] = []
    _drawingData: CBDropdownDataItem<T>[] = []
    
    _isDrawingDataValid = NO
    _placeholderText?: string
    _expandedContainerViewHeight?: number
    
    isSingleSelection = NO
    showsSelectedSectionInMultipleSelectionMode = NO
    _dropdownCode: string = ""
    
    allowsCustomItem = NO
    _customItem?: CBDropdownDataItem<any>
    _focusedRowIndex: number | undefined | null
    
    keepFocusedRowVisible = YES
    _placeholderLocalizedTextObject?: UILocalizedTextObject
    
    dialogContainerView: UIView = nil
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        //this.style.borderRadius = "2px";
        
        if (this._titleLabel) {
            this._titleLabel.text = "Current value"
            this._titleLabel.textAlignment = UITextView.textAlignment.left
        }
        
        this.overflowLabel = new UITextView(this.elementID + "OverflowLabel")
        this.overflowLabel.textColor = CBColor.primaryContentColor
        this.overflowLabel.textAlignment = UITextView.textAlignment.right
        this.addSubview(this.overflowLabel)
        
        this._rightImageView = new UIImageView(this.elementID + "RightImageView")
        this._rightImageView.imageSource = "images/baseline-arrow_drop_down-24px.svg"
        this._rightImageView.userInteractionEnabled = NO
        this.addSubview(this._rightImageView)
        
        this.setNeedsLayout()
        
        this._containerView = new UIView(this.elementID + "ContainerView")
        this._containerView.style.boxShadow = "0 9px 13px 0 rgba(0,0,0,0.26)"
        this._containerView.style.borderRadius = "2px"
        
        this._searchTextField = new SearchTextField(this.elementID + "SearchTextField")
        this._searchTextField.placeholderText = LanguageService.stringForKey(
            "searchableDropdownSearch",
            LanguageService.currentLanguageKey,
            "Search"
        )
        this._containerView.addSubview(this._searchTextField)
        
        this._searchTextField.controlEventTargetAccumulator.TextChange = () => {
            this.updateFilteredData(this._searchTextField.text)
        }
        
        this._searchTextField.textField.controlEventTargetAccumulator.EscDown = () => {
            
            if (IS(this._searchTextField.text)) {
                
                this._searchTextField.text = ""
                this.updateFilteredData("")
                
            }
            else {
                
                this._dialogView.dismiss(YES)
                
            }
            
        }
        
        this._searchTextField.textField.controlEventTargetAccumulator.DownArrowDown = () => {
            
            if (this.focusedRowIndex < (this.drawingData.length - 1)) {
                
                this.focusedRowIndex = this.focusedRowIndex + 1
                
            }
            
        }
        
        this._searchTextField.textField.controlEventTargetAccumulator.UpArrowDown = () => {
            if (this.focusedRowIndex > 0) {
                this.focusedRowIndex = this.focusedRowIndex - 1
            }
        }
        
        this._searchTextField.textField.controlEventTargetAccumulator.EnterDown = () => {
            
            const isTouchDevice = "ontouchstart" in document.documentElement
            if (isTouchDevice) {
                this._searchTextField.blur()
                return
            }
            
            if (IS_UNDEFINED(this.focusedRowIndex)) {
                return
            }
            
            const datapoint = this.drawingData[this.focusedRowIndex]
            const alreadySelected = this.selectedDataContains(datapoint)
            
            if (alreadySelected) {
                
                this.selectedData.removeElement(datapoint)
                
            }
            else if (this.isSingleSelection) {
                
                this.selectedIndices = [this.focusedRowIndex]
                this.selectedData = [datapoint]
                this.selectionDidChange(this.selectedData)
                this.updateContentForCurrentSelection()
                this._dialogView.dismiss()
                
            }
            else {
                
                this.selectedData.push(datapoint)
                
            }
            
        }
        
        
        this._tableView = new UITableView(this.elementID + "TableView")
        this._containerView.addSubview(this._tableView)
        this._tableView.backgroundColor = UIColor.whiteColor
        
        this._dialogView = new UIDialogView(this.elementID + "DialogView")
        this._dialogView.view = this._containerView
        this._dialogView.backgroundColor = UIColor.transparentColor
        
        this.controlEventTargetAccumulator.PointerUpInside.EnterDown = () => {
            if (this._dialogView.isVisible) {
                this.closeDropdown()
            }
            else {
                this.openDropdown()
            }
        }
        
        this._dialogView.addTargetForControlEvent(
            UIView.controlEvent.PointerDown,
            (sender: UIDialogView, event: Event) => {
                
                if (sender.viewHTMLElement == event.target) {
                    sender.dismiss()
                }
                
            }
        )
        
        
        this._dialogView.layoutSubviews = () => {
    
            this._dialogView.frame = this.rootView.bounds
    
            const padding = this.core.paddingLength
    
            const searchTextFieldHeight = this.bounds.height
    
            FIRST_OR_NIL(this._dialogView.view).style.zIndex = "" + this._dialogView.zIndex
    
            this._containerView.frame = this.superview?.rectangleInView(
                this.frame,
                FIRST(this.dialogContainerView, this.rootView)
            ).rectangleWithHeight(this.expandedContainerViewHeight)
    
            this._searchTextField.frame = this._containerView.bounds.rectangleWithHeight(searchTextFieldHeight)
                .rectangleWithInsets(
                    0,
                    16,
                    0,
                    0
                )
            
            this._tableView.frame = this._containerView.bounds.rectangleWithInsets(0, 0, 0, searchTextFieldHeight)
            
        }
        
        
        this._tableView.numberOfRows = () => {
            let result = this.drawingData.length
            if (IS_NOT(this.isSingleSelection) && this.showsSelectedSectionInMultipleSelectionMode) {
                result = result + this.selectedData.length
            }
            return result
        }
        
        
        this._tableView.newReusableViewForIdentifier = (
            identifier: string,
            rowIndex: number
        ) => new SearchableDropdownRow(elementID + identifier + rowIndex).configuredWithObject({
            stopsPointerEventPropagation: NO
        })
        
        
        this._tableView.viewForRowWithIndex = (index: number) => {
            
            const view = this._tableView.reusableViewForIdentifier("SubjectView", index).configuredWithObject({
                style: {
                    borderBottomColor: "",
                    borderBottomStyle: "",
                    borderBottomWidth: ""
                }
            }) as SearchableDropdownRow
            
            let viewWasTapped
            const rowWasHovered = () => this.focusedRowIndex = index
            
            view.controlEventTargetAccumulator.PointerHover = rowWasHovered
            view.removeTargetForControlEvent(
                UIButton.controlEvent.PointerHover,
                view._SearchableDropdownRowWasHoveredFunction
            )
            view._SearchableDropdownRowWasHoveredFunction = rowWasHovered
            
            view.focused = (this.focusedRowIndex == index)
            
            if (!this.isSingleSelection && this.showsSelectedSectionInMultipleSelectionMode) {
                
                if (index < this.selectedData.length) {
                    
                    view.configuredWithObject({
                        type: SearchableDropdownRow.type.selectedItem,
                        titleText: LanguageService.stringForCurrentLanguage(this.selectedData[index].title),
                        selected: YES
                    }).updateContentForCurrentState()
                    
                    if (index == this.selectedData.length - 1) {
                        
                        view.configureWithObject({
                            style: {
                                borderBottomColor: UIColor.colorWithRGBA(100, 100, 100).stringValue,
                                borderBottomStyle: "solid",
                                borderBottomWidth: "1px"
                            }
                        })
                        
                    }
                    
                    viewWasTapped = () => {
                        this.selectedIndices.removeElementAtIndex(index)
                        const selectedItem = this.selectedData[index]
                        this.selectedData.removeElement(selectedItem)
                        view.selected = NO
                        
                        this.selectionDidChange(this.selectedData)
                        this.updateContentForCurrentSelection()
                        
                        this._searchTextField.focus()
                        
                        if ((view as any).viewWasTappedFunction) {
                            view.removeTargetForControlEvents([
                                UIView.controlEvent.EnterDown, UIView.controlEvent.PointerTap
                            ], (view as any).viewWasTappedFunction)
                        }
                    }
                    
                    // Removing previous event target if possible
                    if ((view as any).viewWasTappedFunction) {
                        view.removeTargetForControlEvents([
                            UIView.controlEvent.EnterDown, UIView.controlEvent.PointerTap
                        ], (view as any).viewWasTappedFunction)
                    }
                    
                    // Adding event target
                    view.controlEventTargetAccumulator.EnterDown.PointerTap = viewWasTapped;
                    (view as any).viewWasTappedFunction = viewWasTapped
                    
                    return view
                    
                }
                
                index = index - this.selectedData.length
                
            }
            
            
            // Datapoint
            const datapoint = this.drawingData[index]
            
            if (IS_NOT(datapoint)) {
                return nil
            }
            
            // Setting different style for section title rows
            if (datapoint.isADropdownDataSection) {
                view.type = SearchableDropdownRow.type.sectionTitle
                view.userInteractionEnabled = NO
            }
            else {
                view.type = SearchableDropdownRow.type.selectableItem
                view.userInteractionEnabled = YES
            }
            
            if (datapoint._id == (this._customItem || nil)._id) {
                view.type = SearchableDropdownRow.type.customItem
            }
            
            view.updateContentForNormalState()
            view.updateContentForCurrentState()
            
            
            // Setting row title
            view.titleText = LanguageService.stringForCurrentLanguage(datapoint.title)
            view.titleLabel.textAlignment = UITextView.textAlignment.left
            
            // Selecting of rows
            view.selected = this.selectedRowIdentifiers.contains(datapoint._id)
            
            viewWasTapped = () => {
                
                if (view.selected) {
                    
                    this.selectedIndices.removeElement(index)
                    this.selectedData.removeElement(datapoint)
                    
                }
                else {
                    
                    
                    if (this.isSingleSelection) {
                        
                        this.selectedIndices = [index]
                        this.selectedData = [datapoint]
                        
                        this.selectionDidChange(this.selectedData)
                        this.updateContentForCurrentSelection()
                        this._dialogView.dismiss()
                        
                        return
                        
                    }
                    else {
                        
                        this.selectedIndices.push(index)
                        this.selectedData.push(datapoint)
                        
                    }
                    
                }
                
                const selectedData = this.selectedData
                
                if (!view.selected) {
                    
                    view.selected = YES
                    
                    this.performFunctionWithDelay(0.25, () => {
                        this.selectionDidChange(selectedData)
                        this.updateContentForCurrentSelection()
                        
                        if (this.showsSelectedSectionInMultipleSelectionMode) {
                            this._tableView.contentOffset = this._tableView.contentOffset.pointByAddingY(view.frame.height)
                        }
                    })
                    
                }
                else {
                    
                    view._checkbox.selected = NO
                    this.selectionDidChange(selectedData)
                    
                    this.performFunctionWithDelay(0.15, () => {
                        view.selected = NO
                        this.updateContentForCurrentSelection()
                        
                        if (this.showsSelectedSectionInMultipleSelectionMode) {
                            this._tableView.contentOffset = this._tableView.contentOffset.pointByAddingY(-view.frame.height)
                        }
                    })
                    
                }
                
                this._searchTextField.focus()
                
            }
            
            // Removing previous event target if possible
            if ((view as any).viewWasTappedFunction) {
                view.removeTargetForControlEvents([
                    UIView.controlEvent.EnterDown, UIView.controlEvent.PointerUpInside
                ], (view as any).viewWasTappedFunction)
            }
            
            // Adding event target
            view.controlEventTargetAccumulator.EnterDown.PointerUpInside = viewWasTapped;
            (view as any).viewWasTappedFunction = viewWasTapped
            
            return view
            
        }
        
        this._keyValueStringFilter = new UIKeyValueStringFilter()
        
    }
    
    
    openDropdown() {
        this._dialogView.showInView(FIRST(this.dialogContainerView, this.rootView), YES)
        this._searchTextField.focus()
    }
    
    closeDropdown() {
        this._dialogView.dismiss(YES)
    }
    
    override boundsDidChange(bounds:UIRectangle) {
        super.boundsDidChange(bounds)
        this.setNeedsLayout()
    }
    
    
    set dropdownCode(dropdownCode: string) {
        this._dropdownCode = dropdownCode
        this.fetchDropdownDataForCode(dropdownCode).then(nil)
    }
    
    
    get dropdownCode() {
        return this._dropdownCode
    }
    
    
    async fetchDropdownDataForCode(dropdownCode: string) {
        
        const responseMessage = (await SocketClient.RetrieveDropdownDataForCode(
            dropdownCode,
            CBSocketClient.completionPolicy.storedOrFirst
        )).result
        
        
        const dropdownData: CBDropdownDataItem<T>[] = []
        
        responseMessage.data.forEach((sectionOrRow) => {
            
            if (sectionOrRow.isADropdownDataSection) {
                
                const dataSection: CBDropdownDataItem<T> = {
                    
                    _id: sectionOrRow._id,
                    title: sectionOrRow.title,
                    rowsData: [],
                    isADropdownDataSection: YES,
                    isADropdownDataRow: NO,
                    
                    attachedObject: sectionOrRow.attachedObject,
                    
                    itemCode: sectionOrRow.itemCode,
                    dropdownCode: sectionOrRow.dropdownCode
                    
                }
                
                const rowsData = dataSection?.rowsData
                
                sectionOrRow?.rowsData?.forEach((rowData) => {
                    
                    rowsData?.push({
                        
                        _id: rowData._id,
                        title: rowData.title,
                        isADropdownDataSection: NO,
                        isADropdownDataRow: YES,
                        
                        attachedObject: rowData.attachedObject,
                        
                        itemCode: rowData.itemCode,
                        dropdownCode: rowData.dropdownCode
                        
                    })
                    
                })
                
                dataSection.rowsData = rowsData
                dropdownData.push(dataSection)
                
            }
            else {
                
                dropdownData.push({
                    
                    _id: sectionOrRow._id,
                    title: sectionOrRow.title,
                    rowsData: [],
                    
                    itemCode: sectionOrRow.itemCode,
                    dropdownCode: sectionOrRow.dropdownCode,
                    
                    attachedObject: sectionOrRow.attachedObject,
                    
                    isADropdownDataRow: YES,
                    isADropdownDataSection: false
                    
                })
                
            }
            
        })
        
        this.data = dropdownData
        this.didLoadDataForDropdownCode()
        
    }
    
    
    didLoadDataForDropdownCode() {
        
        // Overridden by controller if needed
        
    }
    
    
    get focusedRowIndex(): number {
        
        return this._focusedRowIndex || 0
        
    }
    
    set focusedRowIndex(focusedRowIndex: number | undefined | null) {
        
        const previousFocusedRowIndex = this.focusedRowIndex
        
        this._focusedRowIndex = focusedRowIndex
        
        if (previousFocusedRowIndex != focusedRowIndex && focusedRowIndex) {
            
            if (previousFocusedRowIndex) {
                (this._tableView.visibleRowWithIndex(previousFocusedRowIndex) as SearchableDropdownRow).focused = NO
            }
            
            const focusedRow = this._tableView.visibleRowWithIndex(focusedRowIndex) as SearchableDropdownRow
            focusedRow.focused = YES
            
            if (!this.keepFocusedRowVisible) {
                return
            }
            
            // Scroll the view if needed
            let contentOffset = this._tableView.contentOffset
            if (focusedRow.frame.y < contentOffset.y) {
                contentOffset.y = focusedRow.frame.y
            }
            if (focusedRow.frame.max.y > (contentOffset.y + this._tableView.bounds.height)) {
                contentOffset = contentOffset.pointByAddingY(-(contentOffset.y + this._tableView.bounds.height -
                    focusedRow.frame.max.y))
            }
            const animationDuration = this._tableView.animationDuration
            this._tableView.animationDuration = 0
            this._tableView.contentOffset = contentOffset
            this._tableView.animationDuration = animationDuration
            
        }
        
    }
    
    
    set expandedContainerViewHeight(expandedContainerViewHeight: number) {
        this._expandedContainerViewHeight = expandedContainerViewHeight
        this._dialogView.setNeedsLayout()
    }
    
    
    get expandedContainerViewHeight(): number {
        
        if (IS(this._expandedContainerViewHeight)) {
            return this._expandedContainerViewHeight
        }
        
        let result = this.superview?.bounds.height ?? 0 - this.frame.max.y - this.core.paddingLength
    
        // if (IS(this.dialogContainerView)) {
        //
        //     result = 250
        //
        // }
        
        return result
        
    }
    
    
    selectedDataContains(datapoint: CBDropdownDataItem<T>) {
        for (let i = 0; i < this.selectedData.length; i++) {
            const value = this.selectedData[i]
            if (value._id == datapoint._id) {
                return YES
            }
        }
        return NO
    }
    
    
    override updateContentForNormalState() {
        
        this.style.borderBottom = "1px solid rgba(0,0,0,0.12)"
        this.style.borderBottomColor = CBColor.primaryContentColor.colorWithAlpha(0.12).stringValue
        
        this.titleLabel.textColor = CBColor.primaryContentColor
        this.backgroundColor = UIColor.transparentColor
        
    }
    
    override updateContentForHighlightedState() {
        
        this.style.borderBottomWidth = "2px"
        this.style.borderBottomColor = this.tintColor.stringValue
        
    }
    
    
    static override controlEvent = Object.assign({}, UIView.controlEvent, {
        
        "SelectionDidChange": "SelectionDidChange"
        
    })
    
    // @ts-ignore
    get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof SearchableDropdown> {
        return (super.controlEventTargetAccumulator as any)
    }
    
    selectionDidChange(selectedRows: CBDropdownDataItem<T>[]) {
        
        // Update title to indicate the selection
        this.updateTitleWithSelection(selectedRows)
        
        this.sendControlEventForKey(SearchableDropdown.controlEvent.SelectionDidChange, nil)
        
    }
    
    updateContentForCurrentSelection() {
        
        // Update selected rows in the top of the table view
        this._tableView.reloadData()
        
        this.setNeedsLayout()
        
    }
    
    
    get placeholderText() {
        if (IS_UNDEFINED(this._placeholderText)) {
            this._placeholderText = "Not selected"
        }
        return this._placeholderText
    }
    
    set placeholderText(placeholderText: string) {
        this._placeholderText = placeholderText
        this.updateTitleWithSelection(this.selectedData)
    }
    
    
    setPlaceholderText(key: string, defaultString: string, parameters?: { [x: string]: string }) {
        this.placeholderLocalizedTextObject = LanguageService.localizedTextObjectForKey(key, defaultString, parameters)
    }
    
    get placeholderLocalizedTextObject() {
        if (IS_UNDEFINED(this._placeholderLocalizedTextObject)) {
            this._placeholderLocalizedTextObject = LanguageService.localizedTextObjectForKey(
                "searchableDropdownNotSelected"
            )
        }
        return this._placeholderLocalizedTextObject
    }
    
    set placeholderLocalizedTextObject(placeholderText: UILocalizedTextObject) {
        this._placeholderLocalizedTextObject = placeholderText
        this.updateTitleWithSelection(this.selectedData)
    }
    
    
    updateTitleWithSelection(selectedRows: CBDropdownDataItem<T>[]) {
        
        this.titleLabel.localizedTextObject = this.placeholderLocalizedTextObject
        
        if (selectedRows && selectedRows.length) {
            
            this.titleLabel.localizedTextObject = nil
            this.titleLabel.text = ""
            let stopLooping = NO
            
            selectedRows.forEach((selectedDatapoint, index, array) => {
                
                if (stopLooping) {
                    return
                }
                
                let selectedString = LanguageService.stringForCurrentLanguage(selectedDatapoint.title)
                if (index) {
                    selectedString = ", " + selectedString
                }
                const previousText = this.titleLabel.text
                this.titleLabel.text = this.titleLabel.text + selectedString
                
                this.overflowLabel.text = "+" + (array.length - index - 1)
                if (index == array.length - 1) {
                    this.overflowLabel.text = ""
                }
                
                if (index && (this.bounds.width -
                    (this.overflowLabel.intrinsicContentWidth() + this.titleLabel.intrinsicContentWidth()) - 20) < 0) {
                    
                    this.titleLabel.text = previousText
                    this.overflowLabel.text = "+" + (array.length - index - 2 * 0)
                    
                    stopLooping = YES
                }
                
            })
            
        }
        
    }
    
    
    updateFilteredData(filteringString: string) {
        
        this._filteredData = []
        
        this.data.forEach((
            sectionOrRow: CBDropdownDataItem<T>) => {
            
            if (LanguageService.stringForCurrentLanguage(sectionOrRow.title)
                .toLowerCase()
                .contains(filteringString.toLowerCase())) {
                
                this.filteredData.push(sectionOrRow)
                
            }
            else if (sectionOrRow.isADropdownDataSection) {
                
                this._keyValueStringFilter.filterData(
                    filteringString,
                    sectionOrRow.rowsData ?? [],
                    this._excludedData,
                    "title." + LanguageService.currentLanguageKey,
                    sectionOrRow,
                    (filteredData, filteredIndexes, sectionFromThread: CBDropdownDataItem<T>) => {
                        
                        if (filteredData.length) {
                            
                            this.filteredData.push({
                                
                                _id: sectionFromThread._id,
                                title: sectionFromThread.title,
                                rowsData: filteredData,
                                isADropdownDataSection: sectionFromThread.isADropdownDataSection,
                                isADropdownDataRow: sectionFromThread.isADropdownDataRow,
                                
                                attachedObject: sectionFromThread.attachedObject,
                                
                                itemCode: sectionFromThread.itemCode,
                                dropdownCode: sectionFromThread.dropdownCode
                                
                            })
                            
                            // Move custom item to the bottom
                            if (this.allowsCustomItem && this._searchTextField.text && this._customItem) {
                                this.filteredData.removeElement(this._customItem)
                                this.filteredData.push(this._customItem)
                            }
                            
                            this._isDrawingDataValid = NO
                            this._tableView.reloadData()
                            
                        }
                        
                    }
                )
                
            }
            
        })
        
        
        if (this.allowsCustomItem && this._searchTextField.text) {
            
            if (this._customItem) {
                this.filteredData.removeElement(this._customItem)
            }
            
            this.initCustomItemWithTitle(this._searchTextField.text)
            
            if (this._customItem) {
                this.filteredData.push(this._customItem)
            }
            
        }
        
        
        if (this.filteredData.length) {
            this.focusedRowIndex = 0
        }
        else {
            this.focusedRowIndex = null
        }
        
        this._isDrawingDataValid = NO
        this._tableView.reloadData()
        
    }
    
    
    initCustomItemWithTitle(title: string) {
        
        if (IS_NOT(title)) {
            this._customItem = undefined
            return
        }
        
        this._customItem = {
            
            _id: "" + MAKE_ID(),
            title: LanguageService.localizedTextObjectForText(title),
            rowsData: [],
            isADropdownDataSection: NO,
            isADropdownDataRow: YES,
            
            attachedObject: undefined,
            
            itemCode: "custom_item",
            dropdownCode: this.dropdownCode
            
        }
        
    }
    
    
    selectItemOrCustomItemWithTitle(title: string) {
        
        if (IS_NOT(title)) {
            this._customItem = undefined
            return
        }
        
        let item = this.drawingData.find((dataItem) => {
            return (LanguageService.stringForCurrentLanguage(dataItem.title) == title)
        }) ?? nil
        
        if (this.allowsCustomItem && IS_NOT(item)) {
            this._searchTextField.text = title
            this.updateFilteredData(title)
            item = this._customItem
        }
        
        if (IS_NOT(this.isSingleSelection)) {
            if (IS_NOT(this.selectedDataContains(item))) {
                const selectedItemCodes = this.selectedItemCodes.copy()
                selectedItemCodes.push(item.itemCode)
                this.selectedItemCodes = selectedItemCodes
            }
            return
        }
        
        this.selectedItemCodes = [item.itemCode]
        
    }
    
    
    set data(data: CBDropdownDataItem<T>[]) {
        this._data = data
        this.updateFilteredData(this._searchTextField.text)
    }
    
    get data() {
        return this._data
    }
    
    set filteredData(data: CBDropdownDataItem<T>[]) {
        this._filteredData = data
        this._isDrawingDataValid = NO
    }
    
    get filteredData() {
        return this._filteredData
    }
    
    get drawingData(): CBDropdownDataItem<T>[] {
        
        if (this._isDrawingDataValid) {
            return this._drawingData
        }
        
        const result: CBDropdownDataItem<T>[] = []
        
        this._filteredData.forEach((section: CBDropdownDataItem<T>) => {
            
            result.push({
                
                _id: section._id,
                title: section.title,
                
                // @ts-ignore
                rowsData: null,
                isADropdownDataSection: section.isADropdownDataSection,
                isADropdownDataRow: NO,
                
                attachedObject: section.attachedObject,
                
                itemCode: section.itemCode,
                dropdownCode: section.dropdownCode
                
                
            })
            
            if (section.rowsData) {
                
                section.rowsData.forEach((row) => {
                    result.push(row)
                })
                
            }
            
        })
        
        
        this._drawingData = result
        this._isDrawingDataValid = YES
        
        return result
        
    }
    
    get selectedData() {
        
        return this._selectedData
        
    }
    
    set selectedData(selectedData: CBDropdownDataItem<T>[]) {
        
        this._selectedData = selectedData
        
    }
    
    
    clearSelection() {
        
        this.selectedData = []
        this.selectedIndices = []
        
        this.updateTitleWithSelection(this.selectedData)
        this.updateContentForCurrentSelection()
        this.selectionDidChange(this.selectedData)
        
    }
    
    
    get selectedItemCodes() {
        return this.selectedData.map(item => item.itemCode)
    }
    
    set selectedItemCodes(selectedItemCodes: string[]) {
        
        const selectedData: CBDropdownDataItem<T>[] = []
        const selectedIndices: number[] = []
        
        this._drawingData.forEach((item, index) => {
            
            if (selectedItemCodes.contains(item.itemCode)) {
                
                selectedData.push(item)
                selectedIndices.push(index)
                
            }
            
        })
        
        
        this.selectedData = selectedData
        this.selectedIndices = selectedIndices
        
        this.updateTitleWithSelection(this.selectedData)
        this.updateContentForCurrentSelection()
        this.selectionDidChange(this.selectedData)
        
    }
    
    
    get selectedRowIdentifiers(): string[] {
        const result: string[] = []
        this.selectedData.forEach((selectedDatapoint: CBDropdownDataItem<T>) => {
            result.push(selectedDatapoint._id)
        })
        return result
    }
    
    
    override wasAddedToViewTree() {
        
        super.wasAddedToViewTree()
        
        this.setNeedsLayout()
        
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const bounds = this.bounds
        
        const padding = this.core.paddingLength
        
        if (this._dialogView.isVisible) {
            this._dialogView.setNeedsLayout()
        }
        
        this.updateTitleWithSelection(this.selectedData)
        
        if (this._rightImageView) {
            
            // var imageHeight = bounds.height - padding;
            // this._rightImageView.frame = new UIRectangle(bounds.width - imageHeight - padding * 0.5, padding * 0.5, imageHeight, imageHeight);
            
            this._rightImageView.frame = bounds.rectangleWithInsets(0, padding *
                0.5, 0, 0).rectangleWithWidth(24, 1).rectangleWithHeight(24, 0.5)
            
        }
        
        if (this.overflowLabel) {
            
            //this.overflowLabel.frame = bounds.rectangleWithInsets(padding, padding, 0, 0).rectangleWithInsets(0, this._rightImageView.bounds.width || 0, 0, 0).rectangleWithWidth(36, 1);
            
            //this.titleLabel.style.maxWidth = "" + (bounds.width - (bounds.width - this.titleLabel.viewHTMLElement.offsetLeft - (this.overflowLabel.frame.x || 0)))
            
            this.overflowLabel.style.width = "36px"
            this.overflowLabel.style.right = "32px"
            
            this.overflowLabel.centerYInContainer()
            
            
            this.titleLabel.style.marginRight = "60px"
            
            //this.overflowLabel.centerYInContainer();
            //this.titleLabel.frame = this.titleLabel.frame.rectangleWithWidth(bounds.width - (bounds.width - this.titleLabel.frame.x - (this.overflowLabel.frame.x || 0)))
            
        }
        
        
    }
    
    
}



























