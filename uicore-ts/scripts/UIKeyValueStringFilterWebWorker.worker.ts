// @ts-check

if ("contains" in Array.prototype == false) {
    
    // @ts-ignore
    Array.prototype.contains = function (element) {
        
        var result = (this.indexOf(element) != -1)
        return result
        
    }
    
}

if ("contains" in String.prototype == false) {
    
    // @ts-ignore
    String.prototype.contains = function (string) {
        
        var result = (this.indexOf(string) != -1)
        return result
        
    }
    
}


onmessage = function (event) {
    
    //console.log('Message received from main script');
    var workerResult = filterKeyValuePathData(
        event.data.filteringString,
        event.data.data,
        event.data.excludedData,
        event.data.dataKeyPath
    )
    
    // @ts-ignore
    workerResult.identifier = event.data.identifier
    // @ts-ignore
    workerResult.instanceIdentifier = event.data.instanceIdentifier
    
    
    // @ts-ignore
    postMessage(workerResult)
    
}


function filterKeyValuePathData(filteringString: string, data: any[], excludedData: string | any[], dataKeyPath: any) {
    
    function valueForKeyPath(keyPath: string, object: any) {
        
        var keys = keyPath.split(".")
        var currentObject = object
        
        keys.forEach(function (key: string | number, index: any, array: any) {
            currentObject = currentObject[key]
        })
        
        return currentObject
        
    }
    
    var filteredData = []
    var filteredIndexes: any[] = []
    
    if (filteringString) {
    
        var filteringStringWords: any[] = []
        filteringString.split(" ").forEach(function (word: string, index: any, array: any) {
            if (word) {
                filteringStringWords.push(word.toLowerCase())
            }
        })
    
        data.forEach(function (dataObject: any, index: any, array: any) {
        
            var dataString = valueForKeyPath(dataKeyPath, dataObject)
        
            var lowercaseDataString = dataString.toLowerCase()
        
            // Look through all the words in the input
            var wordsFound: boolean[] = []
            filteringStringWords.forEach(function (word) {
                wordsFound.push(lowercaseDataString.contains(word) && !excludedData.contains(dataString))
            })
            
            // Only show the dataString if it matches all of them
            // @ts-ignore
            if (wordsFound.contains(true) && !wordsFound.contains(false)) {
                
                filteredData.push(dataObject)
                filteredIndexes.push(index)
                
            }
            
        })
        
        
        
    }
    else if (excludedData.length) {
    
    
        data.forEach(function (dataObject: any, index: any, array: any) {
        
            if (excludedData.indexOf(dataObject) == -1) {
            
                filteredData.push(dataObject)
                filteredIndexes.push(index)
            
            }
        
        })
        
    }
    else {
        
        filteredData = data
    
        data.forEach(function (object: any, index: any, array: any) {
        
            filteredIndexes.push(index)
        
        })
        
    }
    
    
    
    return { "filteredData": filteredData, "filteredIndexes": filteredIndexes }
    
    
    
}
























