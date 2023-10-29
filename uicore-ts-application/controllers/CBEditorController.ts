import * as child_process from "child_process"
import { transformSync } from "esbuild"
import { Application } from "express"
import * as fs from "fs"
import * as path from "path"
import { Server } from "socket.io"
import {
    ClassDeclaration,
    createWrappedNode,
    ExpressionStatement,
    GetAccessorDeclaration,
    Node,
    ObjectLiteralExpression,
    Project,
    PropertyDeclaration, PropertySignature,
    SetAccessorDeclaration,
    SourceFile,
    SyntaxKind,
    ts,
    Type
} from "ts-morph"
import { CompletionEntry, CompletionTriggerKind, IndentStyle } from "typescript"
import "../Extensions"
import Utils from "../Utils"
import {
    CBEditorAnnotatedPropertyDescriptor,
    CBEditorEditablePropertyDescriptor,
    CBEditorPropertyDescriptor,
    CBEditorPropertyLocation
} from "../webclient/scripts/SocketClientFunctions"
import { RoutesController } from "./RoutesController"
import { SocketController } from "./SocketController"


/// <reference path="../webclient/scripts/SocketClientFunctions.d.ts" />


interface EditableDeclarationObject {
    declaration: (SetAccessorDeclaration | PropertyDeclaration | PropertySignature)
    keyPathComponents: string[]
}


export class CBEditorController extends RoutesController {
    
    private static _instance: CBEditorController
    
    webclientProject = new Project({
        tsConfigFilePath: "webclient/tsconfig.json"
        // resolutionHost: (moduleResolutionHost, getCompilerOptions) => {
        //     return {
        //         resolveModuleNames: (moduleNames, containingFile) => {
        //             const compilerOptions = getCompilerOptions();
        //             const resolvedModules: ts.ResolvedModule[] = [];
        //
        //             for (const moduleName of moduleNames.map(removeTsExtension)) {
        //                 const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost);
        //                 if (result.resolvedModule)
        //                     resolvedModules.push(result.resolvedModule);
        //             }
        //
        //             return resolvedModules;
        //         },
        //     };
        //
        //     function removeTsExtension(moduleName: string) {
        //         if (moduleName.slice(-3).toLowerCase() === ".ts")
        //             return moduleName.slice(0, -3);
        //         return moduleName;
        //     }
        // }
    })
    
    testingSourceFile = (() => {
        const filePath = "test_file_for_CBEditorController.ts"
        this.webclientProject.getSourceFile(filePath)?.deleteImmediatelySync()
        return this.webclientProject.createSourceFile(filePath, "", { overwrite: true })
    })()
    
    private currentEditingTarget: CBEditorPropertyDescriptor
    private compilerProject: Project
    
    public registerRoutes() {
        
        const targets = SocketController.sharedInstance.messageTargets
        
        targets.PerformAction = (message, socketSession, respondWithMessage) => respondWithMessage(null)
        
        targets.PerformActionAndRetrieveData = (message, socketSession, respondWithMessage) => respondWithMessage(true)
        
        targets.PerformActionAndRetrieveDataWithParameters = async (message, socketSession, respondWithMessage) => {
            
            await respondWithMessage(message == "Autopood")
            
        }
        
        this.webclientProject.addSourceFilesAtPaths([
            "webclient/node_modules/uicore-ts/**/*.ts",
            "webclient/node_modules/cbcore-ts/**/*.ts"
        ])
        
        
        targets.CurrentViewKeyPath = async (message, socketSession, respondWithMessage) => {
            
            await respondWithMessage(this.currentEditingTarget?.runtimeObjectKeyPath)
            
        }
        
        targets.EditorWasClosed = async (message, socketSession, respondWithMessage) => {
            
            this.currentEditingTarget = null
            
            await respondWithMessage(null)
            
        }
        
        targets.AnnotatePropertyDescriptors = async (messageArray, socketSession, respondWithMessage) => {
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            
            const result = messageArray.map(message => {
                return this.annotatePropertyDescriptor(sourceFiles, message)
                
            })
            
            respondWithMessage(result)
            
        }
        
        
        targets.EditProperty = async (message, socketSession, respondWithMessage) => {
            
            try {
                
                this.currentEditingTarget = message
                
                const sourceFiles = this.webclientProject.getSourceFiles()
                const resultFile = sourceFiles.find(
                    (file, index, array) => file.getClass(
                        declaration => declaration.getName() == message.className
                    )
                )
                
                sourceFiles.removeElement(resultFile)
                
                const referencedFiles = sourceFiles.map(
                    (file) => {
                        return {
                            codeFileContents: file.getFullText(),
                            path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                        }
                    }
                )
                
                const classObject = resultFile.getClass(message.className)
                let propertyObject = this.propertyDeclarationForClassAndKey(classObject, message.propertyKeyPath)
                let propertyReferenceLocations: {
                    fileName: string;
                    start: { column: number; lineNumber: number };
                    className: string;
                    end: { column: number; lineNumber: number }
                }[]
                
                if (propertyObject) {
                    
                    const propertyReferences = propertyObject.findReferencesAsNodes().filter(
                        reference => reference.getSourceFile() == classObject.getSourceFile()
                    )
                    
                    propertyReferenceLocations = propertyReferences.map(reference => {
                        
                        return {
                            fileName: reference.getSourceFile().getBaseName(),
                            className: reference.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)?.getName?.() ?? "",
                            start: {
                                lineNumber: reference.getStartLineNumber(),
                                column: reference.getStart() - reference.getStartLinePos()
                            },
                            end: {
                                lineNumber: reference.getEndLineNumber(),
                                column: reference.getEnd() - reference.getStartLinePos() + 1
                            }
                        }
                        
                    })
                    
                }
                
                const viewClass = this.classDeclarationWithName(
                    propertyObject?.getStructure()?.type as string ||
                    propertyObject.getType().getApparentType().getSymbol().getName()
                )
                
                const editableDeclarationObjects = this.editableDeclarations(viewClass)
                
                const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
                const targetFile = sourceFiles.find(
                    file => file.getClass(
                        declaration => declaration.getName() == classPropertyTypeName
                    )
                )
                
                const editableProperties = editableDeclarationObjects.map(declarationObject => {
                    
                    const declaration = declarationObject.declaration
                    const propertyKeyPath = message.propertyKeyPath + "." + declarationObject.keyPathComponents.join(".")
                    let typeName: string
                    let typeNames: string[] = []
                    let declarationType: "field" | "property"
                    
                    
                    if (declaration instanceof SetAccessorDeclaration) {
                        
                        typeName = declaration.getStructure().parameters.firstElement.type as string
                        declarationType = "property"
                        
                    }
                    else {
                        //if (declaration instanceof PropertyDeclaration || declaration instanceof PropertySignature) {
                        
                        typeName = declaration.getStructure().type as string
                        
                        let nonOptionalTypes = [declaration.getType()]
                        
                        if (nonOptionalTypes) {
                            
                            nonOptionalTypes = nonOptionalTypes.flatMap(
                                value => value.getUnionTypes().filter(
                                    value => !value.isUndefined()
                                )
                            )
                            
                        }
                        
                        typeNames = nonOptionalTypes.map(value => value.getText(declaration)).concat(
                            nonOptionalTypes.flatMap(value => value.getBaseTypes())
                                .map(value => value.getText(declaration))
                        )
                        declarationType = "field"
                        
                        //}
                    }
                    
                    // Add editing values straight to the descriptor
                    let unionTypeStrings: Type[] = []
                    if (declaration instanceof SetAccessorDeclaration || declaration instanceof PropertyDeclaration) {
                        unionTypeStrings = declaration.getType?.().getUnionTypes()
                            .filter(value => value.isStringLiteral())
                        
                    }
                    
                    // if (unionTypes.length) {
                    //
                    //     var asdasd = 1
                    //
                    // }
                    
                    const result: CBEditorEditablePropertyDescriptor = {
                        typeName: typeName,
                        typeNames: typeNames,
                        path: propertyKeyPath,
                        editingLocation: this.locationOfEditing(
                            resultFile,
                            targetFile,
                            { className: message.className, propertyKeyPath: propertyKeyPath }
                        ),
                        declarationType: declarationType,
                        valueOptions: unionTypeStrings.map(value => value.getText())
                    }
                    
                    return result
                    
                }).uniqueElementsOnlyWithFunction(property => property.path)
                
                
                await respondWithMessage({
                    codeFileContents: resultFile.getFullText(),
                    path: resultFile.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", ""),
                    referencedFiles: referencedFiles,
                    propertyLocation: Utils.IF(propertyObject)(() => {
                        
                        return {
                            className: propertyObject.getParent().getName(),
                            start: {
                                lineNumber: propertyObject.getNameNode().getStartLineNumber(),
                                column: propertyObject.getNameNode().getStart() - propertyObject.getNameNode()
                                    .getStartLinePos() + 1
                            },
                            end: {
                                lineNumber: propertyObject.getNameNode().getEndLineNumber(),
                                column: propertyObject.getNameNode().getEnd() - propertyObject.getNameNode()
                                    .getStartLinePos() + 1
                            }
                        }
                        
                    }).ELSE(() => undefined),
                    propertyReferenceLocations: propertyReferenceLocations,
                    editableProperties: editableProperties
                })
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
                this.currentEditingTarget = undefined
                
            }
            
        }
        
        
        targets.EditingValuesForProperty = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            if (!resultFile) {
                
                respondWithMessage([])
                return
                
            }
            
