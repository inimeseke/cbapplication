onmessage = function (event) {
    
    //console.log('Message received from main script');
    const workerResult = sortData(
        event.data.data,
        event.data.sortingInstructions
    )
    
    // @ts-ignore
    workerResult.identifier = event.data.identifier
    // @ts-ignore
    workerResult.instanceIdentifier = event.data.instanceIdentifier
    
    
    // @ts-ignore
    postMessage(workerResult)
    
}


function valueForKeyPath(keyPath: string, object: any) {
    
    var keys = keyPath.split(".")
    var currentObject = object
    
    for (var i = 0; i < keys.length; i++) {
        
        var key = keys[i]
        
        if (key.substring(0, 2) == "[]") {
            
            // This next object will be an array and the rest of the keys need to be run for each of the elements
            
            currentObject = currentObject[key.substring(2)]
            
            // CurrentObject is now an array
            
            var remainingKeyPath = keys.slice(i + 1).join(".")
            
            var currentArray = currentObject
            
            currentObject = currentArray.map(function (subObject: any, index: any, array: any) {
                
                var result = valueForKeyPath(remainingKeyPath, subObject)
                
                return result
                
            })
            
            break
            
        }
        
        currentObject = (currentObject || {})[key]
        
        
    }
    
    return currentObject
    
}


function compare(
    firstObject: { [x: string]: any },
    secondObject: { [x: string]: any },
    sortingInstructions: string | any[]
): number {
    
    if (sortingInstructions.length == 0) {
        return 0
    }
    
    const sortingInstruction = sortingInstructions[0]
    
    let directionMultiplier = 1
    if (sortingInstruction.direction == "descending") {
        directionMultiplier = -1
    }
    
    const firstDataString = firstObject[sortingInstruction.keyPath]
    const secondDataString = secondObject[sortingInstruction.keyPath]
    
    if (firstDataString < secondDataString) {
        return -1 * directionMultiplier
    }
    
    if (firstDataString > secondDataString) {
        return directionMultiplier
    }
    
    if (sortingInstructions.length > 1) {
        const remainingSortingInstructions = sortingInstructions.slice(1)
        return compare(firstObject, secondObject, remainingSortingInstructions)
    }
    
    return 0
    
}


function sortData(data: any[], sortingInstructions: any[]) {
    
    
    const sortingObjects = data.map(function (dataItem: any, index: any, array: any) {
        
        const result: { _UIKeyValueStringSorterWebWorkerSortingObjectIndex: any } & Record<string, string | number> = {
            
            "_UIKeyValueStringSorterWebWorkerSortingObjectIndex": index
            
        }
        
        
        sortingInstructions.forEach((instruction: { keyPath: string | number, dataType:string }) => {
            
            if (instruction.dataType == "string") {
                
                result[instruction.keyPath] = JSON.stringify(valueForKeyPath("" + instruction.keyPath, dataItem) || "")
                    .toLowerCase()
                
            }
            else if (instruction.dataType == "number") {
                
                result[instruction.keyPath] = valueForKeyPath("" + instruction.keyPath, dataItem)
                
            }
            
        })
        
        return result
        
    })
    
    
    const sortedData = sortingObjects.sort((firstObject: any, secondObject: any) => compare(
        firstObject,
        secondObject,
        sortingInstructions
    ))
    
    const sortedIndexes = sortedData.map((
        object: { _UIKeyValueStringSorterWebWorkerSortingObjectIndex: any }
    ) => object._UIKeyValueStringSorterWebWorkerSortingObjectIndex)
    
    return {
        
        "sortedData": sortedIndexes.map(sortedIndex => data[sortedIndex]),
        "sortedIndexes": sortedIndexes
        
    }
    
    
}
























