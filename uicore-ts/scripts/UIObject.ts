import { UICoreExtensionValueObject } from "./UICoreExtensionValueObject"
import { UITimer } from "./UITimer"


function NilFunction() {
    return nil
}


// The nil object avoids unnecessary crashes by allowing you to call any function or access any variable on it, returning nil
export var nil: any = new Proxy(Object.assign(NilFunction, { "class": null, "className": "Nil" }), {
    get(target, name) {
        if (name == Symbol.toPrimitive) {
            return function (hint: string) {
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
    set() {
        return NilFunction()
    }
})
window.nil = nil

declare global {
    interface Window {
        nil: any;
    }
}


export type RecursiveRequired<T> = Required<{
    [P in keyof T]: T[P] extends object | undefined ? RecursiveRequired<Required<T[P]>> : T[P];
}>;

export function wrapInNil<T>(object?: T): Required<T> {
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
            set(target: Record<string, any> & T, name: string, value: any) {
                if (IS(target)) {
                    // @ts-ignore
                    target[name] = value
                }
                return YES
            }
        })
    }
    return result as any
}


export const YES = true
export const NO = false

export function IS<T>(object: T | undefined | null | false): object is T {
    if (object && object !== nil) {
        return YES
    }
    return NO
}

export function IS_NOT(object: any): object is undefined | null | false {
    return !IS(object)
}

export function IS_DEFINED<T>(object: T | undefined): object is T {
    if (object != undefined) {
        return YES
    }
    return NO
}

export function IS_UNDEFINED(object: any): object is undefined {
    return !IS_DEFINED(object)
}

export function IS_NIL(object: any): object is typeof nil {
    if (object === nil) {
        return YES
    }
    return NO
}

export function IS_NOT_NIL<T>(object: T | undefined | null): object is T | undefined | null {
    return !IS_NIL(object)
}


export function IS_LIKE_NULL(object: any): object is undefined | null {
    return (IS_UNDEFINED(object) || IS_NIL(object) || object == null)
}

export function IS_NOT_LIKE_NULL<T>(object: T | null | undefined): object is T {
    return !IS_LIKE_NULL(object)
}


export function IS_AN_EMAIL_ADDRESS(email: string) {
    const re = /\S+@\S+\.\S+/
    return re.test(email)
}


export function FIRST_OR_NIL<T>(...objects: (T | undefined | null)[]): T {
    const result = objects.find(object => IS(object))
    return result || nil
}

export function FIRST<T>(...objects: (T | undefined | null)[]): T {
    const result = objects.find(object => IS(object))
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
    return (..._objects: any[]) => value
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
    return new UIFunctionCall<T>(...objects)
}


export class UIFunctionExtender<T extends (...args: any) => any> {
    
    isAUIFunctionExtenderObject = YES
    extendingFunction: T
    
    static functionByExtendingFunction<T extends (...args: any) => any>(functionToExtend: T, extendingFunction: T) {
        return EXTEND(extendingFunction).extendedFunction(functionToExtend)
    }
    
    constructor(extendingFunction: T) {
        this.extendingFunction = extendingFunction
    }
    
    extendedFunction(functionToExtend: T): T & { extendedFunction: T } {
        const extendingFunction = this.extendingFunction
        
        function extendedFunction(this: any, ...objects: any[]) {
            const boundFunctionToExtend = functionToExtend.bind(this)
            boundFunctionToExtend(...objects)
            const boundExtendingFunction = extendingFunction.bind(this)
            boundExtendingFunction(...objects)
        }
        
        extendedFunction.extendedFunction = functionToExtend
        return extendedFunction as any
    }
    
}


export function EXTEND<T extends (...args: any) => any>(extendingFunction: T) {
    return new UIFunctionExtender(extendingFunction)
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
        
        // @ts-ignore
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
    return new UILazyPropertyValue(initFunction)
}


