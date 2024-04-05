import { CBLocalizedTextObject } from "cbcore-ts/compiledScripts/CBDataInterfaces"
import {
    EXTEND,
    FIRST,
    IF,
    IS,
    IS_NIL,
    IS_NOT,
    IS_UNDEFINED,
    MAKE_ID,
    nil,
    NO, UIColor,
    UIKeyValueStringSorter,
    UIObject, UIPoint, UIRectangle,
    UIStringFilter,
    UITableView,
    UITextField,
    UITextView,
    UIView,
    UIViewBroadcastEvent,
    ValueOf,
    YES
} from "uicore-ts"
import { LanguageService } from "../LanguageService"
import { CBTableHeaderView } from "./CBTableHeaderView"
import { CBTableRowView } from "./CBTableRowView"
import { CellView } from "./CellView"
import { RowView } from "./RowView"


type StringOnly<T> = T extends string ? T : never;


export interface CBDataViewCellDescriptor<DataType = Record<string, any>> {
    
    
    keyPath: StringOnly<keyof DataType> | string;
    title: string | CBLocalizedTextObject;
    allowSorting: boolean;
    
    identifierKeyPath?: StringOnly<keyof DataType> | string;
    parentIdentifierKeyPath?: StringOnly<keyof DataType> | string;
    
    // @ts-ignore
    initialOrderingState?: ValueOf<{
        
        "unordered": "unordered",
        "descending": "descending",
        "ascending": "ascending"
        
    }>;
    
    defaultTitle?: string;
    
    initCell?: (cellView: CellView) => void;
    updateCell?: (cellView: CellView, dataItem: DataType) => void;
    
    buttonWasPressed?: (cellView: CellView, dataItem: DataType, event: MouseEvent | TouchEvent | KeyboardEvent) => void;
    
}


export class CBDataView<DataType = Record<string, any>> extends UIView {
    
    private _descriptors: CBDataViewCellDescriptor<DataType>[] = []
    
    private _filteringArray: string[] = []
    private _data: DataType[] = []
    
    highlightedDataItem?: DataType
    
    private _filteredData: any[] = []
    
    searchTextField: UITextField
    tableHeaderView: CBTableHeaderView<DataType>
    tableView: UITableView
    
    titleLabel: UITextView
    private _stringFilter = new UIStringFilter()
    private _stringSorter = new UIKeyValueStringSorter()
    
    isSearchAvailable = YES
    
    _highlightNextFilterChange = NO
    isTreeView = NO
    _rowToKeepStaticAfterUpdate?: CBTableRowView<DataType>
    
    private _hasResizableColumns = NO
    _resizingHandleViews: UIView[] = []
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        this.titleLabel = new UITextView(this.elementID + "TitleLabel", UITextView.type.header5)
        this.addSubview(this.titleLabel)
        
        
        this.searchTextField = new UITextField(this.elementID + "SearchTextField")
        this.searchTextField.placeholderText = LanguageService.stringForKey(
            "CBTableViewSearch",
            LanguageService.currentLanguageKey,
            "Search"
        )
        this.addSubview(this.searchTextField)
        
        
        this.tableHeaderView = new CBTableHeaderView(this.elementID + "TableHeaderView")
        this.tableHeaderView.orderingStateDidChange = this.sortTableData.bind(this)
        this.addSubview(this.tableHeaderView)
        
        
        this.tableView = new UITableView(this.elementID + "TableView")
        this.addSubview(this.tableView)
        
        this.updateHeaderShadow()
        this.tableView.configureWithObject({
            didScrollToPosition: EXTEND(() => this.updateHeaderShadow())
        })
        
        // function ONLY_IF(object: any) {
        //     if (IS(object)) {
        //         return object;
        //     }
        //     return null
        // }
        
        this.tableView.allRowsHaveEqualHeight = YES
        
