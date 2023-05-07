import {
    CALL,
    FIRST,
    FIRST_OR_NIL,
    IF,
    IS,
    IS_NOT,
    nil, NO,
    UIButton,
    UIObject,
    UIRectangle,
    UITableView,
    UITextView,
    UIView,
    wrapInNil,
    YES
} from "uicore-ts"
import { LanguageService } from "../LanguageService"
import { CBColor } from "./CBColor"
import { CBDataViewCellDescriptor } from "./CBDataView"
import { CellView } from "./CellView"
import { RowView } from "./RowView"


export class CBTableRowView<DataType = Record<string, any>> extends RowView {
    
    private readonly backgroundView: UIView
    private readonly _bottomLineView: UIView
    dataCells: CellView[] = []
    private _data: any
    private _descriptors: CBDataViewCellDescriptor<DataType>[] = []
    
    leftCell: CellView
    rightCell: CellView
    
    sideCellsWidth = 20
    
    _CB_DataView_IsExpanded_clickHandler?: ((sender: UIView, event: Event) => void) & { remove(): void }
    expandabilityButtonView?: UITextView
    
    highlightingBorderView?: UIView
    
    constructor(elementID: string) {
        
        super(elementID)
        
        this._bottomLineView = new UIView(elementID + "BottomLineView")
        this._bottomLineView.backgroundColor = CBColor.primaryContentColor.colorWithAlpha(0.2)
        this.addSubview(this._bottomLineView)
        
        this.backgroundView = new UIView(elementID + "BackgroundView")
        this.addSubview(this.backgroundView)
        
        this.viewHTMLElement.classList.add("InquiryRowView")
        this.backgroundView.viewHTMLElement.classList.add("InquiryRowViewBackground")
        
        this.leftCell = new CellView()
        this.rightCell = new CellView()
        
        this._rowHeight = nil
        
    }
    
    
    get highlighted(): boolean {
        return this.highlightingBorderView?.superview == this
    }
    
    set highlighted(highlighted: boolean) {
        if (highlighted) {
            this.highlightingBorderView = this.highlightingBorderView || new UIView().configuredWithObject({
                setBorder: CALL(5, 2),
                userInteractionEnabled: NO
            })
            if (this.highlightingBorderView.superview != this) {
                this.addSubview(this.highlightingBorderView)
            }
            else {
                this.highlightingBorderView.moveToTopOfSuperview()
            }
        }
        else {
            this.highlightingBorderView?.removeFromSuperview()
        }
    }
    
    set descriptors(descriptors) {
        this._descriptors = descriptors
        this.updateContentForCurrentDescriptors()
    }
    
    
    get descriptors() {
        return this._descriptors
    }
    
    
    private updateContentForCurrentDescriptors() {
        
        function addRightBorder(view: UIView) {
            
            view.style.borderRightColor = CBColor.primaryContentColor.colorWithAlpha(0.2).stringValue
            view.style.borderRightWidth = "1px"
            view.style.borderRightStyle = "solid"
            
        }
        
        const views = [this.leftCell]
        
        this.dataCells = []
        
        this.descriptors.forEach((descriptor, index, array) => {
            
            const view = new CellView()
            
            view.addTargetForControlEvents(
                [UIButton.controlEvent.EnterDown, UIButton.controlEvent.PointerUpInside],
                (sender, event) => {
                    
                    const buttonWasPressed = FIRST_OR_NIL(descriptor.buttonWasPressed)
                    buttonWasPressed(view, this.data)
                    
                }
            )
            
            view.isAButton = IS(descriptor.buttonWasPressed)
            
            let initCell = descriptor.initCell
            
            if (!initCell) {
                
                initCell = (cellView: CellView) => {
                    
                    cellView.titleLabel.text = LanguageService.stringForCurrentLanguage(FIRST(
                        descriptor.defaultTitle,
                        descriptor.title
                    ))
                    
                }
                
            }
            
            initCell(view)
            
            if (index < array.length - 1) {
                
                addRightBorder(view)
                
            }
            
            views.push(view)
            
            this.dataCells.push(view)
            
        })
        
        views.push(this.rightCell)
        
        
        this.cells = views
        
        
        const cellWidths = [nil].arrayByRepeating(this.cells.length)
        cellWidths.firstElement = this.sideCellsWidth
        cellWidths.lastElement = this.sideCellsWidth
        this.cellWidths = cellWidths
        
        this.cellWeights = [1].arrayByRepeating(this.cells.length)
        
    }
    
    override get frame(): UIRectangle & { zIndex?: number } {
        return super.frame
    }
    
