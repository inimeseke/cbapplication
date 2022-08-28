import { UICoreExtensionValueObject } from "./UICoreExtensionValueObject"
import { UITimer } from "./UITimer"


export function NilFunction() {
    return nil
}



export var nil: any = new Proxy(Object.assign(NilFunction, { "class": nil, "className": "Nil" }), {
    
    get(target, name) {
        
        if (name == Symbol.toPrimitive) {
            
            return function (hint) {
                if (hint == "number") {
                    return 0
                }
                if (hint == "string") {
                    return ""
                }
                return false
            }
            
        }
        
        if (name == "toString") {
            
            return function toString() {
                return ""
            }
            
        }
        
        return NilFunction()
    },
    
    set(target, name, value) {
        return NilFunction()
    }
    
})





export function wrapInNil<T>(object?: T): T {
    
    
    let result = FIRST_OR_NIL(object)
    
    if (object instanceof Object && !(object instanceof Function)) {
        
        result = new Proxy(object as Object & T, {
            
            get(target, name) {
                
                if (name == "wrapped_nil_target") {
                    
                    return target
                    
                }
                
                
                const value = Reflect.get(target, name)
                
                if (typeof value === "object") {
                    
                    return wrapInNil(value)
                    
                }
                
                if (IS_NOT_LIKE_NULL(value)) {
                    
                    return value
                    
                }
                
                return nil
                
            },
            
            set(target, name, value) {
                
                if (IS(target)) {
                    
                    target[name] = value
                    
                }
                
                return YES
                
            }
            
        })
        
    }
    
    return result
    
}


export const YES = true
export const NO = false

export function IS(object) {
    
    if (object && object !== nil) {
        
        return YES
        
    }
    
    return NO
    
    //return (object != nil && object);
    
}

export function IS_NOT(object) {
    
    return !IS(object)
    
}

export function IS_DEFINED(object) {
    
    if (object != undefined) {
        
        return YES
        
    }
    
    return NO
    
}

export function IS_UNDEFINED(object) {
    
    return !IS_DEFINED(object)
    
}

export function IS_NIL(object) {
    
    if (object === nil) {
        
        return YES
        
    }
    
    return NO
    
}

export function IS_NOT_NIL(object) {
    
    return !IS_NIL(object)
    
}


export function IS_LIKE_NULL(object) {
    
    return (IS_UNDEFINED(object) || IS_NIL(object) || object == null)
    
}

export function IS_NOT_LIKE_NULL(object) {
    
    return !IS_LIKE_NULL(object)
    
}


export function IS_AN_EMAIL_ADDRESS(email: string) {
    const re = /\S+@\S+\.\S+/
    return re.test(email)
}


export function FIRST_OR_NIL<T>(...objects: T[]): T {
    
    const result = objects.find(function (object, index, array) {
        
        return IS(object)
        
    })
    
    return result || nil
    
}

export function FIRST<T>(...objects: T[]): T {
    
    const result = objects.find(function (object, index, array) {
        
        return IS(object)
        
    })
    
    return result || IF(IS_DEFINED(objects.lastElement))(RETURNER(objects.lastElement))()
    
}


export function MAKE_ID(randomPartLength = 15) {
    
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    
    for (let i = 0; i < randomPartLength; i++) {
        
        result = result + characters.charAt(Math.floor(Math.random() * characters.length))
        
    }
    
    result = result + Date.now()
    
    return result
    
}


export function RETURNER<T>(value?: T) {
    
    return (...objects: any[]) => value
    
}





export type UIIFBlockReceiver<T> = (functionToCall: () => any) => UIIFEvaluator<T>;

export type UIIFEvaluatorBase<T> = () => T;


export interface UIIFEvaluator<T> extends UIIFEvaluatorBase<T> {
    
    ELSE_IF: (otherValue: any) => UIIFBlockReceiver<T>;
    ELSE: (functionToCall: () => any) => T;
    
}


export function IF<T = any>(value: any): UIIFBlockReceiver<T> {
    
    let thenFunction = nil
    let elseFunction = nil
    
    const result: any = function (functionToCall: () => T) {
        thenFunction = functionToCall
        return result.evaluateConditions
    }
    
    
    result.evaluateConditions = function () {
        if (IS(value)) {
            return thenFunction()
        }
        return elseFunction()
    }
    
    
    result.evaluateConditions.ELSE_IF = function (otherValue: any) {
        
        const functionResult = IF(otherValue) as (UIIFBlockReceiver<T> & { evaluateConditions: UIIFEvaluator<T> })
        elseFunction = functionResult.evaluateConditions
        
        const functionResultEvaluateConditionsFunction: any = function () {
            return result.evaluateConditions()
        }
        functionResultEvaluateConditionsFunction.ELSE_IF = functionResult.evaluateConditions.ELSE_IF
        functionResultEvaluateConditionsFunction.ELSE = functionResult.evaluateConditions.ELSE
        
        functionResult.evaluateConditions = functionResultEvaluateConditionsFunction
        
        return functionResult
        
    }
    
    
    result.evaluateConditions.ELSE = function (functionToCall: () => T) {
        elseFunction = functionToCall
        return result.evaluateConditions()
    }
    
    
    return result
}





