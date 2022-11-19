import { CBCore, CBDropdownDataItem, CBSocketMessageSendResponseFunction, SocketClient } from "cbcore-ts"
import {
    FIRST,
    IS,
    IS_DEFINED,
    IS_NOT,
    MAKE_ID,
    nil,
    NO,
    UIButton,
    UIColor,
    UIRoute,
    UITextArea,
    UITextView,
    UIView,
    UIViewController,
    YES
} from "uicore-ts"
import { CBButton } from "./Custom components/CBButton"
import { CBColor } from "./Custom components/CBColor"
import { CBDialogViewShower } from "./Custom components/CBDialogViewShower"
import { CBTextField } from "./Custom components/CBTextField"
import { SearchableDropdown } from "./Custom components/SearchableDropdown"
import { SearchableDropdownRow } from "./Custom components/SearchableDropdownRow"
import { LanguageService } from "./LanguageService"


export class InternalLanguageSettingsViewController extends UIViewController {
    
    
    titleLabel: UITextView
    loadButton: UIButton
    languageKeyTextField: CBTextField
    dropdown: SearchableDropdown<string>
    saveButton: CBButton
    deleteButton: CBButton
    addButton: CBButton
    itemKeyTextField: CBTextField
    itemTitleOrAttachedObjectTextArea: UITextArea
    
    languageKeysTextArea: UITextArea
    deleteLanguageButton: CBButton
    
    
    clearLanguageButton: CBButton
    dataTextArea: UITextArea
    dataTextJSONLabel: UITextView
    loadJSONDataButton: CBButton
    