export type UIInitializerObject<T> = {
    
    [P in keyof T]?:
    //T[P] extends (infer U)[] ? UIInitializerObject<U>[] :
    T[P] extends (...args: any) => any ? UIFunctionCall<T[P]> | UIFunctionExtender<T[P]> | T[P] :
        T[P] extends object ? UIInitializerObject<T[P]> | UILazyPropertyValue<T[P]> :
            Partial<T[P]>;
    
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
    
    isKindOfClass(classObject: any) {
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
    
    
    static annotationsMap: WeakMap<any, Function[]> = new WeakMap<ClassDecoratorContext, Function[]>()
    
    static recordAnnotation(annotation: Function, target: Function) {
        if (!UIObject.annotationsMap.has(target)) {
            UIObject.annotationsMap.set(target, [])
        }
        UIObject.annotationsMap.get(target)!.push(annotation)
    }
    
    static classHasAnnotation(classObject: Function, annotation: Function) {
        return UIObject.annotationsMap.get(classObject)?.contains(annotation)
    }
    
    static annotationsOnClass(classObject: Function) {
        return UIObject.annotationsMap.get(classObject) ?? []
    }
    
    public static wrapObject<T>(object: T): UIObject & T {
        if (IS_NOT(object)) {
            return nil
        }
        
        if ((object as any) instanceof UIObject) {
            // @ts-ignore
            return object
        }
        
        return Object.assign(new UIObject(), object)
    }
    
    
    valueForKey(key: string) {
        // @ts-ignore
        return this[key]
    }
    
    valueForKeyPath<T = any>(keyPath: string, defaultValue?: T): T | undefined {
        return UIObject.valueForKeyPath(keyPath, this, defaultValue)
    }
    
    static valueForKeyPath<T = any>(keyPath: string, object: any, defaultValue?: T): T | undefined {
        
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
                currentObject = currentArray.map(subObject => UIObject.valueForKeyPath(remainingKeyPath, subObject))
                
                break
                
            }
            
            currentObject = currentObject?.[key]
            if (IS_LIKE_NULL(currentObject)) {
                currentObject = defaultValue
            }
            
        }
        
        return currentObject
        
    }
    
    setValueForKeyPath(keyPath: string, value: any, createPath = YES) {
        return UIObject.setValueForKeyPath(keyPath, value, this, createPath)
    }
    
    static setValueForKeyPath(keyPath: string, value: any, currentObject: any, createPath: boolean) {
        
        const keys = keyPath.split(".")
        let didSetValue = NO
        
        keys.forEach((key, index, array) => {
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
        
        return UIObject.configureWithObject(this, object)
        
    }
    
    configuredWithObject(object: UIInitializerObject<this>): this {
        
        this.configureWithObject(object)
        return this
        
    }
    
    
    static configureWithObject<TargetObjectType extends object, ConfigurationObjectType extends UIInitializerObject<TargetObjectType>>(
        configurationTarget: TargetObjectType,
        object: ConfigurationObjectType
    ): ConfigurationObjectType {
        
        const isAnObject = (item: any) => (item && typeof item === "object" && !Array.isArray(item) && !(item instanceof UICoreExtensionValueObject))
        const isAPureObject = (item: any) => isAnObject(item) && Object.getPrototypeOf(item) === Object.getPrototypeOf({})
        
        function isAClass(funcOrClass: object) {
            if (IS_NOT(funcOrClass)) {
                return NO
            }
            const isFunction = (functionToCheck: object) => (functionToCheck && {}.toString.call(functionToCheck) ===
                "[object Function]")
            const propertyNames = Object.getOwnPropertyNames(funcOrClass)
            return (isFunction(funcOrClass) && !propertyNames.includes("arguments") &&
                propertyNames.includes("prototype"))
        }
        
        const result = {} as ConfigurationObjectType
        
        let keyPathsAndValues: { value: any, keyPath: string }[] = []
        
        function prepareKeyPathsAndValues(target: Record<string, any>, source: object, keyPath = "") {
            
            if ((isAnObject(target) || isAClass(target)) && isAnObject(source)) {
                
                source.forEach((sourceValue, key) => {
                    
                    const valueKeyPath = keyPath + "." + key
                    
                    function addValueAndKeyPath(sourceValue: any) {
                        keyPathsAndValues.push({
                            value: sourceValue,
                            keyPath: valueKeyPath.replace(".", "")
                        })
                    }
                    
                    
                    if (isAPureObject(sourceValue) || isAClass(sourceValue)) {
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
        
        // Sort based on key path lengths
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
            
            UIObject.setValueForKeyPath(keyPath, UIObject.valueForKeyPath(keyPath, configurationTarget), result, YES)
            UIObject.setValueForKeyPath(keyPath, value, configurationTarget, YES)
            
        })
        
        
        return result
        
    }
    
    static configuredWithObject<T extends object>(configurationTarget: T, object: UIInitializerObject<T>) {
        this.configureWithObject(configurationTarget, object)
        return configurationTarget
    }
    
    
    get methods(): MethodsOnly<Omit<this, "methods">> {
        const thisObject = this as object
        const result = {} as any
        thisObject.forEach((value, key) => {
            if (value instanceof Function && key != "methods") {
                result[key] = value.bind(thisObject)
            }
        })
        return result
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


export type MethodsOnly<T> =
    Pick<T, { [K in keyof T]: T[K] extends Function ? K : never }[keyof T]>;

export type ValueOf<T> = T[keyof T];




























