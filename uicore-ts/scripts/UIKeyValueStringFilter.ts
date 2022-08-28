import { IS, IS_NOT, NO, UIObject, YES } from "./UIObject"
// @ts-ignore
import UIKeyValueStringFilterWebWorker from "./UIKeyValueStringFilterWebWorker.worker.js"





export class UIKeyValueStringFilter extends UIObject {
    
    
    static _sharedWebWorkerHolder = { webWorker: new UIKeyValueStringFilterWebWorker() }
    
    static _instanceNumber = -1
    
    
    _instanceNumber: number
    
    _isThreadClosed = NO
    
    private _webWorkerHolder = UIKeyValueStringFilter._sharedWebWorkerHolder
    
    constructor(useSeparateWebWorkerHolder = NO) {
        
        
        super()
        
        if (useSeparateWebWorkerHolder) {
    
            this._webWorkerHolder = { webWorker: new UIKeyValueStringFilterWebWorker() }
            
        }
        
        UIKeyValueStringFilter._instanceNumber = UIKeyValueStringFilter._instanceNumber + 1
        this._instanceNumber = UIKeyValueStringFilter._instanceNumber
        
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
        data: any[],
        excludedData: string[],
        dataKeyPath: string,
        identifier: any,
        completion: (filteredData: string[], filteredIndexes: number[], identifier: any) => void
    ) {
        
        
        if (this._isThreadClosed) {
            
            return
            
        }
        
        
        
        const instanceIdentifier = this.instanceIdentifier
        
        const key = "" + identifier + instanceIdentifier
        
        this.completionFunctions[key] = completion
        
        
        try {
            
            this.messagesToPost.push({
                
                "filteringString": filteringString,
                "data": data,
                "excludedData": excludedData,
                "dataKeyPath": dataKeyPath,
                "identifier": identifier,
                "instanceIdentifier": instanceIdentifier
                
            })
            
            this.postNextMessageIfNeeded()
            
        } catch (exception) {
            
            completion([], [], identifier)
            
        }
        
        
        
        
        
    }
    
    
    
    
    
    closeThread() {
        
        this._isThreadClosed = YES
        
        if (this._webWorkerHolder != UIKeyValueStringFilter._sharedWebWorkerHolder) {
            
            this._webWorkerHolder.webWorker.terminate()
            
        }
        
        
        
    }
    
    
    
    
    
}





































