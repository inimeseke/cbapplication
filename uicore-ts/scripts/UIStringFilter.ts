import { IS, IS_NOT, MAKE_ID, NO, UIObject, YES } from "./UIObject"
// @ts-ignore
import UIStringFilterWebWorker from "./UIStringFilterWebWorker.worker.js"


export class UIStringFilter extends UIObject {
    
    
    
    
    
    static _sharedWebWorkerHolder = { webWorker: new UIStringFilterWebWorker() }
    
    static _instanceNumber = -1
    
    
    _instanceNumber: number
    
    _isThreadClosed = NO
    
    private readonly _webWorkerHolder = UIStringFilter._sharedWebWorkerHolder
    
    
    
    constructor(useSeparateWebWorkerHolder = NO) {
        
        super()
        
        if (useSeparateWebWorkerHolder) {
    
            this._webWorkerHolder = {
                webWorker: new UIStringFilterWebWorker()
            }
    
        }
        
        UIStringFilter._instanceNumber = UIStringFilter._instanceNumber + 1
        this._instanceNumber = UIStringFilter._instanceNumber
        
        if (IS_NOT(this._webWorkerHolder.webWorker.onmessage)) {
            
            this._webWorkerHolder.webWorker.onmessage = message => {
    
                this.isWorkerBusy = NO
                this.postNextMessageIfNeeded()
    
                const key = "" + message.data.identifier + message.data.instanceIdentifier
    
                const completionFunction = this.completionFunctions[key]
    
                if (IS(completionFunction)) {
        
                    //console.log("Filtering took " + (Date.now() - startTime) + " ms");
        
                    completionFunction(message.data.filteredData, message.data.filteredIndexes, message.data.identifier)
        
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
        
            [x: string]: (filteredData: string[], filteredIndexes: number[], identifier: any) => void;
        
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
    
    
    
    
    
    filterData(
        filteringString: string,
        data: string[],
        excludedData: string[],
        identifier: any,
        completion: (filteredData: string[], filteredIndexes: number[], identifier: any) => void
    ) {
        
        
        if (this._isThreadClosed) {
            
            return
            
        }
        
        //var startTime = Date.now();
        
        const instanceIdentifier = this.instanceIdentifier
        
        const key = "" + identifier + instanceIdentifier
        
        this.completionFunctions[key] = completion
        
        this.messagesToPost.push({
    
            "filteringString": filteringString,
            "data": data,
            "excludedData": excludedData,
            "identifier": identifier,
            "instanceIdentifier": instanceIdentifier
    
        })
    
        this.postNextMessageIfNeeded()
        
        
    }
    
    
    filteredData(
        filteringString: string,
        data: string[],
        excludedData: string[] = [],
        identifier: any = MAKE_ID()
    ) {
        
        
        const result: Promise<{
            
            filteredData: string[],
            filteredIndexes: number[],
            identifier: any
            
        }> = new Promise((resolve, reject) => {
            
            this.filterData(filteringString, data, excludedData, identifier,
                (filteredData, filteredIndexes, filteredIdentifier) => {
                    
                    if (filteredIdentifier == identifier) {
                        
                        resolve({
                            
                            filteredData: filteredData,
                            filteredIndexes: filteredIndexes,
                            identifier: filteredIdentifier
                            
                        })
                        
                    }
                    
                    
                }
            )
            
            
        })
        
        return result
        
        
    }
    
    
    
    
    
    closeThread() {
        
        this._isThreadClosed = YES
        
        if (this._webWorkerHolder != UIStringFilter._sharedWebWorkerHolder) {
    
            this._webWorkerHolder.webWorker.terminate()
            
        }
        
        
        
    }
    
    
    
    
    
}





