export class UIFunctionCall<T extends (...args: any) => any> {
    
    isAUIFunctionCallObject = YES
    parameters: Parameters<T>[]
    
    constructor(...parameters: Parameters<T>) {
        
        this.parameters = parameters
        
    }
    
    callFunction(functionToCall: T) {
        
        const parameters = this.parameters
        functionToCall(...parameters)
        
    }
    
    
}


export function CALL<T extends (...args: any) => any>(...objects: Parameters<T>) {
    
    const result = new UIFunctionCall<T>(...objects)
    return result
    
}


export class UIFunctionExtender<T extends (...args: any) => any> {
    
    isAUIFunctionExtenderObject = YES
    extendingFunction: T
    
    constructor(extendingFunction: T) {
        
        this.extendingFunction = extendingFunction
        
    }
    
    extendedFunction(functionToExtend: T) {
        
        const extendingFunction = this.extendingFunction
        
        function extendedFunction(...objects: any[]) {
            
            const boundFunctionToExtend = functionToExtend.bind(this)
            boundFunctionToExtend(...objects)
            
            const boundExtendingFunction = extendingFunction.bind(this)
            boundExtendingFunction(...objects)
            
        }
        
        return extendedFunction
        
    }
    
    
}


export function EXTEND<T extends (...args: any) => any>(extendingFunction: T) {
    
    const result = new UIFunctionExtender(extendingFunction)
    return result
    
}


export class UILazyPropertyValue<T> {
    
    isAUILazyPropertyValueObject = YES
    initFunction: () => T
    
    constructor(initFunction: () => T) {
        
        this.initFunction = initFunction
        
    }
    
    setLazyPropertyValue(key: string, target: object) {
        
        let isValueInitialized = NO
        
        // property value
        let _value = nil
        
        const initValue = () => {
            
            _value = this.initFunction()
            isValueInitialized = YES
            this.initFunction = nil
            
        }
        
        if (delete target[key]) {
            
            // Create new property with getter and setter
            Object.defineProperty(target, key, {
                get: function () {
                    
                    if (IS_NOT(isValueInitialized)) {
                        
                        initValue()
                        
                    }
                    
                    return _value
                    
                },
                set: function (newValue) {
                    
                    _value = newValue
                    
                },
                enumerable: true,
                configurable: true
            })
            
        }
        
    }
    
    
}


export function LAZY_VALUE<T>(initFunction: () => T) {
    
    const result = new UILazyPropertyValue(initFunction)
    
    return result
    
}


export type UIInitializerObject<T> = {
    
    [P in keyof T]?:
    //T[P] extends (infer U)[] ? UIInitializerObject<U>[] :
    T[P] extends (...args: any) => any ? UIFunctionCall<T[P]> | UIFunctionExtender<T[P]> | T[P] :
        T[P] extends object ? UIInitializerObject<T[P]> | UILazyPropertyValue<T[P]> :
            T[P];
    
}


export class UIObject {
    
    constructor() {
    
        // Do something here if needed
        
    }
    
    public get class(): any {
        return Object.getPrototypeOf(this).constructor
    }
    
    public get superclass(): any {
        return Object.getPrototypeOf(Object.getPrototypeOf(this)).constructor
    }
    
    
    public static wrapObject<T>(object: T): UIObject & T {
        
        if (IS_NOT(object)) {
            return nil
        }
        
        if (object instanceof UIObject) {
            return object
        }
    
        return Object.assign(new UIObject(), object)
        
    }
    
    
    isKindOfClass(classObject) {
        if (this.isMemberOfClass(classObject)) {
            return YES
        }
        for (let superclassObject = this.superclass; IS(superclassObject); superclassObject = superclassObject.superclass) {
            if (superclassObject == classObject) {
                return YES
            }
        }
        return NO
    }
    
    
    isMemberOfClass(classObject: any) {
        return (this.class == classObject)
    }
    
    
    
    valueForKey(key: string) {
        return this[key]
    }
    
    valueForKeyPath(keyPath: string): any {
        return UIObject.valueForKeyPath(keyPath, this)
    }
    
    static valueForKeyPath(keyPath: string, object: any): any {
        
        if (IS_NOT(keyPath)) {
            return object
        }
        
        const keys = keyPath.split(".")
        let currentObject = object
    
        for (let i = 0; i < keys.length; i++) {
            
            const key = keys[i]
            
            if (key.substring(0, 2) == "[]") {
                
                // This next object will be an array and the rest of the keys need to be run for each of the elements
                currentObject = currentObject[key.substring(2)]
                
                // CurrentObject is now an array
                
                const remainingKeyPath = keys.slice(i + 1).join(".")
                const currentArray = currentObject as unknown as any[]
                currentObject = currentArray.map(function (subObject, index, array) {
                    return UIObject.valueForKeyPath(remainingKeyPath, subObject)
                })
                
                break
                
            }
            
            currentObject = currentObject[key]
            if (IS_NOT(currentObject)) {
                currentObject = nil
            }
            
        }
        
        return currentObject
        
    }
    