            sourceFiles.removeElement(resultFile)
            
            const referencedFiles = sourceFiles.map(
                (file) => {
                    return {
                        codeFileContents: file.getFullText(),
                        path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                    }
                }
            )
            
            const classObject = resultFile.getClass(message.className)
            
            
            //if (propertyObject) {
            
            const propertyValueClass = classObject //this.propertyValueClass(sourceFiles, propertyObject)
            const subclasses = propertyValueClass.getDerivedClasses()
            
            const classes = [propertyValueClass].concat(subclasses)
            
            
            //let propertyObject = this.propertyObjectForClass(classObject, message.propertyKey.split(".").firstElement)
            
            const result: CBEditorPropertyDescriptor[] = classes.map(
                classDeclaration => classDeclaration.getStaticProperties()
                    .filter(value =>
                        propertyValueClass &&
                        value.getType()?.compilerType?.symbol?.getName() == propertyValueClass?.getName()
                    )
            ).flat().map(value => {
                
                const result: CBEditorPropertyDescriptor = {
                    
                    propertyKeyPath: value.getName(),
                    className: propertyValueClass.getName(),
                    runtimeObjectKeyPath: null
                    
                }
                
                return result
                
            })
            
            var asd = 1
            
            
            //}
            
            
            await respondWithMessage(result)
            
        }
        
        
        targets.JSStringFromTSString = async (message, socketSession, respondWithMessage) => {
            
            try {
                
                const result = transformSync(message).code
                //swc.transformSync(message).code
                
                respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse("")
                
            }
            
        }
        
        
        targets.AllDerivedClassNames = async (message, socketSession, respondWithMessage) => {
            
            const className = message
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == className
                )
            )
            
            const classObject = resultFile.getClass(className)
            
            const subclasses = classObject.getDerivedClasses()
            //const classes = [classObject].concat(subclasses)
            
            const result = subclasses.map(subclass => subclass.getName())
            
            await respondWithMessage(result)
            
        }
        
        
        targets.SetPropertyClassName = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const fileText = resultFile.getText()
            
            const classObject = resultFile.getClass(message.className)
            let propertyObject = this.propertyDeclarationForClassAndKey(
                classObject,
                message.propertyKeyPath.split(".").firstElement
            )
            
            const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
            
            const targetFile = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == classPropertyTypeName
                )
            )
            
            sourceFiles.removeElement(targetFile)
            
            const targetObjectClassDeclaration = targetFile.getClass(classPropertyTypeName)
            const keyPathComponents = message.propertyKeyPath.split(".")
            let targetObjectClassPropertyObject = this.setAccessorForClassAndKey(
                targetObjectClassDeclaration,
                keyPathComponents.lastElement
            )
            
            var locationOfEditedValue: CBEditorPropertyLocation
            
            // let propertyReferenceLocations: {
            //     fileName: string;
            //     start: { column: number; lineNumber: number };
            //     className: string;
            //     end: { column: number; lineNumber: number }
            // }[]
            
            if (propertyObject) {
                
                const initializerNewExpression = propertyObject.getInitializer()
                    .getDescendantsOfKind(SyntaxKind.NewExpression).lastElement
                
                initializerNewExpression.setExpression(message.valueString)
                
                propertyObject.set({ type: message.valueString })
                
                classObject.getSourceFile().fixMissingImports()
                
                classObject.getSourceFile().organizeImports()
                
            }
            
            
            // const result = await socketSession.socketClient.EditProperty({
            //     propertyKey: message.propertyKeyPath,
            //     className: message.className
            // })
            
            const newFileContent = resultFile.getText()
            
            if (message.saveChanges) {
                
                fs.watch(
                    "webclient/compiledScripts/webclient.js",
                    (event, filename) => {
                        
                        // eventCount = eventCount + 1
                        //
                        // console.log(event + " " + filename)
                        //
                        
                        // if (eventCount == 2) {
                        //fs.unwatchFile("webclient/compiledScripts/webclient.js")
                        
                        respondWithMessage({
                            
                            location: locationOfEditedValue,
                            fileContent: fileText,
                            newFileContent: newFileContent
                            
                        })
                        
                        // }
                        
                    }
                )
                
                await this.webclientProject.save()
                this.rebuildWebclient()
                this.reloadEditorProject()
                
            }
            else {
                
                resultFile.replaceText([0, resultFile.getEnd()], newFileContent)
                
                await respondWithMessage({
                    
                    location: locationOfEditedValue,
                    fileContent: fileText,
                    newFileContent: newFileContent
                    
                })
                
            }
            //this.reloadEditorProject()
            
            
        }
        
        
        // targets.EditingLocationForProperty = async (message, socketSession, respondWithMessage) => {
        //
        //     const sourceFiles = this.webclientProject.getSourceFiles()
        //     const resultFile = sourceFiles.find(
        //         file => file.getClass(
        //             declaration => declaration.getName() == message.className
        //         )
        //     )
        //
        //     const classObject = resultFile.getClass(message.className)
        //     const propertyObject = this.propertyDeclarationForClassAndKey(classObject, message.propertyKeyPath)
        //
        //     const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
        //     const targetFile = sourceFiles.find(
        //         file => file.getClass(
        //             declaration => declaration.getName() == classPropertyTypeName
        //         )
        //     )
        //
        //     await respondWithMessage({
        //         location: await this.locationOfEditing(resultFile, targetFile, message)
        //     })
        //
        // }
        
        
        targets.SetPropertyValue = async (message, socketSession, respondWithMessage) => {
            
            const classObject = this.classDeclarationWithName(message.className)
            const resultFile = classObject.getSourceFile()
            const fileText = resultFile.getText()
            
            const propertyObject = this.propertyDeclarationForClassAndKey(
                classObject,
                message.propertyKeyPath.split(".").firstElement
            )
            
            const valuePropertyOrAccessorObject = this.setAccessorOrPropertyDeclarationForClassAndKeyPath(
                classObject,
                message.propertyKeyPath
            )
            const valueString = this.valueStringForPropertyAndMessageValue(
                valuePropertyOrAccessorObject,
                message.valueString
            )
            
            const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
            
            const targetObjectClassDeclaration = this.classDeclarationWithName(classPropertyTypeName)
            const keyPathComponents = message.propertyKeyPath.split(".")
            
            let targetObjectClassPropertyObject = this.setAccessorOrPropertyDeclarationForClassAndKeyPath(
                targetObjectClassDeclaration,
                message.propertyKeyPath
            )
            
            let locationOfEditedValue: CBEditorPropertyLocation
            
            if (propertyObject) {
                
                const propertyReferences = targetObjectClassPropertyObject?.findReferencesAsNodes()?.filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                ) ?? []
                
                const propertyReferenceDescriptors = propertyReferences.map(reference => {
                    
                    const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                    const isAssignment = (binaryExpression?.getOperatorToken()?.getText() == "=")
                    const isSimpleAssignment = true
                    const isInConstructor = binaryExpression?.getFirstAncestorByKind(SyntaxKind.Constructor) && true
                    const left = binaryExpression?.getLeft()
                    const right = binaryExpression?.getRight()
                    const isBeingAssignedTo = Utils.IS(reference.getFirstAncestor(node => node == left))
                    const childrenOfKind = left?.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)
                    
                    return {
                        binaryExpression,
                        isInConstructor,
                        isAssignment,
                        left,
                        right,
                        isBeingAssignedTo,
                        childrenOfKind,
                        reference,
                        isSimpleAssignment
                    }
                    
                })
                
                // Find existing value assignment in constructor and assign value
                const assignmentObject = propertyReferenceDescriptors.find(
                    referenceDescriptor => (
                        referenceDescriptor.isAssignment &&
                        referenceDescriptor.isBeingAssignedTo &&
                        referenceDescriptor.isInConstructor
                    )
                )
                
                locationOfEditedValue = this.locationOfNode(
                    assignmentObject?.right?.replaceWithText(valueString)
                )
                
                // Find parent object initializer in constructor or declaration and assign value
                
                // through configuredWithObject
                
                const classConstructor = classObject.getConstructors()[0]
                
                const targetObjectPropertyReferences = propertyObject.findReferencesAsNodes().filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                )
                
                
                const targetObjectConstructorReferences = targetObjectPropertyReferences.filter(
                    reference => this.isNodeContainedInNode(
                        reference,
                        classConstructor
                    )
                )
                const targetObjectConstructorAssignmentReferences = targetObjectConstructorReferences.filter(reference => {
                    
                    const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                    const leftReferenceText = binaryExpression?.getLeft()?.getText()
                    
                    const callExpression = reference.getFirstAncestorByKind(SyntaxKind.CallExpression)
                    const isConfiguration = callExpression?.getExpression()?.getText()?.endsWith("configureWithObject")
                    
                    return (leftReferenceText == "this." + keyPathComponents.firstElement &&
                        binaryExpression?.getOperatorToken()?.getText() == "=" && this.isNodeContainedInNode(
                            reference,
                            binaryExpression?.getLeft()
                        )) || isConfiguration
                    
                })
                
                
                const targetObjectConstructorAssignmentReference = targetObjectConstructorAssignmentReferences.firstElement ||
                    propertyObject.getInitializer()?.getFirstChild(
                        node => node.getText() == propertyObject.getNameNode().getText()
                    )
                
                
                if (!assignmentObject && !(targetObjectConstructorAssignmentReference || propertyObject.hasInitializer())) {
                    
                    // Add value assignment in constructor
                    
                    const newStatement = classConstructor.addStatements(
                        "\n" + classConstructor.getChildIndentationText() +
                        "this." + keyPathComponents.firstElement + ".configureWithObject({" +
                        //"\n" + keyPathComponents.lastElement + ": " + valueString + "\n" +
                        "})"
                    ).firstElement
                    newStatement.formatText()
                    
                    classConstructor.getSourceFile().fixMissingImports()
                    
                    locationOfEditedValue = this.locationOfNode(
                        newStatement.getFirstChildByKind(SyntaxKind.BinaryExpression).getRight()
                    )
                    
                }
                
                
                const UIObjectClass = this.classDeclarationWithName("UIObject")
                
                const configurationMethodCallReference = UIObjectClass.getMethod(
                        method => method.getName() == "configuredWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                                ?.getRight()
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configureWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            targetObjectConstructorAssignmentReference?.getFirstAncestor(
                                node => node.getText().contains(keyPathComponents[0] + ".configureWithObject")
                            )
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configuredWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            propertyObject.getInitializer()
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
                
                let configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
                if (!configurationObject) {
                    // Add configuration to targetObjectConstructorAssignmentReference
                    const right = targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                        ?.getRight() ?? propertyObject.getInitializer()
                    const newNode = right.replaceWithText(
                        right.getText() + ".configuredWithObject({})"
                    )
                    newNode.formatText()
                    configurationObject = newNode.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
                }
                
                locationOfEditedValue = this.setValueForKeyPathInObjectCreatingPath(
                    keyPathComponents.slice(1),
                    configurationObject,
                    valueString
                )
                
                
            }
            
            
            // const result = await socketSession.socketClient.EditProperty({
            //     propertyKey: message.propertyKeyPath,
            //     className: message.className
            // })
            
            const newFileContent = resultFile.getText()
            
            if (message.saveChanges) {
                
                await this.webclientProject.save()
                this.rebuildWebclient()
                
            }
            else {
                
                resultFile.replaceText([0, resultFile.getEnd()], newFileContent)
                
            }
            
            await respondWithMessage({
                
                location: locationOfEditedValue,
                fileContent: fileText,
                newFileContent: newFileContent
                
            })
            //this.reloadEditorProject()
            
            
        }
        
        
        targets.AddSubview = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const referencedFiles = sourceFiles.map(
                (file) => {
                    return {
                        codeFileContents: file.getFullText(),
                        path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                    }
                }
            )
            
            const classObject = resultFile.getClass(message.className)
            let propertyObject = this.propertyDeclarationForClassAndKey(classObject, message.propertyKeyPath)
            const propertyReferences = propertyObject?.findReferencesAsNodes()?.filter(
                reference => reference.getSourceFile() == classObject.getSourceFile()
            ) ?? []
            
            const propertyReferenceLocations = propertyReferences.map(reference => {
                
                return {
                    fileName: reference.getSourceFile().getBaseName(),
                    className: reference.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)?.getName?.() ?? "",
                    start: {
                        lineNumber: reference.getStartLineNumber(),
                        column: reference.getStart() - reference.getStartLinePos()
                    },
                    end: {
                        lineNumber: reference.getEndLineNumber(),
                        column: reference.getEnd() - reference.getStartLinePos() + 1
                    }
                }
                
            })
            
            if (propertyObject) {
                
                respondWithMessage.sendErrorResponse(
                    "Property withe name " + message.propertyKeyPath + " is already present in class " + message.className
                )
                
                return
                
            }
            
            respondWithMessage.sendIntermediateResponse("Adding property " +
                message.className +
                "_" +
                message.propertyKeyPath)
            
            propertyObject = classObject.addProperty({
                name: message.propertyKeyPath,
                initializer: "new UIView().addedAsSubviewToView(this.view)"
            })
            // .configuredWithObject({ backgroundColor: UIColor.redColor })
            
            
            propertyObject.setOrder(classObject.getConstructors()[0].getChildIndex())
            
            // Set frame for the view in the layout method
            
            const layoutMethod = classObject.getMethods()
                .find(method => ["layoutViewSubviews", "layoutSubviews"].contains(method.getName()))
            
            const superCall = layoutMethod.getStatements().find(statement => statement.getText().startsWith("super"))
            
            const otherFrameStatement = layoutMethod.getDescendantsOfKind(SyntaxKind.BinaryExpression)
                .filter(value => value.getOperatorToken().getText() == "=")
                .reverse()
                .find(
                    (statement, index, array) => statement.getLeft().getText().endsWith("frame"))
            
            // layoutMethod.getDescendantStatements().reverse().find(statement => statement.getText().contains("frame ="))
            
            layoutMethod.addStatements(
                "this." + propertyObject.getName() + ".frame = " + otherFrameStatement.getLeft().getText() +
                ".rectangleForNextRow(" +
                "\npadding, " +
                "\n[this." + propertyObject.getName() + ".intrinsicContentHeight(" +
                otherFrameStatement.getLeft().getText() + ".width" +
                "), padding].max()" +
                "\n)"
            )
            
            layoutMethod.formatText({ indentStyle: IndentStyle.Block })
            
            await resultFile.save()
            
            // return
            
            
            const viewClass = this.classDeclarationWithName(propertyObject?.getStructure()?.type as string)
            
            const editableDeclarationObjects = this.editableDeclarations(viewClass)
            
            const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
            const targetFile = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == classPropertyTypeName
                )
            )
            
            const editableProperties = editableDeclarationObjects.map(declarationObject => {
                
                const declaration = declarationObject.declaration
                const propertyKeyPath = message.propertyKeyPath + "." + declarationObject.keyPathComponents.join(".")
                let typeName: string
                let declarationType: "field" | "property"
                
                if (declaration instanceof SetAccessorDeclaration) {
                    
                    typeName = declaration.getStructure().parameters.firstElement.type as string
                    declarationType = "property"
                    
                }
                else {
                    //if (declaration instanceof PropertyDeclaration || declaration instanceof PropertySignature) {
                    
                    typeName = declaration.getStructure().type as string
                    declarationType = "field"
                    
                    //}
                }
                
                
                // Add editing values straight to the descriptor
                let unionTypes: Type[] = []
                if (declaration instanceof SetAccessorDeclaration || declaration instanceof PropertyDeclaration) {
                    unionTypes = declaration.getType().getUnionTypes()
                }
                
                const result: CBEditorEditablePropertyDescriptor = {
                    typeName: typeName,
                    typeNames: [typeName],
                    path: propertyKeyPath,
                    editingLocation: this.locationOfEditing(
                        resultFile,
                        targetFile,
                        { className: message.className, propertyKeyPath: propertyKeyPath }
                    ),
                    declarationType: declarationType,
                    valueOptions: unionTypes.map(value => value.getText())
                }
                
                return result
                
            }).uniqueElementsOnlyWithFunction(property => property.path)
            
            const runtimeObjectKeyPathComponents = this.currentEditingTarget.runtimeObjectKeyPath.split(".")
            runtimeObjectKeyPathComponents.lastElement = message.propertyKeyPath
            this.currentEditingTarget = {
                propertyKeyPath: message.propertyKeyPath,
                className: message.className,
                runtimeObjectKeyPath: runtimeObjectKeyPathComponents.join(".")
            }
            
            
            await respondWithMessage({
                codeFileContents: resultFile.getFullText(),
                path: resultFile.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", ""),
                referencedFiles: referencedFiles,
                propertyLocation: Utils.IF(propertyObject)(() => {
                    
                    return {
                        className: propertyObject.getParent().getName(),
                        start: {
                            lineNumber: propertyObject.getNameNode().getStartLineNumber(),
                            column: propertyObject.getNameNode().getStart() - propertyObject.getNameNode()
                                .getStartLinePos() + 1
                        },
                        end: {
                            lineNumber: propertyObject.getNameNode().getEndLineNumber(),
                            column: propertyObject.getNameNode().getEnd() - propertyObject.getNameNode()
                                .getStartLinePos() + 1
                        }
                    }
                    
                }).ELSE(() => undefined),
                propertyReferenceLocations: propertyReferenceLocations,
                editableProperties: editableProperties
            })
            
        }
        
        
        targets.RemoveSubview = async (message, socketSession, respondWithMessage) => {
            
            
            const viewController = this.classDeclarationWithName(message.className)
            const property = viewController.getProperty(message.propertyKeyPath)
            const referenceNodes = property.findReferencesAsNodes()
            
            const referenceExpressions: ExpressionStatement[] = referenceNodes.map(
                value => value.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
            ).filter(value => value).uniqueElementsOnlyWithFunction(value => value.getText())
            
            const referenceBinaryExpressions = referenceExpressions.map(
                value => value.getFirstDescendantByKind(SyntaxKind.BinaryExpression)
            ).filter(value => value?.getLeft()?.getText()?.contains(message.propertyKeyPath + ".frame"))
            
            referenceBinaryExpressions.forEach(value => {
                
                value.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)?.remove()
                
            })
            
            property.remove()
            
            await viewController.getSourceFile().save()
            
            this.currentEditingTarget.propertyKeyPath = "view"
            
            var asd = 1
            
            respondWithMessage(true)
            
            
        }
        
        
        targets.AddNewViewController = async (message, socketSession, respondWithMessage) => {
            
            
            const newClassName: string = message.className
            
            const UIRootViewController = this.classDeclarationWithName("UIRootViewController")
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const rootViewControllerFile = sourceFiles.find(
                (file, index, array) => file.getClass(declaration =>
                    declaration.getName() != UIRootViewController.getName() &&
                    this.isClassKindOfReferenceClass(declaration, UIRootViewController)
                )
            )
            
            const SomeContentViewController = this.classDeclarationWithName("SomeContentViewController")
            
            const newClassFile = this.webclientProject.createSourceFile(
                path.join(path.dirname(rootViewControllerFile.getFilePath()), newClassName + ".ts"),
                SomeContentViewController.getSourceFile()
                    .getFullText()
                    .replaceAll("SomeContentViewController", newClassName)
            )
            
            // Change the route component name
            
            const newClass = newClassFile.getClass(newClassName)
            
            const routeComponentNameProperty = newClass.getStaticProperty("routeComponentName")
            
            const componentName = newClassName.toLowerCase().replace("viewcontroller", "")
            
            routeComponentNameProperty.set({ initializer: "\"" + componentName + "\"" })
            
            
            // Register the class in the RootViewController
            
            const classNameLowercased = newClassName.slice(0, 1).toLowerCase() + newClassName.slice(1)
            
            const rootViewControllerClass = rootViewControllerFile.getClasses()[0]
            const contentViewControllersProperty = rootViewControllerClass.getProperty("contentViewControllers")
            contentViewControllersProperty.getInitializer()
                .asKind(SyntaxKind.ObjectLiteralExpression)
                .addPropertyAssignment({
                    name: classNameLowercased,
                    initializer: "this.lazyViewControllerObjectWithClass(" + newClassName + ")"
                })
            
            rootViewControllerFile.addImportDeclaration(
                {
                    moduleSpecifier: path.join(newClassFile.getDirectoryPath(), newClassName),
                    namedImports: [newClassName]
                }
            )
            
            //rootViewControllerFile.fixMissingImports()
            
            // Change the title
            
            const UIObjectClass = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == "UIObject"
                )
            ).getClass(declaration => declaration.getName() == "UIObject")
            
            const titleLabelPropertyName = "titleLabel"
            const titleLabelPropertyDeclaration = newClass.getProperty(titleLabelPropertyName)
            const configurationMethodCallReference = UIObjectClass.getMethod(
                method => method.getName() == "configuredWithObject"
            ).findReferencesAsNodes().find(
                reference => this.isNodeContainedInNode(
                    reference,
                    titleLabelPropertyDeclaration.getInitializer()
                )
            )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
            const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
            
            if (configurationObject) {
                const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                    .find(assignment => assignment.getChildren()[0].getText() == "text")
                if (propertyAssignment) {
                    const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                    propertyAssignmentValue.replaceWithText("\"" + newClassName + "\"")
                }
                else {
                    configurationObject.addPropertyAssignment({
                        name: "text",
                        initializer: newClassName
                    })
                }
            }
            
            
            await newClassFile.save()
            await rootViewControllerFile.save()
            
            let compiledCodeFileContents: string
            
            try {
                
                compiledCodeFileContents = transformSync(newClassFile.getFullText()).code
                
            } catch (exception) {
                
                console.log(exception)
                console.log(newClassFile.getFullText())
                
            }
            
            this.currentEditingTarget = {
                className: newClassName,
                propertyKeyPath: "view",
                runtimeObjectKeyPath: "contentViewController.view"
            }
            
            await respondWithMessage({
                
                codeFileContents: newClassFile.getFullText(),
                compiledCodeFileContents: compiledCodeFileContents,
                componentName: componentName
                
            })
            
            
        }
        
        
        targets.DeleteViewController = async (message, socketSession, respondWithMessage) => {
            
            const UIRootViewController = this.classDeclarationWithName("UIRootViewController")
            
            const viewController = this.classDeclarationWithName(message.className)
            
            // viewController.findReferences().forEach((value, index, array) => {
            //
            //
            //
            //     value.getDefinition()
            //
            // })
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const rootViewControllerFile = sourceFiles.find(
                (file, index, array) => file.getClass(declaration =>
                    declaration.getName() != UIRootViewController.getName() &&
                    this.isClassKindOfReferenceClass(declaration, UIRootViewController)
                )
            )
            
            // Unregister the class in the RootViewController
            
            const classNameLowercased = message.className.slice(0, 1).toLowerCase() + message.className.slice(1)
            
            const rootViewControllerClass = rootViewControllerFile.getClasses()[0]
            const contentViewControllersProperty = rootViewControllerClass.getProperty("contentViewControllers")
            contentViewControllersProperty.getInitializer()
                .asKind(SyntaxKind.ObjectLiteralExpression)
                .getProperty(classNameLowercased).remove()
            
            rootViewControllerFile.organizeImports()
            await this.webclientProject.save()
            fs.unlinkSync(viewController.getSourceFile().getFilePath())
            this.rebuildWebclient()
            
            this.reloadEditorProject()
            
            await respondWithMessage(true)
            
        }
        
        
        targets.SaveFile = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            resultFile.replaceText([0, resultFile.getEnd()], message.valueString)
            
            
            await this.webclientProject.save()
            this.rebuildWebclient()
            
            await respondWithMessage(resultFile.getText())
            
            
        }
        
        
        targets.ReloadEditorFiles = async (message, socketSession, respondWithMessage) => {
            this.reloadEditorProject()
            await respondWithMessage(null)
        }
        
        
    }
    
    
    private rebuildWebclient() {
        
        child_process.execSync("arch -x86_64 /bin/sh -c \"cd webclient && npm run esbuild \"").toString()
        
    }
    
    private setValueForKeyPathInObjectCreatingPath<T>(
        keyPathComponents: string[],
        configurationObject: ObjectLiteralExpression,
        valueString: string
    ) {
        
        // Set value for the keypath with createPath enabled
        
        keyPathComponents.slice(0, -1).forEach((value, index, array) => {
            
            const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                .find(assignment => assignment.getChildren()[0].getText() == value)
            
            if (propertyAssignment) {
                
                const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                if (propertyAssignmentValue instanceof ObjectLiteralExpression) {
                    configurationObject = propertyAssignmentValue
                }
                
            }
            else {
                
                const assignment = configurationObject.addPropertyAssignment({
                    name: value,
                    initializer: "{}"
                })
                
                const initializer = assignment.getInitializer()
                if (initializer instanceof ObjectLiteralExpression) {
                    configurationObject = initializer
                }
                
            }
            
        })
        
        
        const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
            .find(assignment => assignment.getChildren()[0].getText() == keyPathComponents.lastElement)
        
        if (propertyAssignment) {
            
            const propertyAssignmentValue = propertyAssignment.getChildren()[2]
            
            return this.locationOfNode(
                propertyAssignmentValue.replaceWithText(valueString)
            )
            
            
        }
        else {
            
            const assignment = configurationObject.addPropertyAssignment({
                name: keyPathComponents.lastElement,
                initializer: valueString
            })
            
            const initializer = assignment.getInitializer()
            return this.locationOfNode(
                //configurationObject.getProperty(keyPathComponents.lastElement)
                initializer
            )
            
        }
    }
    
    private locationOfEditing(
        resultFile: SourceFile,
        targetFile: SourceFile,
        message: { className: string; propertyKeyPath: string }
    ): CBEditorPropertyLocation {
        
        
        const fileText = resultFile.getText()
        
        const classObject = resultFile.getClass(message.className)
        let propertyObject = this.propertyDeclarationForClassAndKey(
            classObject,
            message.propertyKeyPath
        )
        if (!propertyObject) {
            return
        }
        
        const classPropertyTypeName = propertyObject?.getType()?.compilerType?.symbol?.getName()
        if (!classPropertyTypeName) {
            return
        }
        
        const targetObjectClassDeclaration = targetFile.getClass(classPropertyTypeName)
        const keyPathComponents = message.propertyKeyPath.split(".")
        let targetObjectClassPropertyObject = this.setAccessorForClassAndKey(
            targetObjectClassDeclaration,
            keyPathComponents.lastElement
        )
        
        let locationOfEditedValue: CBEditorPropertyLocation | undefined
        
        // let propertyReferenceLocations: {
        //     fileName: string;
        //     start: { column: number; lineNumber: number };
        //     className: string;
        //     end: { column: number; lineNumber: number }
        // }[]
        
        if (propertyObject) {
            
            const propertyReferences = targetObjectClassPropertyObject?.findReferencesAsNodes()?.filter(
                reference => reference.getSourceFile() == classObject.getSourceFile()
            ) ?? []
            
            const propertyReferenceDescriptors = propertyReferences.map(reference => {
                
                const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                const isAssignment = (binaryExpression?.getOperatorToken()?.getText() == "=")
                const isSimpleAssignment = true
                const isInConstructor = binaryExpression?.getFirstAncestorByKind(SyntaxKind.Constructor) && true
                const left = binaryExpression?.getLeft()
                const right = binaryExpression?.getRight()
                const isBeingAssignedTo = Utils.IS(reference.getFirstAncestor(node => node == left))
                const childrenOfKind = left?.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)
                
                return {
                    binaryExpression,
                    isInConstructor,
                    isAssignment,
                    left,
                    right,
                    isBeingAssignedTo,
                    childrenOfKind,
                    reference,
                    isSimpleAssignment
                }
                
            })
            // Find existing value assignment in constructor and assign value
            
            const assignmentObject = propertyReferenceDescriptors.find(
                referenceDescriptor => (
                    referenceDescriptor.isAssignment &&
                    referenceDescriptor.isBeingAssignedTo &&
                    referenceDescriptor.isInConstructor
                )
            )
            
            locationOfEditedValue = this.locationOfNode(
                assignmentObject?.right
            )
            
            // Find parent object initializer in constructor or declaration and assign value
            
            // through configuredWithObject
            
            const classConstructor = classObject.getConstructors()[0]
            
            const targetObjectPropertyReferences = propertyObject.findReferencesAsNodes().filter(
                reference => reference.getSourceFile() == classObject.getSourceFile()
            )
            
            
            const targetObjectConstructorReferences = targetObjectPropertyReferences.filter(
                reference => this.isNodeContainedInNode(
                    reference,
                    classConstructor
                )
            )
            const targetObjectConstructorAssignmentReferences = targetObjectConstructorReferences.filter(reference => {
                
                const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                const leftReferenceText = binaryExpression?.getLeft()?.getText()
                
                const callExpression = reference.getFirstAncestorByKind(SyntaxKind.CallExpression)
                const isConfiguration = callExpression?.getExpression()?.getText()?.endsWith("configureWithObject")
                
                return (leftReferenceText == "this." + keyPathComponents.firstElement &&
                    binaryExpression?.getOperatorToken()?.getText() == "=" && this.isNodeContainedInNode(
                        reference,
                        binaryExpression?.getLeft()
                    )) || isConfiguration
                
            })
            
            
            const targetObjectConstructorAssignmentReference = targetObjectConstructorAssignmentReferences.firstElement ||
                propertyObject.getInitializer()?.getFirstChild(
                    node => node.getText() == propertyObject.getNameNode().getText()
                )
            
            
            if ((targetObjectConstructorAssignmentReference || propertyObject.hasInitializer?.()) && !assignmentObject) {
                
                const sourceFiles = this.webclientProject.getSourceFiles()
                const UIObjectClass = sourceFiles.find(
                    file => file.getClass(
                        declaration => declaration.getName() == "UIObject"
                    )
                ).getClass(declaration => declaration.getName() == "UIObject")
                
                const configurationMethodCallReference = UIObjectClass.getMethod(
                        method => method.getName() == "configuredWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                                ?.getRight()
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configureWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            targetObjectConstructorAssignmentReference?.getFirstAncestor(
                                node => node.getText().contains(keyPathComponents[0] + ".configureWithObject")
                            )
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configuredWithObject"
                    ).findReferencesAsNodes().find(
                        reference => {
                            let nodeContainedInNode = false
                            if (propertyObject instanceof PropertyDeclaration) {
                                nodeContainedInNode = this.isNodeContainedInNode(
                                    reference,
                                    propertyObject.getInitializer()
                                )
                            }
                            return nodeContainedInNode
                        }
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
                
                const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
                
                if (configurationObject) {
                    
                    const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                        .find(assignment => assignment.getChildren()[0].getText() == keyPathComponents.lastElement)
                    
                    if (propertyAssignment) {
                        
                        const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                        
                        locationOfEditedValue = this.locationOfNode(
                            propertyAssignmentValue
                        )
                        
                        
                    }
                    
                    
                }
                else {
                    
                    // Add configuration to targetObjectConstructorAssignmentReference
                    const right = targetObjectConstructorAssignmentReference
                        ?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                        ?.getRight()
                    locationOfEditedValue = this.locationOfNode(right)
                    
                }
                
                var asdasdasdasdasdasdasdasd = 1
                
            }
            
            
        }
        
        
        return locationOfEditedValue
        
    }
    
    private locationOfNode(newNode: Node) {
        
        if (!newNode) {
            
            return undefined
            
        }
        
        const classObject = newNode.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)
        
        const result = {
            className: classObject.getName(),
            start: {
                lineNumber: newNode.getStartLineNumber(),
                column: newNode.getStart() - newNode.getStartLinePos()
            },
            end: {
                lineNumber: newNode.getEndLineNumber(),
                column: newNode.getEnd() - newNode.getStartLinePos() + 1
            }
        }
        
        result.start.column = result.start.column +
            newNode.getFullText().length - newNode.getText().length
        
        return result
        
    }
    
    private propertyValueClass(sourceFiles: SourceFile[], propertyObject: PropertyDeclaration) {
        
        let propertyValueClass: ClassDeclaration
        sourceFiles.find(
            (file, index, array) => file.getClass(
                declaration => {
                    const result = declaration.getName() == propertyObject.getStructure().type
                    if (result) {
                        propertyValueClass = declaration
                    }
                    return result
                }
            )
        )
        
        return propertyValueClass
        
    }
    
    private setAccessorForClassAndKey(classObject: ClassDeclaration, key: string): SetAccessorDeclaration | undefined {
        
        if (!classObject) {
            return undefined
        }
        
        return classObject?.getSetAccessor(
            value => value.getName() == key
        ) || this.setAccessorForClassAndKey(classObject.getBaseClass(), key)
        
    }
    
    private propertyDeclarationForClassAndKey(
        classObject: ClassDeclaration,
        key: string
    ): PropertyDeclaration | undefined {
        
        if (!classObject) {
            return undefined
        }
        
        return classObject?.getProperty(
            property => property.getName() == key
        ) || this.propertyDeclarationForClassAndKey(classObject?.getBaseClass(), key)
        
    }
    
    private setAccessorOrPropertyDeclarationForClassAndKeyPath(
        classObject: ClassDeclaration,
        keyPath: string,
        original = { classObject, keyPath, className: classObject?.getName() }
    ) {
        
        if (!classObject) {
            return undefined
        }
        
        
        let keyPathComponents = keyPath.split(".")
        
        let propertyDeclaration: PropertyDeclaration | PropertySignature | SetAccessorDeclaration | undefined
        
        for (let i = 0; i < keyPathComponents.length; i++) {
            
            const key = keyPathComponents[i]
            
            propertyDeclaration = classObject?.getSetAccessor(
                    accessor => accessor.getName() == key
                ) || Utils.IF(i < keyPathComponents.length - 1)(() =>
                    classObject?.getGetAccessor(
                        accessor => accessor.getName() == key
                    )
                ).ELSE(() => undefined) ||
                classObject?.getProperty(
                    property => property.getName() == key
                ) || this.setAccessorOrPropertyDeclarationForClassAndKeyPath(
                    classObject?.getBaseClass(),
                    key,
                    original
                )
            
            if (!propertyDeclaration) {
                
                var asd = 1
                
                break
                
            }
            
            
            const classDeclarationOfPropertyType = this.classDeclarationWithName(propertyDeclaration?.getType()
                ?.compilerType
                ?.symbol
                ?.getName())
            
            if (!classDeclarationOfPropertyType) {
                
                var asdasdasdasdasd = 1
                
                keyPathComponents = keyPathComponents.slice(i)
                
                break
                
            }
            
            classObject = classDeclarationOfPropertyType
            
        }
        
        if (!propertyDeclaration || propertyDeclaration.getName() != keyPathComponents.lastElement) {
            
            keyPath = keyPathComponents.join(".")
            const completionsAtPositionObject = this.completionsAtPosition(
                classObject.getType(),
                keyPath
            )
            propertyDeclaration = this.propertyObjectWithCompletionsObject(completionsAtPositionObject, keyPath)
            
        }
        
        return propertyDeclaration
        
    }
    
    private propertyObjectWithCompletionsObject(
        completionsAtPositionObject: {
            completionsAtPosition: any;
            sourceFileText: string;
            filePath: string
        },
        keyPath: string
    ) {
        
        if (!completionsAtPositionObject.completionsAtPosition) {
            return
        }
        
        const keyPathComponents = keyPath.split(".")
        const declaration: CompletionEntry = completionsAtPositionObject.completionsAtPosition?.entries.find((entry) => entry.name == keyPathComponents.lastElement)
        const filePath = completionsAtPositionObject.filePath
        const symbolObject = this.webclientProject.getLanguageService()
            .compilerObject.getCompletionEntrySymbol(
                filePath,
                completionsAtPositionObject.sourceFileText.length,
                declaration?.name,
                undefined
            )
        
        if (!symbolObject) {
            return
        }
        
        const sourceFile = this.webclientProject.getSourceFile(symbolObject.valueDeclaration.getSourceFile()["path"])
        const propertyIdentifier = sourceFile.getDescendantAtPos(symbolObject.valueDeclaration.getStart())
        
        // const wrappedNode = createWrappedNode(symbolObject.valueDeclaration)
        
        const propertyObject = propertyIdentifier.getParentIfKind(SyntaxKind.PropertySignature) ??
            propertyIdentifier.getParentIfKind(SyntaxKind.PropertyDeclaration)
        
        return propertyObject
        
    }
    
    private valueStringForPropertyAndMessageValue(
        targetObjectClassPropertyObject: SetAccessorDeclaration | PropertyDeclaration | PropertySignature,
        valueString: string
    ) {
        
        let result = valueString
        
        const valueTypeName = targetObjectClassPropertyObject.getType().compilerType.symbol?.getName() ??
            targetObjectClassPropertyObject.getType().compilerType["intrinsicName"] ??
            targetObjectClassPropertyObject.getType().getNonNullableType().getText(targetObjectClassPropertyObject)
        
        if (valueTypeName == "UIColor") {
            
            result = "new UIColor(\"" + valueString + "\")"
            
            if (valueString.trim().startsWith("[") && valueString.trim().endsWith("]")) {
                
                result = valueString.trim().substring(1, valueString.length - 1)
                
            }
            
        }
        
        
        if (valueTypeName == "string") {
            
            result = "\"" + valueString + "\""
            
        }
        
        return result
        
    }
    
    private reloadEditorProject() {
        this.webclientProject = new Project({
            tsConfigFilePath: "webclient/tsconfig.json"
            // resolutionHost: (moduleResolutionHost, getCompilerOptions) => {
            //     return {
            //         resolveModuleNames: (moduleNames, containingFile) => {
            //             const compilerOptions = getCompilerOptions();
            //             const resolvedModules: ts.ResolvedModule[] = [];
            //
            //             for (const moduleName of moduleNames.map(removeTsExtension)) {
            //                 const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost);
            //                 if (result.resolvedModule)
            //                     resolvedModules.push(result.resolvedModule);
            //             }
            //
            //             return resolvedModules;
            //         },
            //     };
            //
            //     function removeTsExtension(moduleName: string) {
            //         if (moduleName.slice(-3).toLowerCase() === ".ts")
            //             return moduleName.slice(0, -3);
            //         return moduleName;
            //     }
            // }
        })
        
        this.webclientProject.addSourceFilesAtPaths([
            "webclient/node_modules/uicore-ts/**/*.ts",
            "webclient/node_modules/cbcore-ts/**/*.ts"
        ])
        
        this.testingSourceFile.deleteImmediatelySync()
        this.testingSourceFile = this.webclientProject.createSourceFile("test_file_for_CBEditorController.ts", "")
        
    }
    
    private isNodeContainedInNode(node: Node, parentNode: Node) {
        const parent = node?.getParent()
        return (parent && parent == parentNode) || (parent && this.isNodeContainedInNode(parent, parentNode))
    }
    
    private editableDeclarations(
        viewClass: ClassDeclaration,
        keyPathComponentsToPrepend: string[] = []
    ): EditableDeclarationObject[] {
        
        if (!viewClass) {
            return []
        }
        
        const colorReferenceClass = this.classDeclarationWithName("UIColor")
        
        
        let accessorDeclarations = viewClass.getSetAccessors().filter(
            propertyAccessor => ["string", "number"].contains(
                propertyAccessor.getStructure().parameters.firstElement.type as string
            ) || this.isClassKindOfReferenceClass(
                this.classDeclarationWithName(propertyAccessor.getStructure().parameters.firstElement.type as string),
                colorReferenceClass
            ) || propertyAccessor.getType().getUnionTypes().anyMatch(
                value => value.isString() || value.isStringLiteral()
            )
        )
        
        const propertyDeclarations = viewClass.getProperties().filter(
            (propertyDeclaration: PropertyDeclaration) => {
                
                const declarationStructure = propertyDeclaration.getStructure()
                
                if (declarationStructure.isStatic) {
                    return false
                }
                
                let result = (["string", "number"].contains(
                    declarationStructure.type as string
                ) || this.isClassKindOfReferenceClass(
                    this.classDeclarationWithName(declarationStructure.type as string),
                    colorReferenceClass
                ))
                
                const name = declarationStructure.name
                const isAlreadyInAccessorsArray = accessorDeclarations.anyMatch(
                    value => value.getName() == name.replace(
                        "_",
                        ""
                    )
                )
                if (result && name.startsWith("_") && isAlreadyInAccessorsArray) {
                    result = false
                }
                
                
                return result
                
            }
        )
        
        let result: EditableDeclarationObject[] = accessorDeclarations.map(declaration => {
            
            const result = {
                declaration: declaration,
                keyPathComponents: keyPathComponentsToPrepend.concat([declaration.getName()])
            }
            
            return result
            
        })
        if (propertyDeclarations) {
            result = result.concat(propertyDeclarations.map(declaration => {
                
                const result = {
                    declaration: declaration,
                    keyPathComponents: keyPathComponentsToPrepend.concat([declaration.getName()])
                }
                
                return result
                
            }))
        }
        
        const baseClass = viewClass.getBaseClass()
        if (baseClass) {
            result = result.concat(this.editableDeclarations(baseClass))
        }
        
        function withSuperclasses(classDeclaration: ClassDeclaration, result: ClassDeclaration[] = []) {
            result.push(classDeclaration)
            const baseClassDeclaration = classDeclaration.getBaseClass()
            if (baseClassDeclaration) {
                withSuperclasses(baseClassDeclaration, result)
            }
            return result
        }
        
        function getAccessorForSetAccessor(
            setAccessorDeclaration: SetAccessorDeclaration,
            viewClassDeclaration: ClassDeclaration
        ) {
            const viewClassDeclarations = withSuperclasses(viewClassDeclaration)
            const result = viewClassDeclarations.map(value =>
                value.getGetAccessor(getAccessor =>
                    getAccessor.getName() == setAccessorDeclaration.getName()
                )
            ).find(value => value?.getName() == setAccessorDeclaration?.getName())
            return result
        }
        
        function setAccessorForGetAccessor(
            getAccessorDeclaration: GetAccessorDeclaration,
            viewClassDeclaration: ClassDeclaration
        ) {
            const viewClassDeclarations = withSuperclasses(viewClassDeclaration)
            const result = viewClassDeclarations.map(value =>
                value.getSetAccessor(setAccessor =>
                    setAccessor?.getName() == getAccessorDeclaration.getName()
                )
            ).find(value => value?.getName() == getAccessorDeclaration.getName())
            return result
        }
        
        const viewClassDeclarations = withSuperclasses(viewClass)
        
        const setAccessorDeclarations = viewClassDeclarations.flatMap(
            value => value.getSetAccessors()
        ).uniqueElementsOnlyWithFunction(
            item => item.getName()
        )
        
        const getAccessorDeclarations = viewClassDeclarations.flatMap(
            value => value.getGetAccessors()
        ).uniqueElementsOnlyWithFunction(
            item => item.getName()
        )
        
        const accessorsWithNestedAttributes = getAccessorDeclarations.filter(accessor =>
            accessor.getDecorator(declaration =>
                declaration.getName() == "CBEditorNestedAttributes"
            ) ||
            setAccessorForGetAccessor(accessor, viewClass)?.getDecorator(declaration =>
                declaration.getName() == "CBEditorNestedAttributes"
            )
        )
        
        accessorsWithNestedAttributes.forEach(value => {
                const items = this.editableDeclarations(
                    this.classDeclarationWithName(value.getReturnType().compilerType.getSymbol().getName()),
                    keyPathComponentsToPrepend.concat([value.getName()])
                )
                return result = result.concat(
                    items
                )
            }
        )
        
        const propertyDeclarationsWithNestedAttributes = viewClass.getProperties().filter(
            propertyDeclaration => {
                
                const declarationStructure = propertyDeclaration.getStructure()
                
                let result = propertyDeclaration.getDecorator(
                    declaration => {
                        const result = declaration.getName() == "CBEditorNestedAttributes"
                        const numberOfLevels: number = (declaration.getStructure().arguments[0] ?? "1").numericalValue
                        return result
                    }
                ) && true
                
                const name = declarationStructure.name
                const isAlreadyInAccessorsArray = accessorDeclarations.anyMatch(
                    value => value.getName() == name.replace(
                        "_",
                        ""
                    )
                )
                if (result && name.startsWith("_") && isAlreadyInAccessorsArray) {
                    result = false
                }
                
                return result
                
            }
        )
        
        propertyDeclarationsWithNestedAttributes.forEach(propertyDeclaration => {
                
                const declaration = propertyDeclaration.getDecorator(
                    declaration => declaration.getName() == "CBEditorNestedAttributes"
                )
                
                const numberOfLevelsValue: number = (declaration.getStructure().arguments[0] ?? "1").numericalValue
                
                if (numberOfLevelsValue > 1) {
                    
                    const editableDeclarationsWithAutocomplete = (
                        propertyType: Type,
                        depthLeft: number,
                        keyPathComponentsToPrependForAutocomplete: string[] = []
                    ) => {
                        
                        let result: EditableDeclarationObject[] = []
                        
                        const { sourceFileText, filePath, completionsAtPosition } = this.completionsAtPosition(
                            propertyDeclaration.getParent().getType(),
                            Utils.IF(keyPathComponentsToPrependForAutocomplete.length)(
                                () => keyPathComponentsToPrependForAutocomplete.join(".") + ".")
                                .ELSE(() => "")
                        )
                        const propertyEntries = completionsAtPosition.entries.filter((entry) => entry.kind == "property")
                        
                        result = propertyEntries.flatMap((declaration) => {
                            
                            if (depthLeft) {
                                return editableDeclarationsWithAutocomplete(
                                    propertyType,
                                    depthLeft - 1,
                                    keyPathComponentsToPrependForAutocomplete.concat([declaration.name])
                                )
                            }
                            
                            const symbolObject = this.webclientProject.getLanguageService()
                                .compilerObject.getCompletionEntrySymbol(
                                    filePath,
                                    sourceFileText.length,
                                    declaration.name,
                                    undefined
                                )
                            
                            const sourceFile = this.webclientProject.getSourceFile(symbolObject.valueDeclaration.getSourceFile()["path"])
                            const propertyIdentifier = sourceFile.getDescendantAtPos(symbolObject.valueDeclaration.getStart())
                            
                            // const wrappedNode = createWrappedNode(symbolObject.valueDeclaration)
                            
                            const propertyObject = propertyIdentifier.getParentIfKind(SyntaxKind.PropertySignature) ??
                                propertyIdentifier.getParentIfKind(SyntaxKind.PropertyDeclaration)
                            
                            const resultObject: EditableDeclarationObject[] = [
                                {
                                    declaration: propertyObject,
                                    keyPathComponents: [propertyDeclaration.getName()].concat(
                                        keyPathComponentsToPrependForAutocomplete.slice(1).concat([declaration.name])
                                    )
                                }
                            ]
                            
                            return resultObject
                            
                        })
                        
                        return result
                        
                    }
                    
                    result = result.concat(editableDeclarationsWithAutocomplete(
                        propertyDeclaration.getType(),
                        numberOfLevelsValue - 1,
                        [propertyDeclaration.getName()]
                    ))
                    
                }
                
                
                result = result.concat(
                    this.editableDeclarations(
                        this.classDeclarationWithName(propertyDeclaration.getStructure()?.type as string),
                        keyPathComponentsToPrepend.concat([propertyDeclaration.getName()])
                    )
                )
            }
        )
        
        return result
        
    }
    
    private completionsAtPosition(objectType: Type, keyPath: string) {
        
        var sourceFileText = ("var test_variable_for_CBEditorController: (" + objectType.getText() + ");\n" +
            "test_variable_for_CBEditorController." + keyPath)
        var filePath = this.testingSourceFile.getFilePath()
        this.testingSourceFile.replaceWithText(sourceFileText)
        
        
        var completionsAtPosition = this.webclientProject.getLanguageService()
            .compilerObject.getCompletionsAtPosition(
                this.testingSourceFile.getFilePath(),
                sourceFileText.length,
                { triggerKind: CompletionTriggerKind.Invoked }
            )
        
        return { sourceFileText, filePath, completionsAtPosition }
        
    }
    
    private isClassKindOfReferenceClass(
        classDeclaration: ClassDeclaration,
        referenceClassDeclaration: ClassDeclaration
    ) {
        return classDeclaration && (
            classDeclaration.getName() == referenceClassDeclaration.getName() || this.isClassKindOfReferenceClass(
                classDeclaration.getBaseClass(),
                referenceClassDeclaration
            )
        )
    }
    
    private classDeclarationWithName(className: string) {
        
        const sourceFiles = this.webclientProject.getSourceFiles()
        return sourceFiles.find(
            (file, index, array) => file.getClass(
                declaration => declaration.getName() == className
            )
        )?.getClass(className)
        
    }
    
    private annotatePropertyDescriptor(sourceFiles: SourceFile[], propertyDescriptor: CBEditorPropertyDescriptor) {
        
        const resultFile = sourceFiles.find(
            file => file.getClass(
                declaration => declaration.getName() == propertyDescriptor.className
            )
        )
        
        //sourceFiles.removeElement(resultFile)
        
        if (!resultFile) {
            
            var asd = 1
            
            return
            
        }
        
        const classObject = resultFile.getClass(propertyDescriptor.className)
        const propertyObject = this.propertyDeclarationForClassAndKey(
            classObject,
            propertyDescriptor.propertyKeyPath
        )
        
        const propertyReferences = propertyObject?.findReferencesAsNodes()?.filter(
            reference => reference.getSourceFile() == classObject.getSourceFile()
        ) ?? []
        
        const result: CBEditorAnnotatedPropertyDescriptor = {
            
            className: propertyDescriptor.className,
            propertyKey: propertyDescriptor.propertyKeyPath,
            isDeclaredInClassFile: propertyObject?.getFirstAncestorByKind(SyntaxKind.ClassDeclaration) == classObject,
            isReferencedInClassFile: propertyReferences.length > 0,
            isInNodeModules: classObject.getSourceFile().isInNodeModules(),
            isInDeclarationFile: classObject.getSourceFile().isDeclarationFile(),
            superclassPropertyDescriptor: Utils.IF(classObject.getBaseClass())(() => this.annotatePropertyDescriptor(
                sourceFiles,
                {
                    className: classObject.getBaseClass().getName(),
                    propertyKeyPath: propertyDescriptor.propertyKeyPath,
                    runtimeObjectKeyPath: propertyDescriptor.runtimeObjectKeyPath
                }
            )).ELSE(() => undefined)
            
            
        }
        
        return result
        
    }
    
    
    public static get sharedInstance() {
        return this._instance
    }
    
    // noinspection TypeScriptUMDGlobal,JSDeprecatedSymbols
    public static Instance(expressApp: Application, socketIO: Server) {
        return this._instance || (this._instance = new this(expressApp, socketIO))
    }
    
}
