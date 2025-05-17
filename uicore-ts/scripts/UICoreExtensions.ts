import { UICoreExtensionValueObject } from "./UICoreExtensionValueObject"
import { UIObject } from "./UIObject"


declare global {
    
    
    interface Array<T> {
    
        removeElementAtIndex(index: number): void;
    
        removeElement(element: T): void;
    
        insertElementAtIndex(index: number, element: T): void;
    
        replaceElementAtIndex(index: number, element: T): void;
    
    
        contains(element: T): boolean;
    
        findAsyncSequential(functionToCall: (value: any) => Promise<boolean>): Promise<any>;
    
        groupedBy<T>(keyFunction: (item: T) => any): { [key: string]: Array<T> } & Object;
        
        uniqueMap<T, R>(keyFunction: (item: T) => R): R[]; 
    
        copy(): Array<T>;
        
        arrayByRepeating(numberOfRepetitions: number): Array<T>;
        
        arrayByTrimmingToLengthIfLonger(maxLength: number): Array<T>;
        
        anyMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
        
        noneMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
        
        allMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
        
        firstElement: T;
        lastElement: T;
        readonly summedValue: T;
        
        everyElement: UIEveryElementItem<T>;
        
        max(): number;
        
        min(): number;
        
        average(): number;
        
        isEqualToArray(array: Array<T>, keyPath?: string): boolean;
        
    }
    
    
    interface String {
    
        contains(string: string): boolean;
    
        readonly numericalValue: number;
        readonly integerValue: number;
        isAString: boolean;
    
    }
    
    
    interface Number {
        
        isANumber: boolean;
        
        readonly integerValue: number;
        
        constrainedValue(min: number, max: number): number;
        
    }
    
    
    interface Date {
        
        readonly dateString: string;
        
    }
    
    
    interface Object {
    
        forEach(callbackFunction: (value: any, key: string, stopLooping: () => void) => void): void;
        
        objectByCopyingValuesRecursivelyFromObject<T extends object>(object: T): T & this;
    
        readonly allValues: Array<any>;
        readonly allKeys: (keyof this)[];
    
    }
    
}

export {}

const YES = true
const NO = false

if ("removeElementAtIndex" in Array.prototype == NO) {
    
    (Array.prototype as any).removeElementAtIndex = function (this: Array<any>, index: number) {
        
        // @ts-ignore
        if (index >= 0 && index < this.length) {
            this.splice(index, 1)
        }
        
    }
    
}


// interface Array<T> {
//
//     removeElementAtIndex(index: number);
//
// }


if ("removeElement" in Array.prototype == NO) {
    
    (Array.prototype as any).removeElement = function (this: Array<any>, element: any) {
        this.removeElementAtIndex(this.indexOf(element))
    }
    
}


// interface Array<T> {
//
//     removeElement(element: T);
//
// }


if ("insertElementAtIndex" in Array.prototype == NO) {
    
    (Array.prototype as any).insertElementAtIndex = function (this: Array<any>, index: number, element: any) {
        
        if (index >= 0 && index <= this.length) {
            this.splice(index, 0, element)
        }
        
    }
    
}


// interface Array<T> {
//
//     insertElementAtIndex(index: number, element: T);
//
// }


if ("replaceElementAtIndex" in Array.prototype == NO) {
    
    (Array.prototype as any).replaceElementAtIndex = function (this: Array<any>, index: number, element: any) {
        
        this.removeElementAtIndex(index)
        this.insertElementAtIndex(index, element)
        
    }
    
}


// interface Array<T> {
//
//     replaceElementAtIndex(index: number, element: T);
//
// }


if ("contains" in Array.prototype == NO) {
    
    (Array.prototype as any).contains = function (this: Array<any>, element: any) {
        return (this.indexOf(element) != -1)
    }
    
}

if ("containsAny" in Array.prototype == NO) {
    
    (Array.prototype as any).containsAny = function (this: Array<any>, elements: any[]) {
        return this.anyMatch(element => elements.contains(element))
    }
    
}