        // this.tableView.heightForRowWithIndex =
        //     index =>  this.tableView.viewForRowWithIndex(index).intrinsicContentHeight(this.tableView.bounds.width)
        
        
        this.tableView.numberOfRows = () => this.filteredData.length
        
        
        this.tableView.newReusableViewForIdentifier = (_identifier, rowIDIndex) => {
            
            const rowView = new CBTableRowView(
                this.elementID + "TableRow" + rowIDIndex
            )
            
            
            rowView.expandedValueDidChange = (_row: UIView, event: MouseEvent) => {
                
                // @ts-ignore
                this.rowExpandedValueDidChange(rowView, event)
                
                // @ts-ignore
                this.keepRowStaticDuringNextUpdate(rowView)
                
                this.updateTableDataByFiltering().then(nil)
                
            }
            
            return rowView
            
        }
        
        this.tableView.viewForRowWithIndex = (index) => {
            
            const row = this.tableView.reusableViewForIdentifier("TableRow", index) as CBTableRowView<DataType>
            
            if (!row.descriptors.isEqualToArray(this._descriptors)) {
                
                row.descriptors = this._descriptors
                
            }
            
            row.data = this.filteredData[index]
            
            
            if (index % 2 == 0) {
                
                row.viewHTMLElement.classList.add("even")
                row.viewHTMLElement.classList.remove("odd")
                
            }
            else {
                
                row.viewHTMLElement.classList.add("odd")
                row.viewHTMLElement.classList.remove("even")
                
            }
            
            row.highlighted = IS(this.highlightedDataItem) && row.data == this.highlightedDataItem
            
            return row
            
        }
        
        
        this.searchTextField.addTargetForControlEvent(
            UITextField.controlEvent.TextChange,
            () => {
                
                if (this.tableView.isMemberOfViewTree) {
                    
                    // noinspection JSIgnoredPromiseFromCall
                    this.updateTableDataByFiltering()
                    
                }
                
            }
        )
        
    }
    
    
    private updateHeaderShadow() {
        
        const boxShadowString = "#0000005e 0px 2px 2px -2px"
        
        if (this.tableView.contentOffset.y > 0 && this.tableHeaderView.style.boxShadow != boxShadowString) {
            
            this.tableHeaderView.moveToTopOfSuperview()
            this.tableHeaderView.style.boxShadow = boxShadowString
            
        }
        else {
            
            this.tableHeaderView.style.boxShadow = ""
            
        }
        
    }
    
    override wasAddedToViewTree() {
        
        super.wasAddedToViewTree()
        
        this.updateTableDataByFiltering().then(nil)
        
    }
    
    
    override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.didReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.LanguageChanged) {
            
            this.tableView.reloadData()
            
        }
        
        
    }
    
    
    rowExpandedValueDidChange(row: CBTableRowView<DataType>, event: MouseEvent) {
        
        // Override somewhere
        
    }
    
    
    get descriptors() {
        return this._descriptors
    }
    
    set descriptors(descriptors) {
        
        this._descriptors = descriptors
        
        this.tableHeaderView.descriptors = descriptors
        this.tableView._reusableViews = {}
        
        this.updateFilteringArray()
        this.updateTableDataByFiltering().then(nil)
        
        this.hasResizableColumns = this.hasResizableColumns
        
    }
    
    
    set data(data) {
        
        this._data = data
        
        //this.filteredData = data
        
        // Form array of strings for filtering
        this.updateFilteringArray()
        this.updateTableDataByFiltering().then(() =>
            this.setNeedsLayoutUpToRootView()
        )
        this.setNeedsLayoutUpToRootView()
        
    }
    
    get data() {
        return this._data
    }
    
    
    setTreeData(data: DataType[], subElementsKey: keyof DataType & string, expanded = YES) {
        
        // Flatten the tree
        
        const descriptor = this.descriptors.firstElement
        const identifierKeyPath = descriptor.identifierKeyPath as string ?? "_id"
        const parentIdentifierKeyPath = descriptor.parentIdentifierKeyPath as string ?? "_parent"
        
        
        const flatData: DataType[] = []
        
        
        function flattenData(data: DataType[], parentElementID?: string) {
            
            data.forEach(value => {
                
                flatData.push(value)
                
                let identifier = UIObject.valueForKeyPath(identifierKeyPath, value)
                if (IS_UNDEFINED(identifier) || IS_NIL(identifier)) {
                    identifier = MAKE_ID()
                    UIObject.setValueForKeyPath(identifierKeyPath, identifier, value, YES)
                }
                
                if (parentElementID?.length) {
                    UIObject.setValueForKeyPath(parentIdentifierKeyPath, parentElementID, value, YES)
                }
                
                const subElements: DataType[] | undefined = UIObject.valueForKeyPath(subElementsKey, value)
                if (subElements?.length) {
                    
                    // @ts-ignore
                    if (!value._CB_DataView_IsExpandable) {
                        
                        // @ts-ignore
                        value._CB_DataView_IsExpandable = YES
                        // @ts-ignore
                        value._CB_DataView_IsExpanded = expanded
                        
                    }
                    
                    flattenData(subElements, identifier)
                    
                }
                
            })
            
        }
        
        flattenData(data)
        
        this.isTreeView = YES
        
        const groupedData = (data || []).groupedBy(item =>
            UIObject.valueForKeyPath(identifierKeyPath, item)
        )
        flatData.forEach(value => {
                
                const isExpanded = groupedData[UIObject.valueForKeyPath(
                    identifierKeyPath,
                    value
                    // @ts-ignore
                )]?.firstElement?._CB_DataView_IsExpanded
                
                if (isExpanded) {
                    // @ts-ignore
                    value._CB_DataView_IsExpanded = isExpanded
                }
                
            }
        )
        
        // Set data
        this.data = flatData
        
        
    }
    
    
    private updateFilteringArray() {
        
        if (!this.descriptors.length) {
            return
        }
        
        let data = this.data
        
        // // Only filtering root level rows
        // if (this.descriptors?.firstElement?.parentIdentifierKeyPath) {
        //     data = data.filter(
        //         value => IS_NOT(
        //             UIObject.valueForKeyPath(this.descriptors.firstElement.parentIdentifierKeyPath as string, value)
        //         )
        //     )
        // }
        
        this._filteringArray = data
            .map(
                (dataItem: any) => this.descriptors.map(
                    descriptor => dataItem[descriptor.keyPath]
                ).join(" ")
            )
        
    }
    
    
    get filteredData(): any[] {
        return this._filteredData
    }
    
    set filteredData(value: any[]) {
        
        this._filteredData = value
        
        this.tableView.reloadData()
        this.setNeedsLayoutUpToRootView()
        this.tableView.invalidateSizeOfRowWithIndex(0)
        this.tableView.setNeedsLayoutUpToRootView()
        
    }
    
    keepRowStaticDuringNextUpdate(rowView: CBTableRowView<DataType>) {
        
        this._rowToKeepStaticAfterUpdate = rowView
        
    }
    
    
    async updateTableDataByFiltering() {
        
        const { filteredIndexes } = await this._stringFilter.filteredData(
            this.searchTextField.text.replace(",", " "),
            this._filteringArray
        )
        
        const filteringResult: any[] = []
        
        filteredIndexes.forEach(index => {
            filteringResult.push(this.data[index])
        })
        
        const descriptor = this.descriptors.firstElement
        const parentIdentifierKeyPath = descriptor?.parentIdentifierKeyPath ?? "_parent"
        const identifierKeyPath = descriptor?.identifierKeyPath ?? "_id"
        
        if (this.isTreeView) {
            
            // Include parents of all the remaining sub data objects
            const subDataParentKeys: string[] = []
            const getParentKeys = (value: any) => {
                if (IS_NOT(value)) {
                    return
                }
                const parentKey = UIObject.valueForKeyPath(
                    parentIdentifierKeyPath,
                    value
                )
                const hasParentKey = IS(parentKey) && ((parentKey + "") == parentKey)
                
                if (hasParentKey) {
                    const parentObject = this.data.find(
                        objectValue => UIObject.valueForKeyPath(
                            identifierKeyPath,
                            objectValue
                        ) == parentKey
                    )
                    
                    if (!subDataParentKeys.contains(parentKey)) {
                        subDataParentKeys.push(parentKey)
                    }
                    getParentKeys(parentObject)
                }
                
            }
            
            filteringResult.forEach(value => getParentKeys(value))
            
            const dataPointsToIncludeAsParentData = this.data.filter(
                value => !filteringResult.contains(value) &&
                    subDataParentKeys.contains(
                        UIObject.valueForKeyPath(identifierKeyPath as string, value) as string
                    )
            )
            dataPointsToIncludeAsParentData.forEach(value => filteringResult.push(value))
            
        }
        
        
        // Sort the data
        const { sortedIndexes } = await this._stringSorter.sortedData(
            JSON.parse(JSON.stringify(filteringResult)),
            this.tableHeaderView.sortingInstructions
        )
        const sortedData: DataType[] = []
        sortedIndexes.forEach(index => sortedData.push(filteringResult[index]))
        
        let result: DataType[] = []
        
        if (this.isTreeView) {
            
            result = []
            
            // Move sub elements under parent elements
            const parentDataObjects = sortedData.filter(value =>
                IS_NOT(UIObject.valueForKeyPath(parentIdentifierKeyPath as string, value))
            )
            const groupedSubRows = sortedData.groupedBy(value =>
                UIObject.valueForKeyPath(parentIdentifierKeyPath as string, value)
            )
            
            delete groupedSubRows.undefined
            delete groupedSubRows[""]
            
            function addToResult(
                result: any[],
                parentDataObjects: any[],
                identifierKey: string | undefined,
                groupedSubRows: any,
                nestingDepth = 0
            ) {
                
                parentDataObjects.forEach(value => {
                    
                    result.push(value)
                    
                    value._CB_DataView_NestingDepth = nestingDepth
                    
                    if (identifierKey) {
                        const identifier = UIObject.valueForKeyPath(identifierKey, value)
                        const subRows = groupedSubRows[identifier]
                        if (subRows) {
                            
                            // This is needed to avoid showing sub rows of non-expanded rows
                            if (value._CB_DataView_IsExpandable && !value._CB_DataView_IsExpanded) {
                                return
                            }
                            
                            addToResult(result, subRows, identifierKey, groupedSubRows, nestingDepth + 1)
                            
                            if (!value._CB_DataView_IsExpandable) {
                                
                                value._CB_DataView_IsExpandable = YES
                                value._CB_DataView_IsExpanded = YES
                                
                            }
                            
                        }
                    }
                    
                })
                
            }
            
            addToResult(result, parentDataObjects, identifierKeyPath, groupedSubRows)
            
        }
        
        
        const rowToKeepStaticAfterUpdateYPositionInView = (this._rowToKeepStaticAfterUpdate?.frame.y ?? 0) - this.tableView.contentOffset.y
        const rowToKeepStaticAfterUpdateDataPoint = this._rowToKeepStaticAfterUpdate?.data
        
        const previousData = this.filteredData
        this.filteredData = result
        
        if (this._rowToKeepStaticAfterUpdate) {
            
            this.tableView.layoutIfNeeded()
            
            const newRowIndex = result.indexOf(rowToKeepStaticAfterUpdateDataPoint)
            const newRowPosition = this.tableView._rowPositions[newRowIndex]
            
            const newRowPositionInView = newRowPosition.topY - this.tableView.contentOffset.y
            
            const animationDuration = this.tableView.animationDuration
            this.tableView.animationDuration = 0
            this.tableView.contentOffset = this.tableView.contentOffset.pointByAddingY(
                newRowPositionInView - rowToKeepStaticAfterUpdateYPositionInView
            )
            this.tableView.animationDuration = animationDuration
            
            this._rowToKeepStaticAfterUpdate = undefined
            
        }
        
        
        if (this._highlightNextFilterChange) {
            this.tableView.setNeedsLayout()
            this.tableView.highlightChanges(previousData, this.filteredData)
            this._highlightNextFilterChange = NO
        }
        
    }
    
    
    override boundsDidChange(bounds: UIRectangle) {
        
        super.boundsDidChange(bounds)
        
        this.tableView.invalidateSizeOfRowWithIndex(0)
        this.tableView.setNeedsLayoutUpToRootView()
        
    }
    
    
    async sortTableData() {
        
        await this.updateTableDataByFiltering()
        
        // this.filteredData = (await this._stringSorter.sortedData(
        //     this.data,
        //     this.tableHeaderView.sortingInstructions,
        //     MAKE_ID()
        // )).sortedData
        
    }
    
    get hasResizableColumns(): boolean {
        return this._hasResizableColumns
    }
    
    set hasResizableColumns(hasResizableColumns: boolean) {
        
        this._hasResizableColumns = hasResizableColumns
        
        this._resizingHandleViews.everyElement.removeFromSuperview()
        this._resizingHandleViews = []
        
        if (!this._hasResizableColumns) {
            return
        }
        
        for (let i = 1; i < this.tableHeaderView.cells.length - 2; i++) {
            
            const view = new UIView().configuredWithObject({
                //backgroundColor: UIColor.blackColor,
                style: {
                    cursor: "col-resize"
                },
                calculateAndSetViewFrame: () => {
                    view.frame = this.tableHeaderView.cells[i].frame.rectangleWithWidth(2, 1)
                        .rectangleByAddingX(1)
                        .rectangleWithHeight(this.tableView.frame.height + this.tableHeaderView.frame.height)
                        .rectangleWithY(this.tableHeaderView.frame.y)
                }
            })
            
            // noinspection JSMismatchedCollectionQueryUpdate
            let initialWeights: number[] = []
            let initialUserSelect = ""
            
            view.controlEventTargetAccumulator.PointerDown = () => {
                
                initialWeights = this.tableHeaderView.cells.map(cell => cell.frame.width)
                
                initialUserSelect = this.rootView.style.userSelect
                this.rootView.style.userSelect = "none"
                
                view.pointerDraggingPoint = new UIPoint(0, 0)
                
            }
            
            view.controlEventTargetAccumulator.PointerDrag = sender => {
                
                // Get the x movement value
                const movementX = sender.pointerDraggingPoint.x
                
                // Change the cellWeights of the tableView
                
                const weights = initialWeights.copy()
                
                const leftWeight = initialWeights[i]
                const rightWeight = initialWeights[i + 1]
                
                const minWeight = [this.core.paddingLength * 2, 57].max()
                const maxWeight = leftWeight + rightWeight - minWeight
                
                weights[i] = (leftWeight + movementX).constrainedValue(minWeight, maxWeight)
                weights[i + 1] = (rightWeight - movementX).constrainedValue(minWeight, maxWeight)
                
                this.tableView.cellWeights = weights
                this.tableHeaderView.cellWeights = weights;
                
                (this.tableView._visibleRows as RowView[]).everyElement.layoutParametersDidChange()
                this.setNeedsLayout()
                
            }
            
            view.controlEventTargetAccumulator.PointerUp.PointerCancel = () => {
                this.rootView.style.userSelect = initialUserSelect
            }
            
            this._resizingHandleViews.push(view)
            
        }
        
        this.addSubviews(this._resizingHandleViews)
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        const bounds = this.bounds.rectangleWithInset(padding)
        //.rectangleWithInsets(0, 0, 0, padding * 2.5)
        
        //var borderRadius = "" + (padding * 0.25).integerValue + "px"
        
        //this.tableView.sidePadding = padding;
        
        
        this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight)
        
        this.searchTextField.hidden = IS_NOT(this.isSearchAvailable)
        
        this.searchTextField.frame = this.titleLabel.frame.rectangleForNextRow(padding * 0.5)
            .rectangleWithHeight(padding * 1.5)
        
        const previousFrameFromTableHeader = IF(this.isSearchAvailable)(() => this.searchTextField.frame)
            .ELSE_IF(this.titleLabel.text)(() => this.titleLabel.frame)
            .ELSE(() => this.bounds.rectangleWithHeight(0))
        
        this.tableHeaderView.frame = this.bounds.rectangleWithInsets(
            0,
            0,
            0,
            previousFrameFromTableHeader.max.y + padding
        ).rectangleWithHeight(50)
        
        
        this.tableView.frame = this.bounds.rectangleWithInsets(
            0,
            0,
            padding,
            this.tableHeaderView.frame.max.y
        )
        
        
    }
    
    
    override intrinsicContentHeight = (constrainingWidth: number = 0): number => {
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        var result = padding * 2 + padding * 2 + padding + 50 + padding +
            this.tableView.intrinsicContentHeight(constrainingWidth) + padding * 2.5
        
        return result
        
    }
    
    
}

































