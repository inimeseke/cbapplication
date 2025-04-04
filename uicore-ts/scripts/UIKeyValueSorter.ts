// @ts-ignore
import UIKeyValueSorterWebWorker from "./UIKeyValueSorterWebWorker.worker"
import { IS, IS_NOT, MAKE_ID, NO, UIObject, YES } from "./UIObject"


export interface UIKeyValueSorterSortingInstruction {
    
    keyPath: string;
    
    dataType: string;
    
    direction: string;
    
    
}


export class UIKeyValueSorter extends UIObject {
    
    static _sharedWebWorkerHolder = {
        UICore_completionFunctions: {},
        UICore_isWorking: false,
        UICore_messagesToPost: undefined,
        webWorker: new UIKeyValueSorterWebWorker()
    }
    
    static _instanceNumber = -1
    
    _instanceNumber: number
    _isThreadClosed = NO
    
    private readonly _webWorkerHolder: {
        webWorker: any;
        UICore_isWorking: boolean
        UICore_messagesToPost: any
        UICore_completionFunctions: Record<string, (
            filteredData: string[],
            filteredIndexes: number[],
            identifier: any
        ) => void>
    } = UIKeyValueSorter._sharedWebWorkerHolder
    
    
    constructor(useSeparateWebWorkerHolder = NO) {
        
        super()
        
        if (useSeparateWebWorkerHolder) {
            
            this._webWorkerHolder = {
                webWorker: new UIKeyValueSorterWebWorker(),
                UICore_isWorking: false,
                UICore_messagesToPost: undefined,
                UICore_completionFunctions: {}
            }
            
        }
        
        UIKeyValueSorter._instanceNumber = UIKeyValueSorter._instanceNumber + 1
        this._instanceNumber = UIKeyValueSorter._instanceNumber
        
        if (IS_NOT(this._webWorkerHolder.webWorker.onmessage)) {
    
            this._webWorkerHolder.webWorker.onmessage = (message: { data: { identifier: string; instanceIdentifier: string; sortedData: any[]; sortedIndexes: number[]; }; }) => {
        
                this.isWorkerBusy = NO
                this.postNextMessageIfNeeded()
        
                const key = "" + message.data.identifier + message.data.instanceIdentifier
        
                const completionFunction = this.completionFunctions[key]
        
                if (IS(completionFunction)) {
            
                    //console.log("Filtering took " + (Date.now() - startTime) + " ms");
            
                    completionFunction(message.data.sortedData, message.data.sortedIndexes, message.data.identifier)
            
                }
        
                delete this.completionFunctions[key]
        
                var asd = 1
                
            }
            
        }
        
        
    }
    
    
    get instanceIdentifier() {
        
        return this._instanceNumber
        
    }
    
    
    get completionFunctions() {
    
        const key = "UICore_completionFunctions"
        var result: {
        
            [x: string]: (sortedData: any[], sortedIndexes: number[], identifier: any) => void
        
        } = this._webWorkerHolder[key]
        
        if (IS_NOT(result)) {
    
            result = {}
            this._webWorkerHolder[key] = result
    
        }
    
        return result
        
    }
    
    get messagesToPost() {
    
        const key = "UICore_messagesToPost"
        var result: any[] = this._webWorkerHolder[key]
    
        if (IS_NOT(result)) {
        
            result = []
            this._webWorkerHolder[key] = result
        
        }
    
        return result
        
    }
    
    
    set isWorkerBusy(isWorkerBusy: boolean) {
    
        this._webWorkerHolder["UICore_isWorking"] = isWorkerBusy
        
    }
    
    get isWorkerBusy() {
    
        return IS(this._webWorkerHolder["UICore_isWorking"])
        
    }
    
    
    postNextMessageIfNeeded() {
        
        if (this.messagesToPost.length && IS_NOT(this.isWorkerBusy)) {
    
            this._webWorkerHolder.webWorker.postMessage(this.messagesToPost.firstElement)
            this.messagesToPost.removeElementAtIndex(0)
    
            this.isWorkerBusy = YES
    
        }
        
    }
    
    
    static dataType = {
        
        "string": "string",
        "number": "number"
        
    }
    
    
    static direction = {
        
        "descending": "descending",
        "ascending": "ascending"
        
    }
    
    
    sortData<T>(
        data: T[],
        sortingInstructions: UIKeyValueSorterSortingInstruction[],
        identifier: any,
        completion: (sortedData: T[], sortedIndexes: number[], identifier: any) => void
    ) {
        
        
        if (this._isThreadClosed) {
            
            return
            
        }
    
    
        const instanceIdentifier = this.instanceIdentifier
        
        const key = "" + identifier + instanceIdentifier
    
        this.completionFunctions[key] = completion
        
        
        try {
            
            this.messagesToPost.push({
    
                "data": data,
                "sortingInstructions": sortingInstructions,
                "identifier": identifier,
                "instanceIdentifier": instanceIdentifier
    
            })
    
            this.postNextMessageIfNeeded()
            
        } catch (exception) {
            
            completion([], [], identifier)
            
        }
        
        
    }
    
    
    sortedData<T>(
        data: T[],
        sortingInstructions: UIKeyValueSorterSortingInstruction[],
        identifier: any = MAKE_ID()
    ) {
    
        const result: Promise<{
        
            sortedData: T[],
            sortedIndexes: number[],
            identifier: any
        
        }> = new Promise((resolve, reject) => {
        
            this.sortData(data, sortingInstructions, identifier, (sortedData, sortedIndexes, sortedIdentifier) => {
            
                if (sortedIdentifier == identifier) {
                
                    resolve({
                    
                        sortedData: sortedData,
                        sortedIndexes: sortedIndexes,
                        identifier: sortedIdentifier
                    
                    })
                
                }
                
                
            })
        
        
        })
    
        return result
        
    }
    
    
    closeThread() {
        
        this._isThreadClosed = YES
        
        if (this._webWorkerHolder != UIKeyValueSorter._sharedWebWorkerHolder) {
    
            this._webWorkerHolder.webWorker.terminate()
            
        }
        
        
    }
    
    
}





