// interface Array<T> {
//
//     contains(element: T): boolean;
//
//     containsAny(element: T[]): boolean;
//
// }


if ("anyMatch" in Array.prototype == NO) {
    
    (Array.prototype as any).anyMatch = function (
        this: Array<any>,
        functionToCall: (value: any, index: number, array: any[]) => boolean
    ) {
        // @ts-ignore
        return (this.findIndex(functionToCall) > -1)
    }
    
}

if ("noneMatch" in Array.prototype == NO) {
    
    (Array.prototype as any).noneMatch = function (
        this: Array<any>,
        functionToCall: (value: any, index: number, array: any[]) => boolean
    ) {
        // @ts-ignore
        return (this.findIndex(functionToCall) == -1)
    }
    
}

if ("allMatch" in Array.prototype == NO) {
    
    (Array.prototype as any).allMatch = function (
        this: Array<any>,
        functionToCall: (value: any, index: number, array: any[]) => boolean
    ) {
        
        function reversedFunction(value: any, index: number, array: any[]) {
            return !functionToCall(value, index, array)
        }
        
        // @ts-ignore
        return (this.findIndex(reversedFunction) == -1)
        
    }
    
}

if ("findAsyncSequential" in Array.prototype == NO) {
    
    (Array.prototype as any).findAsyncSequential = function (
        this: Array<any>,
        functionToCall: (value: any) => Promise<boolean>
    ) {
        
        // https://stackoverflow.com/questions/55601062/using-an-async-function-in-array-find
        async function findAsyncSequential<T>(
            array: T[],
            predicate: (t: T) => Promise<boolean>
        ): Promise<T | undefined> {
            for (const t of array) {
                if (await predicate(t)) {
                    return t
                }
            }
            return undefined
        }
    
        return findAsyncSequential(this, functionToCall)
        
    }
    
}


// interface Array<T> {
//
//     anyMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
//
//     noneMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
//
//     allMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
//
// }


if ("groupedBy" in Array.prototype == NO) {
    
    Array.prototype.groupedBy = function (this: Array<any>, funcProp) {
        return this.reduce(function (acc, val) {
            (acc[funcProp(val)] = acc[funcProp(val)] || []).push(val)
            return acc
        }, {})
    }
    
}

if ("uniqueMap" in Array.prototype == NO) {
    
    Array.prototype.uniqueMap = function (this: Array<any>, funcProp) {
        
        const result: any[] = []
        
        for (let i = 0; i < this.length; i++){
            
            const element = this[i]
            const elementResult = funcProp(element)
            
            if (!result.contains(elementResult)) {
                result.push(elementResult);
            }
            
        }
        
        return result;
        
    }
    
}


// interface Array<T> {
//
//     groupedBy(keyFunction: (item: T) => any): { [key: string]: Array<T> };
//
// }


if ("firstElement" in Array.prototype == NO) {
    Object.defineProperty(Array.prototype, "firstElement", {
        get: function firstElement(this: Array<any>) {
            return this[0]
        },
        set: function (this: Array<any>, element: any) {
            if (this.length == 0) {
                this.push(element)
                return
            }
            this[0] = element
        }
    })
}

if ("lastElement" in Array.prototype == NO) {
    Object.defineProperty(Array.prototype, "lastElement", {
        get: function lastElement(this: Array<any>) {
            return this[this.length - 1]
        },
        set: function (this: Array<any>, element: any) {
            if (this.length == 0) {
                this.push(element)
                return
            }
            this[this.length - 1] = element
        }
    })
}