    constructor(view: UIView) {
        
        super(view)
        
        // Code for further setup if necessary
        
        this.view.backgroundColor = UIColor.whiteColor
        
        
        this.titleLabel = new UITextView(this.view.elementID + "TitleLabel", UITextView.type.header2)
        this.titleLabel.text = "Internal language settings"
        this.view.addSubview(this.titleLabel)
        
        
        this.languageKeyTextField = new CBTextField(this.view.elementID + "LanguageKeyTextField")
        this.languageKeyTextField.placeholderText = "Language key"
        this.view.addSubview(this.languageKeyTextField)
        
        this.languageKeysTextArea = new UITextArea(this.view.elementID + "LanguageKeysTextArea")
        this.languageKeysTextArea.placeholderText = "Available language keys"
        this.view.addSubview(this.languageKeysTextArea)
        
        
        this.loadButton = new CBButton(this.view.elementID + "LoadButton")
        this.loadButton.titleLabel.text = "Load"
        this.view.addSubview(this.loadButton)
        
        this.saveButton = new CBButton(this.view.elementID + "SaveButton")
        this.saveButton.titleLabel.setText("internalLanguageSettingsViewControllerSaveButton", "Save")
        this.view.addSubview(this.saveButton)
        
        
        // this.textArea = new UITextArea(this.view.elementID + "TextArea")
        // this.view.addSubview(this.textArea)
        
        
        this.dropdown = new SearchableDropdown(this.view.elementID + "SearchableDropdown")
        this.dropdown._controlEventTargets[UIView.controlEvent.PointerUpInside] = []
        this.dropdown._controlEventTargets[UIView.controlEvent.EnterDown] = []
        this.dropdown._dialogView = nil
        this.dropdown.isSingleSelection = YES
        this.dropdown._rightImageView.imageSource = nil
        this.dropdown.keepFocusedRowVisible = NO
        this.view.addSubview(this.dropdown)
        
        this.dropdown._tableView.style.borderWidth = "1px"
        this.dropdown._tableView.style.borderStyle = "solid"
        this.dropdown._tableView.style.borderColor = CBColor.primaryContentColor.stringValue
        this.view.addSubview(this.dropdown._tableView)
        
        
        this.addButton = new CBButton(this.view.elementID + "AddButton")
        this.addButton.titleLabel.text = "Add text"
        this.addButton.setBackgroundColorsWithNormalColor(UIColor.greenColor)
        this.view.addSubview(this.addButton)
        
        this.deleteButton = new CBButton(this.view.elementID + "DeleteButton")
        this.deleteButton.titleLabel.text = "Delete text"
        this.deleteButton.setBackgroundColorsWithNormalColor(UIColor.redColor)
        this.view.addSubview(this.deleteButton)
        
        
        this.deleteLanguageButton = new CBButton(this.view.elementID + "DeleteLanguageButton")
        this.deleteLanguageButton.titleLabel.text = "Delete language"
        this.deleteLanguageButton.setBackgroundColorsWithNormalColor(UIColor.redColor)
        this.view.addSubview(this.deleteLanguageButton)
        
        this.clearLanguageButton = new CBButton(this.view.elementID + "ClearLanguageButton")
        this.clearLanguageButton.titleLabel.text = "Clear language"
        this.clearLanguageButton.setBackgroundColorsWithNormalColor(UIColor.redColor)
        this.view.addSubview(this.clearLanguageButton)
        
        
        this.itemKeyTextField = new CBTextField(this.view.elementID + "ItemKeyTextField")
        this.itemKeyTextField.placeholderText = "Item key"
        this.view.addSubview(this.itemKeyTextField)
        
        this.itemTitleOrAttachedObjectTextArea = new UITextArea(this.view.elementID +
            "ItemTitleOrAttachedObjectTextArea")
        this.itemTitleOrAttachedObjectTextArea.placeholderText = "Title"
        this.view.addSubview(this.itemTitleOrAttachedObjectTextArea)
        
        this.itemTitleDidChange()
        
        
        this.dataTextJSONLabel = new UITextView(this.view.elementID + "DataTextJSONLabel")
        this.dataTextJSONLabel.text = "Data in JSON format"
        this.view.addSubview(this.dataTextJSONLabel)
        
        this.dataTextArea = new UITextArea(this.view.elementID + "DataTextArea")
        this.dataTextArea.placeholderText = "Data in JSON format"
        this.view.addSubview(this.dataTextArea)
        
        
        this.loadJSONDataButton = new CBButton(this.view.elementID + "LoadJSONDataButton")
        this.loadJSONDataButton.titleLabel.text = "Load JSON data"
        this.view.addSubview(this.loadJSONDataButton)
        
        
        // @ts-ignore
        this.dropdown.controlEventTargetAccumulator.SelectionDidChange = () => this.updateitemDetailsView()
        
        const dropdownViewForRowWithIndexFunction = this.dropdown._tableView.viewForRowWithIndex.bind(this.dropdown._tableView)
        
        this.dropdown._tableView.viewForRowWithIndex = (rowIndex: number) => {
            
            const row = dropdownViewForRowWithIndexFunction(rowIndex)
            const dataItem = this.dropdown.drawingData[rowIndex]
            const key = dataItem.itemCode
            const value = dataItem.attachedObject
            
            if (LanguageService.languageValues[this.languageKeyTextField.text][key] == value) {
                
                (row as SearchableDropdownRow).titleText = (row as SearchableDropdownRow).titleText + " - static"
                row.alpha = 0.5
                
            }
            else {
                
                row.alpha = 1
                
            }
            
            return row
            
        }
        
        
        this.itemKeyTextField.textField.controlEventTargetAccumulator.TextChange = () => {
            
            const selectedItem: CBDropdownDataItem<string> = this.dropdown.selectedData.firstElement || nil
            const previousKey = selectedItem.itemCode
            const languageObject = LanguageService.languages[this.languageKeyTextField.text]
            const languageValuesValue = languageObject[previousKey]
            
            if (IS_NOT(languageValuesValue)) {
                delete languageObject[previousKey]
            }
            
            languageObject[this.itemKeyTextField.text] = selectedItem.attachedObject
            
            selectedItem.title = LanguageService.localizedTextObjectForText(this.itemKeyTextField.text)
            selectedItem.itemCode = this.itemKeyTextField.text
            selectedItem._id = this.itemKeyTextField.text
            
            this.reloadTableData()
            
        }
        
        
        this.itemTitleOrAttachedObjectTextArea.controlEventTargetAccumulator.TextChange = () => {
            
            this.itemTitleDidChange()
            this.reloadTableData()
            
        }
        
        
        //this.loadSubjectData()
        
        this.updateAvailableKeys()
        
        
        this.loadButton.controlEventTargetAccumulator.PointerUpInside = () => this.loadData()
        
        this.saveButton.controlEventTargetAccumulator.PointerUpInside = async () => {
            
            // This is to make sure that everything is in the correct state
            const codes = (await SocketClient.RetrieveLanguageData(nil)).result
            await this.saveData()
            
        }
        
        
        this.addButton.controlEventTargetAccumulator.PointerUpInside = () => {
            
            const title = LanguageService.localizedTextObjectForText(this.itemKeyTextField.text)
            const itemID = MAKE_ID()
            
            const dataRow: CBDropdownDataItem<string> = {
                
                _id: itemID,
                title: title,
                isADropdownDataRow: YES,
                isADropdownDataSection: NO,
                
                attachedObject: "",
                
                itemCode: nil,
                dropdownCode: this.dropdown.selectedData.firstElement?.dropdownCode
                
            }
            
            const rowIndex = this.dropdown.selectedIndices.firstElement
            
            if (IS_DEFINED(rowIndex)) {
                
                this.dropdown.drawingData.insertElementAtIndex(rowIndex + 1, dataRow)
                this.reloadTableData()
                
            }
            else {
                
                this.dropdown.drawingData.push(dataRow)
                this.reloadTableData()
                this.dropdown._tableView.scrollToBottom()
                
            }
            
        }
        
        
        this.deleteButton.controlEventTargetAccumulator.PointerUpInside = () => {
            
            const rowIndex = this.dropdown.selectedIndices.firstElement
            
            if (IS_DEFINED(rowIndex)) {
                
                const selectedItem: CBDropdownDataItem<string> = this.dropdown.selectedData.firstElement || nil
                const key = LanguageService.stringForCurrentLanguage(selectedItem.title)
                
                delete LanguageService.languages[this.languageKeyTextField.text][key]
                
                this.dropdown.drawingData.removeElementAtIndex(rowIndex)
                
                this.dropdown.selectedData.removeElementAtIndex(0)
                this.dropdown.selectedIndices.removeElementAtIndex(0)
                
                this.dropdown.selectionDidChange(this.dropdown.selectedData)
                
            }
            
            this.reloadTableData()
            
        }
        
        
        this.deleteLanguageButton.controlEventTargetAccumulator.PointerUpInside = () => {
            
            if (this.languageKeyTextField.text && confirm("Are you sure you want to delete this language?")) {
                
                if (confirm("This will REMOVE THE LANGUAGE FROM THE SERVER, are you definitely sure?")) {
                    
                    CBCore.sharedInstance.socketClient.sendMessageForKey(
                        "DeleteLanguageWithKey",
                        this.languageKeyTextField.text,
                        function (
                            this: InternalLanguageSettingsViewController,
                            responseMessage: any,
                            respondWithMessage: CBSocketMessageSendResponseFunction
                        ) {
                            
                            LanguageService.useStoredLanguageValues(responseMessage)
                            this.updateAvailableKeys()
                            this.languageKeyTextField.text = nil
                            this.dropdown.data = []
                            this.updateitemDetailsView()
                            
                        }.bind(this)
                    )
                    
                }
                
            }
            
        }
        
        
        this.clearLanguageButton.controlEventTargetAccumulator.PointerUpInside = () => {
            
            if (this.languageKeyTextField.text && confirm("Are you sure you want to clear this language?")) {
                
                LanguageService.languages[this.languageKeyTextField.text] = {}
                this.dropdown.data = []
                this.dropdown.selectedData = []
                this.dropdown.selectedIndices = []
                this.updateitemDetailsView()
                
            }
            
        }
        
        
        this.loadJSONDataButton.controlEventTargetAccumulator.PointerUpInside = () => this.loadJSONData()
        
        
    }
    
    
    static override readonly routeComponentName = "internal_language_settings"
    
