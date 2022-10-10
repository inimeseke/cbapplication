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
    const workerResult = filterData(event.data.filteringString, event.data.data, event.data.excludedData)
    
    // @ts-ignore
    workerResult.identifier = event.data.identifier
    // @ts-ignore
    workerResult.instanceIdentifier = event.data.instanceIdentifier
    
    // @ts-ignore
    postMessage(workerResult)
    
}


function filterData(filteringString: string, data: any[], excludedData: string | any[]) {
    
    let filteredData = []
    const filteredIndexes: number[] = []
    
    if (filteringString) {
        
        const filteringStringWords: string[] = []
        filteringString.split(" ").forEach(word => {
            if (word) {
                filteringStringWords.push(word.toLowerCase())
            }
        })
        
        data.forEach((dataString, index) => {
            
            const lowercaseDataString = dataString.toLowerCase()
            
            // Look through all the words in the input
            const wordsFound: boolean[] = []
            filteringStringWords.forEach(function (word) {
                wordsFound.push(lowercaseDataString.contains(word) && !excludedData.contains(dataString))
            })
            
            // Only show the dataString if it matches all of them
            if (wordsFound.contains(true) && !wordsFound.contains(false)) {
                filteredData.push(dataString)
                filteredIndexes.push(index)
            }
            
        })
        
    }
    else if (excludedData.length) {
        
        data.forEach((dataString, index) => {
            
            if (excludedData.indexOf(dataString) == -1) {
                filteredData.push(dataString)
                filteredIndexes.push(index)
            }
            
        })
        
    }
    else {
        
        filteredData = data
        data.forEach((string, index) => filteredIndexes.push(index))
        
    }
    
    return { "filteredData": filteredData, "filteredIndexes": filteredIndexes }
    
}
