if ("everyElement" in Array.prototype == NO) {
    
    Object.defineProperty(Array.prototype, "everyElement", {
        
        get: function everyElement(this: Array<any>) {
    
            const valueKeys: string[] = []
    
            const targetFunction = (objects: any) => {
        
                return this.map((element) => {
            
                    const thisObject = UIObject.valueForKeyPath(
                        valueKeys.arrayByTrimmingToLengthIfLonger(valueKeys.length - 1).join("."),
                        element
                    ) || element
            
                    const elementFunction = (UIObject.valueForKeyPath(valueKeys.join("."), element) as Function)?.bind(
                        thisObject,
                        objects
                    )
                    
                    return elementFunction?.()
                    
                })
                
            }
    
            const result: any = new Proxy(
                targetFunction,
                {
            
                    get: (target, key: string, _receiver) => {
                
                        if (key == "UI_elementValues") {
                            return this.map(element => UIObject.valueForKeyPath(
                                valueKeys.join("."),
                                element
                            ))
                        }
                
                        valueKeys.push(key)
                        
                        return result
                        
                    },
                    set: (target, key: string, value, _receiver) => {
                
                        valueKeys.push(key)
                        this.forEach(element => UIObject.setValueForKeyPath(valueKeys.join("."), value, element, YES))
                        return true
                
                    }
                    
                }
            )
            
            return result
            
        },
        set: function (this: Array<any>, element: any) {
            for (let i = 0; i < this.length; ++i) {
                this[i] = element
            }
        }
        
    })
    
}


export type UIEveryElementItem<T> = {
    
    [P in keyof T]: UIEveryElementItem<T[P]>
    
} & {
    
    UI_elementValues?: T[];
    
} & T

// interface Array<T> {
//
//     firstElement: T;
//     lastElement: T;
//
//     everyElement: UIEveryElementItem<T>;
//
// }


if ("copy" in Array.prototype == NO) {
    
    (Array.prototype as any).copy = function (this: Array<any>) {
        return this.slice(0)
    }
    
}


// interface Array<T> {
//
//     copy(): Array<T>;
//
// }


if ("arrayByRepeating" in Array.prototype == NO) {
    
    (Array.prototype as any).arrayByRepeating = function (this: Array<any>, numberOfRepetitions: number) {
        const result: any[] = []
        for (let i = 0; i < numberOfRepetitions; i++) {
            this.forEach(element => result.push(element))
        }
        return result
    }
    
}


// interface Array<T> {
//
//     arrayByRepeating(numberOfRepetitions: number): Array<T>;
//
// }


if ("arrayByTrimmingToLengthIfLonger" in Array.prototype == NO) {
    (Array.prototype as any).arrayByTrimmingToLengthIfLonger = function (this: Array<any>, maxLength: number) {
        const result = []
        for (let i = 0; i < maxLength && i < this.length; i++) {
            result.push(this[i])
        }
        return result
    }
}


// interface Array<T> {
//
//     arrayByTrimmingToLengthIfLonger(maxLength: number): Array<T>;
//
// }


if ("summedValue" in Array.prototype == NO) {
    
    Object.defineProperty(Array.prototype, "summedValue", {
        get: function summedValue(this: Array<any>) {
            return this.reduce(function (a, b) {
                return a + b
            }, 0)
        }
    })
    
}


// interface Array<T> {
//
//     readonly summedValue: T;
//
//     max(): number;
//     min(): number;
//
//
// }

Array.prototype.max = function () {
    return Math.max.apply(null, this)
}

Array.prototype.min = function () {
    return Math.min.apply(null, this)
}

if (!Array.prototype.average) {
    
    Array.prototype.average = function () {
        if (this.length == 0) {
            return 0;
        }
        const sum = this.reduce((a, b) => a + b, 0)
        return sum / this.length
    }
    
}

// interface Array<T> {
//
//     isEqualToArray(array: Array<T>, keyPath?: string): boolean;
//
// }