    static override readonly ParameterIdentifierName = {}
    
    reloadTableData() {
        this.dropdown._tableView.reloadData()
        const dataToShow: Record<string, string> = {}
        this.dropdown.drawingData.forEach((dataItem, index, array) => {
            
            dataToShow[FIRST(dataItem.itemCode, dataItem._id)] = dataItem.attachedObject
            
        })
        this.dataTextArea.text = JSON.stringify(dataToShow, null, 2)
    }
    
    
    updateAvailableKeys() {
        const codes = LanguageService.languages.allKeys
        this.languageKeysTextArea.text = "Saved keys: " + JSON.stringify(codes)
        if (codes.length && IS_NOT(this.languageKeyTextField.text)) {
            this.languageKeyTextField.text = codes.firstElement
            this.loadData()
        }
    }
    
    
    updateitemDetailsView() {
        const selectedItem: CBDropdownDataItem<string> = this.dropdown.selectedData.firstElement || nil
        if (IS(selectedItem)) {
            this.itemKeyTextField.text = LanguageService.stringForCurrentLanguage(selectedItem.title)
            this.itemTitleOrAttachedObjectTextArea.text = selectedItem.attachedObject
            this.itemTitleDidChange()
        }
    }
    
    loadData() {
        
        this._triggerLayoutViewSubviews()
        const dropdownData: CBDropdownDataItem<string>[] = []
        
        LanguageService.languages[this.languageKeyTextField.text].forEach((value: string, key: string) => {
            
            dropdownData.push({
                
                _id: key,
                title: LanguageService.localizedTextObjectForText(key),
                itemCode: key,
                dropdownCode: "Aasdasdasdasdasdasdasd",
                isADropdownDataRow: YES,
                isADropdownDataSection: NO,
                
                attachedObject: value
                
            })
            
        })
        
        this.dropdown.selectedData.removeElementAtIndex(0)
        this.dropdown.selectedIndices.removeElementAtIndex(0)
        this.dropdown.data = dropdownData
        
        this.reloadTableData()
        this.updateitemDetailsView()
        
    }
    
    
    async saveData() {
        
        const languageObject: Record<string, string> = {}
        const languageKey = this.languageKeyTextField.text
        this.dropdown.drawingData.forEach((dataItem, index, array) => {
            const staticLanguageObject = LanguageService.languageValues[languageKey]
            if (IS_NOT(staticLanguageObject[dataItem.itemCode] == dataItem.attachedObject)) {
                languageObject[dataItem.itemCode] = dataItem.attachedObject
            }
        })
        
        const responseMessage = (await SocketClient.RetrieveLanguageData(nil)).result
        
        responseMessage[this.languageKeyTextField.text] = languageObject
        
        // Send the data to server to be saved
        const response = await SocketClient.SaveLanguagesData(responseMessage)
        
        if (IS_NOT(response.errorResult)) {
            CBDialogViewShower.alert("Saved successfully.")
            LanguageService.useStoredLanguageValues(response.result)
            this.loadData()
            LanguageService.broadcastLanguageChangeEvent()
            this.view.rootView.setNeedsLayout()
        }
        else {
            CBDialogViewShower.alert("Failed to save dropdown data.")
        }
        
        this.updateAvailableKeys()
        
    }
    
    
    loadJSONData() {
        
        let itemTitles: Record<string, string> = {}
        
        try {
            itemTitles = JSON.parse(this.dataTextArea.text)
        } catch (exception) {
            CBDialogViewShower.alert("" + exception)
            return
        }
        
        LanguageService.languages[this.languageKeyTextField.text] = JSON.parse(JSON.stringify(
            LanguageService.languageValues[this.languageKeyTextField.text]
        )).objectByCopyingValuesRecursivelyFromObject(itemTitles)
        
        this.loadData()
        this.reloadTableData()
        
        if (this.dropdown.selectedIndices.length) {
            this.dropdown._selectedData = [this.dropdown.drawingData[this.dropdown.selectedIndices.firstElement]]
        }
        
        this.updateitemDetailsView()
        
    }
    
    
    itemTitleDidChange() {
        
        const selectedItem: CBDropdownDataItem<string> = this.dropdown.selectedData.firstElement || nil
        selectedItem.attachedObject = this.itemTitleOrAttachedObjectTextArea.text
        
        const languageObject = LanguageService.languages[this.languageKeyTextField.text] || {}
        languageObject[selectedItem.itemCode] = this.itemTitleOrAttachedObjectTextArea.text
        
    }
    
    
    loadSubjectData() {
        
    
    }
    
    
    override async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(InternalLanguageSettingsViewController.routeComponentName)
        