    setValueForKeyPath(keyPath: string, value: any, createPath = YES) {
        return UIObject.setValueForKeyPath(keyPath, value, this, createPath)
    }
    
    static setValueForKeyPath(keyPath: string, value: any, currentObject: any, createPath) {
        
        const keys = keyPath.split(".")
        let didSetValue = NO
    
        keys.forEach(function (key, index, array) {
            if (index == array.length - 1 && IS_NOT_LIKE_NULL(currentObject)) {
                currentObject[key] = value
                didSetValue = YES
                return
            }
            else if (IS_NOT(currentObject)) {
                return
            }
            
            const currentObjectValue = currentObject[key]
            if (IS_LIKE_NULL(currentObjectValue) && createPath) {
                currentObject[key] = {}
            }
            currentObject = currentObject[key]
        })
    
        return didSetValue
    
    }
    
    
    configureWithObject(object: UIInitializerObject<this>) {
        this.configuredWithObject(object)
    }
    
    configuredWithObject(object: UIInitializerObject<this>): this {
        return UIObject.configureWithObject(this, object)
    }
    
    
    static configureWithObject<T extends object>(configurationTarget: T, object: UIInitializerObject<T>) {
        
        const isAnObject = (item: any) => (item && typeof item === "object" && !Array.isArray(item) &&
            !(item instanceof UICoreExtensionValueObject))
        
        function isAClass(funcOrClass) {
            const isFunction = functionToCheck => (functionToCheck && {}.toString.call(functionToCheck) ===
                "[object Function]")
            const propertyNames = Object.getOwnPropertyNames(funcOrClass)
            return (isFunction(funcOrClass) && !propertyNames.includes("arguments") &&
                propertyNames.includes("prototype"))
        }
        
        let keyPathsAndValues = []
        
        function prepareKeyPathsAndValues(target: object, source: object, keyPath = "") {
            
            if ((isAnObject(target) || isAClass(target)) && isAnObject(source)) {
                
                source.forEach((sourceValue, key) => {
                    
                    const valueKeyPath = keyPath + "." + key
                    function addValueAndKeyPath(sourceValue) {
                        keyPathsAndValues.push({
                            value: sourceValue,
                            keyPath: valueKeyPath.replace(".", "")
                        })
                    }
                    
                    if (isAnObject(sourceValue) || isAClass(sourceValue)) {
                        if (!(key in target) || target[key] instanceof Function) {
                            addValueAndKeyPath(sourceValue)
                        }
                        else {
                            prepareKeyPathsAndValues(target[key], sourceValue, valueKeyPath)
                        }
                    }
                    else if (sourceValue instanceof UICoreExtensionValueObject) {
                        addValueAndKeyPath(sourceValue.value)
                    }
                    else {
                        addValueAndKeyPath(sourceValue)
                    }
                    
                })
                
            }
            
        }
        
        prepareKeyPathsAndValues(configurationTarget, object)
        
        // Sort based on key paths
        keyPathsAndValues = keyPathsAndValues.sort((a, b) => {
            
            const firstKeyPath = (a.keyPath as string).split(".").length
            const secondKeyPath = (b.keyPath as string).split(".").length
            
            if (firstKeyPath < secondKeyPath) {
                return -1
            }
            if (firstKeyPath > secondKeyPath) {
                return 1
            }
            return 0
            
        })
        
        keyPathsAndValues.forEach((valueAndKeyPath) => {
            
            const keyPath: string = valueAndKeyPath.keyPath
            let value = valueAndKeyPath.value
            
            const getTargetFunction = (bindThis = NO) => {
                let result = (UIObject.valueForKeyPath(keyPath, configurationTarget) as Function)
                if (bindThis) {
                    const indexOfDot = keyPath.lastIndexOf(".")
                    const thisObject = UIObject.valueForKeyPath(keyPath.substring(0, indexOfDot), configurationTarget)
                    result = result.bind(thisObject)
                }
                return result
            }
            
            if (value instanceof UILazyPropertyValue) {
                const indexOfDot = keyPath.lastIndexOf(".")
                const thisObject = UIObject.valueForKeyPath(keyPath.substring(0, indexOfDot), configurationTarget)
                const key = keyPath.substring(indexOfDot + 1)
                value.setLazyPropertyValue(key, thisObject)
                return
            }
            
            if (value instanceof UIFunctionCall) {
                value.callFunction(getTargetFunction(YES))
                return
            }
            
            if (value instanceof UIFunctionExtender) {
                value = value.extendedFunction(getTargetFunction())
            }
            
            UIObject.setValueForKeyPath(keyPath, value, configurationTarget, YES)
            
        })
        
        
        return configurationTarget
        
    }
    
    
    performFunctionWithSelf<T>(functionToPerform: (self: this) => T): T {
        return functionToPerform(this)
    }
    
    performingFunctionWithSelf(functionToPerform: (self: this) => void): this {
        functionToPerform(this)
        return this
    }
    
    performFunctionWithDelay(delay: number, functionToCall: Function) {
        
        new UITimer(delay, NO, functionToCall)
        
    }
    
    
}






