if ("isEqualToArray" in Array.prototype == NO) {
    
    // attach the .equals method to Array's prototype to call it on any array
    Array.prototype.isEqualToArray = function (array: any[], keyPath?: string) {
        
        // if the other array is a falsy value, return
        if (!array) {
            return false
        }
        
        // compare lengths - can save a lot of time
        if (this.length != array.length) {
            return false
        }
        
        var i = 0
        const l = this.length
        for (; i < l; i++) {
            
            // Check if we have nested arrays
            if (this[i] instanceof Array && array[i] instanceof Array && !keyPath) {
                
                // recurse into the nested arrays
                if (!this[i].isEqualToArray(array[i])) {
                    return false
                }
                
            }
            else if (keyPath && UIObject.valueForKeyPath(keyPath, this[i]) != UIObject.valueForKeyPath(
                keyPath,
                array[i]
            )) {
                
                return false
                
            }
            else if (this[i] != array[i]) {
                
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false
                
            }
            
        }
        
        return true
        
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Array.prototype, "isEqualToArray", { enumerable: false })
    
}


if ("forEach" in Object.prototype == NO) {
    
    (Object.prototype as any).forEach = function (
        this: Record<string, any>,
        callbackFunction: (
            value: any,
            key: string,
            stopLooping: Function
        ) => void
    ) {
        const keys = Object.keys(this)
        let shouldStopLooping = NO
        
        function stopLooping() {
            shouldStopLooping = YES
        }
        
        keys.anyMatch(key => {
            callbackFunction(this[key], key, stopLooping)
            return shouldStopLooping
        })
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Object.prototype, "forEach", { enumerable: false })
    
}


// interface Object {
//
//     forEach(callbackFunction: (value: any, key: string) => void): void;
//
// }


if ("allValues" in Object.prototype == NO) {
    Object.defineProperty(Object.prototype, "allValues", {
        get: function (this: Object) {
            const values: any[] = []
            this.forEach((value: any) => {
                values.push(value)
            })
            return values
        },
        enumerable:  NO
    })
}


// interface Object {
//
//     readonly allValues: Array<any>;
//
// }


if ("allKeys" in Object.prototype == NO) {
    Object.defineProperty(Object.prototype, "allKeys", {
        get: function (this: Object) {
            return Object.keys(this)
        },
        enumerable: NO
    })
}


// interface Object {
//
//     readonly allKeys: string[];
//
// }


if ("objectByCopyingValuesRecursivelyFromObject" in Object.prototype == NO) {
    
    (Object.prototype as any).objectByCopyingValuesRecursivelyFromObject = function (this: Object, object: any) {
        
        
        function isAnObject(item: any) {
            return (item && typeof item === "object" && !Array.isArray(item))
        }
        
        function mergeRecursively(target: any, source: any) {
            
            const output = Object.assign({}, target)
            
            if (isAnObject(target) && isAnObject(source)) {
                
                Object.keys(source).forEach(function (key) {
                    
                    if (isAnObject(source[key])) {
                        
                        // if (!(key in target)) {
                        
                        //     Object.assign(output, { [key]: source[key] });
                        
                        // }
                        // else {
                        
                        output[key] = mergeRecursively(target[key] ?? {}, source[key])
                        
                        //}
                        
                    }
                    else {
                        
                        Object.assign(output, { [key]: source[key] })
                        
                    }
                    
                })
                
            }
            
            return output
            
        }
    
        return mergeRecursively(this, object)
        
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Object.prototype, "objectByCopyingValuesRecursivelyFromObject", { enumerable: false })
    
}


if ("asValueObject" in Object.prototype == NO) {
    
    (Object.prototype as any).asValueObject = function () {
    
        return new UICoreExtensionValueObject(this)
        
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Object.prototype, "asValueObject", { enumerable: false })
    
}


// interface Object {
//
//     objectByCopyingValuesRecursivelyFromObject<T>(object: T): this & T;
//
//     asValueObject(): this;
//
// }

// export type Unpacked<T> =
//     T extends (infer U)[]
//         ? U
//         : T extends (...args: any[]) => infer U
//             ? U
//             : T extends Promise<infer U>
//                 ? U
//                 : T
//
// export type UnpackedObject<T> = {
//     [P in keyof T]: Unpacked<T[P]>
// }