        this.reloadTableData()
        
    }
    
    
    override layoutViewSubviews() {
        
        super.layoutViewSubviews()
        
        const padding = this.core.paddingLength
        const labelHeight = padding
        
        // View bounds
        const bounds = this.view.bounds.rectangleWithInset(padding)
        
        this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight * 2)
        
        let rowFrame = this.titleLabel.frame.rectangleForNextRow(padding)
        rowFrame.distributeViewsAlongWidth([this.languageKeyTextField, this.loadButton, this.saveButton], [
            2, 1, 1
        ], padding)
        
        rowFrame = rowFrame.rectangleForNextRow(padding, labelHeight * 5)
        this.languageKeysTextArea.frame = rowFrame
        
        rowFrame = rowFrame.rectangleForNextRow(padding, labelHeight * 2)
        this.dropdown.frame = rowFrame.rectangleWithWidth(bounds.width * 0.5 - padding * 0.5)
        this.dropdown._tableView.frame = this.dropdown.frame.rectangleForNextRow(padding, 500)
        this.dropdown._tableView.setMargins(0, 0, padding, 0)
        
        const deleteAddFrame = this.dropdown.frame.rectangleForNextColumn(padding * 0.5, this.dropdown.frame.width +
            padding * 0.5)
        deleteAddFrame.distributeViewsAlongWidth([this.deleteButton, this.addButton], 1, padding)
        
        this.itemKeyTextField.frame = deleteAddFrame.rectangleForNextRow(padding)
        
        this.itemTitleOrAttachedObjectTextArea.frame = this.itemKeyTextField.frame.rectangleForNextRow(
            padding,
            labelHeight *
            11
        )
        
        this.itemTitleOrAttachedObjectTextArea.frame.rectangleForNextRow(padding, labelHeight *
            2).distributeViewsEquallyAlongWidth([this.deleteLanguageButton, this.clearLanguageButton], padding)
        
        this.dataTextJSONLabel.frame = this.languageKeysTextArea.frame.rectangleWithY(this.dropdown._tableView.frame.max.y +
            padding).rectangleWithHeight(labelHeight)
        
        this.dataTextArea.frame = this.dataTextJSONLabel.frame.rectangleForNextRow(padding, 500)
        
        this.dataTextArea.frame.rectangleForNextRow(padding, labelHeight *
            2).distributeViewsEquallyAlongWidth([this.loadJSONDataButton], padding)
        
        this.loadJSONDataButton.setMargins(0, 0, padding, 0)
        
    }
    
    
}








































