    override set frame(frame: UIRectangle & { zIndex?: number }) {
        
        super.frame = frame
        
        const cellWidths = [nil].arrayByRepeating(this.cells.length)
        cellWidths.firstElement = this.sideCellsWidth
        cellWidths.lastElement = this.sideCellsWidth
        this.cellWidths = cellWidths
        
    }
    
    set data(data) {
        this._data = data
        this.updateContentForCurrentData(data)
    }
    
    
    get data() {
        return this._data
    }
    
    private updateContentForCurrentData(data: any) {
        
        if (IS_NOT(data)) {
            return
        }
        
        this.descriptors.forEach((descriptor, index, array) => {
            
            const cellView = FIRST_OR_NIL(this.dataCells[index])
            
            if (data._CB_DataView_IsExpandable && index == 0) {
                
                this.expandabilityButtonView = this.expandabilityButtonView ?? new UITextView(
                    undefined,
                    UITextView.type.span
                )
                    .configuredWithObject({ style: { userSelect: "none" } })
                
                if (data._CB_DataView_IsExpanded) {
                    
                    this.expandabilityButtonView.text = "&#x25BC;"
                    
                }
                else {
                    
                    this.expandabilityButtonView.text = "&#x25B6;"
                    
                }
                
                const clickHandler = (sender: UIView, event: Event) => {
                    
                    data._CB_DataView_IsExpanded = !data._CB_DataView_IsExpanded
                    this.updateContentForCurrentData(data)
                    
                    this.expandedValueDidChange(sender as CBTableRowView, event as MouseEvent)
                    
                }
                clickHandler.remove = () => {
                    this.expandabilityButtonView?.removeTargetForControlEvents(
                        [
                            UIView.controlEvent.PointerUpInside,
                            UIView.controlEvent.EnterDown
                        ],
                        clickHandler
                    )
                }
                
                this._CB_DataView_IsExpanded_clickHandler?.remove()
                this._CB_DataView_IsExpanded_clickHandler = clickHandler
                this.expandabilityButtonView.controlEventTargetAccumulator.EnterDown.PointerUpInside = clickHandler
                cellView.addSubview(this.expandabilityButtonView)
                this.expandabilityButtonView.calculateAndSetViewFrame = () => {
                    
                    const frame = cellView.titleLabel.frame.rectangleWithWidth(15).rectangleWithHeight(20)
                    frame.center = frame.center.pointWithY(cellView.bounds.center.y)
                    frame.x = frame.x + data._CB_DataView_NestingDepth * 20 + cellView.contentPadding
                    this.expandabilityButtonView!.frame = frame
                    
                }
                
                cellView.titleLabel.setMargins(20 * data._CB_DataView_NestingDepth + 20)
                
            }
            else if (index == 0) {
                
                this._CB_DataView_IsExpanded_clickHandler?.remove()
                this.expandabilityButtonView?.removeFromSuperview()
                cellView.titleLabel.setMargins(20 * data._CB_DataView_NestingDepth + 20)
                
            }
            
            cellView.titleLabel.text = FIRST(
                IF(descriptor.keyPath)(() => UIObject.valueForKeyPath(descriptor.keyPath, data))(),
                descriptor.defaultTitle
            )
            
            cellView.titleLabel.changesOften = YES
            
            cellView.setNeedsLayout()
            
            if (IS(descriptor.updateCell)) {
                
                descriptor.updateCell(cellView, data)
                
            }
            
        })
        
    }
    
    
    expandedValueDidChange(sender: CBTableRowView, event: MouseEvent) {
        
        // Overridden by CBDataView
        
    }
    
    override boundsDidChange() {
        
        super.boundsDidChange()
        
        
        const tableView = wrapInNil(this.superview as UITableView)
        
        tableView.invalidateSizeOfRowWithIndex(this._UITableViewRowIndex ?? 0)
        
        
    }
    
    
    override layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        const bounds = this.bounds.rectangleWithInset(padding)
        
        
        this.backgroundView.frame = this.bounds.rectangleWithInsets(padding, padding, 0, 0)
        
        this._bottomLineView.frame = this.bounds.rectangleWithHeight(1, 1).rectangleWithInsets(padding, padding, 0, 0)
        
        this.highlightingBorderView?.setFrame(this.bounds)
        
        
    }
    
    
    override intrinsicContentHeight(constrainingWidth = 0) {
        
        
        return this.cells.map((value, index, array) => value.intrinsicContentHeight(constrainingWidth)).max()
        
        
    }
    
    
}






