// export function promisedProperties<ObjectType extends Record<string, any>>(object: ObjectType): UnpackedObject<ObjectType> {
//
//     let promisedProperties: any[] = []
//     const objectKeys = Object.keys(object)
//
//     objectKeys.forEach((key) => promisedProperties.push(object[key]))
//
//     // @ts-ignore
//     return Promise.all(promisedProperties)
//         .then((resolvedValues) => {
//             return resolvedValues.reduce((resolvedObject, property, index) => {
//                 resolvedObject[objectKeys[index]] = property
//                 return resolvedObject
//             }, object)
//         })
//
// }

// if ("promisedProperties" in Object.prototype == NO) {
//
//     (Object.prototype as any).promisedProperties = function () {
//
//         const result = promisedProperties(this);
//
//         return result
//
//     }
//
//     // Hide method from for-in loops
//     Object.defineProperty(Object.prototype, "promisedProperties", { enumerable: false });
//
// }
//
//
// interface Object {
//
//     readonly promisedProperties: UnpackedObject<this>;
//
// }


if ("contains" in String.prototype == NO) {
    
    (String.prototype as any).contains = function (this: String, string: string) {
        return (this.indexOf(string) != -1)
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Object.prototype, "contains", { enumerable: false })
    
}


// interface String {
//
//     contains(string): boolean;
//
// }


if ("capitalizedString" in String.prototype == NO) {
    Object.defineProperty(Object.prototype, "capitalizedString", {
        get: function (this: String) {
            return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase()
        },
        enumerable: NO
    })
}


// interface String {
//
//     readonly capitalizedString: string;
//
// }


if ("numericalValue" in String.prototype == NO) {
    Object.defineProperty(String.prototype, "numericalValue", {
        get: function numericalValue(this: string) {
            return Number(this)
        }
    })
}

if ("integerValue" in String.prototype == NO) {
    Object.defineProperty(String.prototype, "integerValue", {
        get: function integerValue(this: string) {
            return Number(this).integerValue
        }
    })
}


// interface String {
//
//     readonly numericalValue: number;
//
// }


if ("isAString" in String.prototype == NO) {
    
    (String.prototype as any).isAString = YES
    
}


// interface String {
//
//     isAString: boolean;
//
// }


if ("isANumber" in Number.prototype == NO) {
    
    (Number.prototype as any).isANumber = YES
    
}


// interface Number {
//
//     isANumber: boolean;
//
// }


if ("integerValue" in Number.prototype == NO) {
    Object.defineProperty(Number.prototype, "integerValue", {
        get: function (this: number) {
            return parseInt("" + (Math.round(this) + 0.5))
        },
        enumerable: NO
    })
}

if ("constrainedValue" in Number.prototype == NO) {
    
    (Number.prototype as any).constrainedValue = function (this: number, min: number, max: number) {
        if (this < min) {
            return min;
        }
        if (this > max) {
            return max;
        }
        return this
    }
    
    // Hide method from for-in loops
    Object.defineProperty(Number.prototype, "constrainedValue", {
        enumerable: NO
    })
    
}


// interface Number {
//
//     readonly integerValue: number;
//
// }


if ("integerValue" in Boolean.prototype == NO) {
    
    Object.defineProperty(Boolean.prototype, "integerValue", {
        get: function (this: boolean) {
            if (this == true) {
                return 1
            }
            return 0
        }
    })
    
}


// interface Boolean {
//
//     readonly integerValue: number;
//
// }


if ("dateString" in Date.prototype == NO) {
    
    Object.defineProperty(Date.prototype, "dateString", {
        get: function dateString(this: Date) {
            return ("0" + this.getDate()).slice(-2) + "-" + ("0" + (this.getMonth() + 1)).slice(-2) + "-" +
                this.getFullYear() + " " + ("0" + this.getHours()).slice(-2) + ":" +
                ("0" + this.getMinutes()).slice(-2)
        }
    })
    
    
}


// interface Date {
//
//     readonly dateString: string;
//
// }








