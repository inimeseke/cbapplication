import { io, Socket } from "socket.io-client"
import { FIRST_OR_NIL, IF, IS, IS_NIL, IS_NOT, MAKE_ID, nil, NO, RETURNER, UIObject, YES } from "../../uicore-ts"
import { CBCore } from "./CBCore"
import {
    CBSocketHandshakeInitMessage,
    CBSocketHandshakeResponseMessage,
    CBSocketMessage,
    CBSocketMessageCompletionFunction,
    CBSocketMessageHandlerFunction,
    CBSocketMessageSendResponseFunction,
    CBSocketMultipleMessage,
    CBSocketMultipleMessagecompletionFunction,
    CBSocketMultipleMessageObject,
    SocketClientInterface
} from "./CBDataInterfaces"
import { CBSocketCallbackHolder } from "./CBSocketCallbackHolder"


declare interface CBSocketClientMessageToBeSent {
    
    key: string;
    message: any;
    
    inResponseToMessage: CBSocketMessage<any>;
    keepWaitingForResponses: boolean;
    
    isBoundToUserWithID: string;
    
    completionPolicy: string;
    
    didSendFunction?: () => void;
    
    completion: CBSocketMessageCompletionFunction;
    
}


declare interface CBSocketClientErrorMessage {
    
    _isCBSocketErrorMessage: boolean;
    
    messageData: any;
    
}





export function IS_SOCKET_ERROR(object: any): object is CBSocketClientErrorMessage {
    
    const result = (IS(object) && object._isCBSocketErrorMessage)
    
    return result
    
}

export function IS_NOT_SOCKET_ERROR(object: any) {
    
    return !IS_SOCKET_ERROR(object)
    
}





export class CBSocketClient extends UIObject {
    
    _socket: Socket = io()
    _isConnectionEstablished = NO
    
    _collectMessagesToSendLater = NO
    
    _messagesToBeSent: CBSocketClientMessageToBeSent[] = []
    
    static _sharedInstance: CBSocketClient
    
    _core: CBCore
    
    _subscribedKeys: {
        [x: string]: boolean
    } = {}
    
    _callbackHolder = new CBSocketCallbackHolder(this)
    
    static responseMessageKey = "CBSocketResponseMessage"
    static multipleMessageKey = "CBSocketMultipleMessage"
    
    
    static disconnectionMessage: CBSocketClientErrorMessage = {
        
        _isCBSocketErrorMessage: YES,
        
        messageData: "Server disconnected"
        
    }
    
    
    constructor(core: CBCore) {
        
        super()
        
        this._core = core
        
        
        this.socket.on("connect", () => {
            
            console.log("Socket.io connected to server. clientID = " + this.socket + ", socketID = " + this.socket)
            
            var instanceIdentifier = localStorage.getItem("InstanceIdentifier")
            
            if (IS_NOT(instanceIdentifier)) {
                
                instanceIdentifier = MAKE_ID()
                localStorage.setItem("InstanceIdentifier", instanceIdentifier)
                
            }
            
            const handshakeMessage: CBSocketHandshakeInitMessage = {
                
                accessToken: null,
                userID: this._core.userProfile._id,
                
                inquiryAccessKey: null,
                
                instanceIdentifier: instanceIdentifier
                
            }
            
            this.socket.emit("CBSocketHandshakeInitMessage", {
                
                identifier: MAKE_ID(),
                messageData: handshakeMessage
                
            })
            
            
        })
        
        
        this.socket.on(
            "CBSocketHandshakeResponseMessage",
            (message: CBSocketMessage<CBSocketHandshakeResponseMessage>) => {
                
                
                this._isConnectionEstablished = message.messageData.accepted
                
                if (!message.messageData.accepted) {
                    
                    console.log("SocketIO connection failed.")
                    
                    this._core.dialogViewShowerClass.alert(
                        "Failed to establish connection to server.",
                        () => {}
                    )
                    
                }
                else {
                    
                    console.log("SocketIO connection handshake completed.")
                    
                    this._callbackHolder = new CBSocketCallbackHolder(this, this._callbackHolder)
                    
                    core.userProfile = message.messageData.userProfile
                    
                    this.sendUnsentMessages()
                    
                }
                
                
            }
        )
        
        
        this.socket.on("disconnect", () => {
            
            console.log("Socket.io disconnected from server. clientID = " + this.socket + ".")
            
            this._isConnectionEstablished = NO
            
            this._callbackHolder.isValid = NO
            
            this._callbackHolder.triggerDisconnectHandlers()
            
            
        })
        
        
        
        
        
        this.socket.on("CBPerformReconnect", (message?: string) => {
            
            console.log("Performing socket reconnection.")
            
            core.reloadSocketConnection()
            
            if (message) {
    
                this._core.dialogViewShowerClass.alert(message)
                
            }
            
            
            
        })
        
        
        
        
        
        this._socket.on(
            CBSocketClient.responseMessageKey,
            (message: CBSocketMessage<any>) => {
                
                this.didReceiveMessageForKey(CBSocketClient.responseMessageKey, message)
                
            }
        )
        
        this._socket.on(
            CBSocketClient.multipleMessageKey,
            (message: CBSocketMessage<CBSocketMultipleMessageObject[]>) => {
                
                console.log("Received " + message.messageData.length + " messages.")
                
                
                this.didReceiveMessageForKey(CBSocketClient.multipleMessageKey, message)
                
            }
        )
        
        
        
        
    }
    
    
    
    
    
    get socket() {
        return this._socket
    }
    
    
    
    
    
    cancelUnsentMessages(messagesToCancel: CBSocketClientMessageToBeSent[]) {
        
        this._messagesToBeSent = this._messagesToBeSent.filter((
            messageObject: CBSocketClientMessageToBeSent,
            index: number,
            array: CBSocketClientMessageToBeSent[]
        ) => !messagesToCancel.contains(messageObject))
        
    }
    
    
    
    
    
    sendUnsentMessages(receiveResponsesTogether = NO, completion?: CBSocketMultipleMessagecompletionFunction) {
        
        if (!this._isConnectionEstablished || this._collectMessagesToSendLater) {
            
            return
            
        }
        
        const groupedMessages: CBSocketMultipleMessageObject<any>[] = []
        const didSendFunctions: (() => void)[] = []
        
        
        this._messagesToBeSent.copy().forEach((messageToBeSentObject: CBSocketClientMessageToBeSent) => {
            
            if (this._isConnectionEstablished) {
                
                var message = messageToBeSentObject.message
                if (IS_NOT(message)) {
                    message = ""
                }
                
                const identifier = MAKE_ID()
                
                const completion = messageToBeSentObject.completion
                
                const messageObject: CBSocketMessage<any> = {
                    
                    messageData: message,
                    identifier: identifier,
                    keepWaitingForResponses: messageToBeSentObject.keepWaitingForResponses,
                    inResponseToIdentifier: messageToBeSentObject.inResponseToMessage.identifier
                    
                }
                
                const shouldSendMessage = this._callbackHolder.socketShouldSendMessage(
                    messageToBeSentObject.key,
                    messageObject,
                    messageToBeSentObject.completionPolicy,
                    completion
                )
                
                if (shouldSendMessage) {
                    
                    
                    groupedMessages.push({
                        
                        key: messageToBeSentObject.key,
                        message: messageObject
                        
                    })
                    
                    
                }
                
                didSendFunctions.push(messageToBeSentObject.didSendFunction)
                
                
            }
            
        })
        
        
        this._messagesToBeSent = []
        
        if (IS_NOT(groupedMessages.length)) {
            
            return
            
        }
        
        if (groupedMessages.length == 1) {
            
            console.log("sending 1 unsent message.")
            
        }
        else {
            
            console.log("Sending " + groupedMessages.length + " unsent messages.")
            
        }
        
        
        
        const messageObject: CBSocketMultipleMessage = {
            
            messageData: groupedMessages,
            identifier: MAKE_ID(),
            
            shouldGroupResponses: receiveResponsesTogether
            
        }
        
        //if (receiveResponsesTogether) {
        
        this._callbackHolder.socketWillSendMultipleMessage(messageObject, completion)
        
        //}
        
        this.socket.emit(CBSocketClient.multipleMessageKey, messageObject)
        
        
        didSendFunctions.forEach((didSendFunction, index, array) => {
            didSendFunction()
        })
        
    }
    
    
    
    
    
    static completionPolicy = {
        
        "all": "all",
        "allDifferent": "allDifferent",
        "first": "first",
        "last": "last",
        "firstAndLast": "firstAndLast",
        "firstAndLastIfDifferent": "firstAndLastIfDifferent",
        "directOnly": "directOnly",
        "firstOnly": "firstOnly",
        "storedOrFirst": "storedOrFirst"
        
    }
    
    
    sendUserBoundMessageForKeyWithPolicy(
        key: string,
        message: any,
        completionPolicy: string,
        completion?: CBSocketMessageCompletionFunction
    ) {
        
        
        this._sendMessageForKey(key, message, undefined, NO, completionPolicy, YES, nil, completion)
        
    }
    
    sendUserBoundMessageForKey(key: string, message: any, completion?: CBSocketMessageCompletionFunction) {
        
        this._sendMessageForKey(key, message, undefined, NO, undefined, YES, nil, completion)
        
    }
    
    sendMessageForKeyWithPolicy(
        key: string,
        message: any,
        completionPolicy: string,
        completion?: CBSocketMessageCompletionFunction
    ) {
        
        
        this._sendMessageForKey(key, message, undefined, NO, completionPolicy, NO, nil, completion)
        
    }
    
    sendMessageForKey(key: string, message: any, completion?: CBSocketMessageCompletionFunction) {
        
        this._sendMessageForKey(key, message, undefined, NO, undefined, NO, nil, completion)
        
    }
    
    
    resultForMessageForKey(key: string, message: any, completionPolicy?: string, isUserBound = NO) {
        
        const result = new Promise<{
            
            responseMessage: any,
            result: any,
            errorResult: any,
            
            respondWithMessage: CBSocketMessageSendResponseFunction
            
        }>((resolve, reject) => {
            
            this._sendMessageForKey(
                key,
                message,
                undefined,
                NO,
                completionPolicy,
                isUserBound,
                nil,
                (responseMessage, respondWithMessage) => resolve({
                    
                    responseMessage: responseMessage,
                    result: IF(IS_NOT_SOCKET_ERROR(responseMessage))(() => responseMessage).ELSE(RETURNER(undefined)),
                    errorResult: IF(IS_SOCKET_ERROR(responseMessage))(() => responseMessage).ELSE(RETURNER(undefined)),
                    
                    respondWithMessage: respondWithMessage
                    
                })
            )
            
        })
        
        return result
        
    }
    
    
    
    
    
    _sendMessageForKey(
        key: string,
        message: any,
        inResponseToMessage: CBSocketMessage<any> = {} as any,
        keepMessageConnectionOpen = NO,
        completionPolicy = CBSocketClient.completionPolicy.directOnly,
        isUserBound = NO,
        didSendFunction: () => void = nil,
        completion: CBSocketMessageCompletionFunction = nil
    ) {
        
        if (IS_NIL(message)) {
            
            message = ""
            
        }
        
        if (this._isConnectionEstablished && !this._collectMessagesToSendLater) {
            
            const identifier = MAKE_ID()
            
            const messageObject: CBSocketMessage<any> = {
                
                messageData: message,
                identifier: identifier,
                keepWaitingForResponses: keepMessageConnectionOpen,
                inResponseToIdentifier: inResponseToMessage.identifier
                
            }
            
            const shouldSendMessage = this._callbackHolder.socketShouldSendMessage(
                key,
                messageObject,
                completionPolicy,
                completion
            )
            
            if (shouldSendMessage) {
                
                this.socket.emit(key, messageObject)
                
            }
            
            didSendFunction()
            
        }
        else {
            
            this._messagesToBeSent.push({
                
                key: key,
                message: message,
                inResponseToMessage: inResponseToMessage,
                keepWaitingForResponses: keepMessageConnectionOpen,
                completionPolicy: completionPolicy,
                isBoundToUserWithID: IF(isUserBound)(RETURNER(FIRST_OR_NIL(CBCore.sharedInstance.userProfile._id)))(),
                didSendFunction: didSendFunction,
                completion: completion
                
            })
            
            return this._messagesToBeSent.lastElement
            
        }
        
    }
    
    
    
    
    
    sendMessagesAsGroup<FunctionReturnType extends object>(functionToCall: () => FunctionReturnType) {
        
        const collectMessagesToSendLater = this._collectMessagesToSendLater
        
        this._collectMessagesToSendLater = YES
        
        var result = functionToCall()
        
        this._collectMessagesToSendLater = collectMessagesToSendLater
        
        this.sendUnsentMessages()
        
        return result
        
    }
    
    sendAndReceiveMessagesAsGroup<FunctionReturnType extends object>(
        functionToCall: () => FunctionReturnType,
        completion?: CBSocketMultipleMessagecompletionFunction
    ) {
        
        const collectMessagesToSendLater = this._collectMessagesToSendLater
        
        this._collectMessagesToSendLater = YES
        
        var result = functionToCall()
        
        this._collectMessagesToSendLater = collectMessagesToSendLater
        
        this.sendUnsentMessages(YES, completion)
        
        return result
        
    }
    
    
    
    
    
    didReceiveMessageForKey(key: string, message: CBSocketMessage<any>) {
        
        
        const sendResponseFunction: CBSocketMessageSendResponseFunction = function (
            this: CBSocketClient,
            responseMessage: any,
            completion: CBSocketMessageCompletionFunction
        ) {
            
            this._sendMessageForKey(
                CBSocketClient.responseMessageKey,
                responseMessage,
                message,
                NO,
                undefined,
                NO,
                nil,
                completion
            )
            
        }.bind(this) as any
        
        sendResponseFunction.sendIntermediateResponse = function (
            this: CBSocketClient,
            updateMessage: any,
            completion: CBSocketMessageCompletionFunction
        ) {
            
            this._sendMessageForKey(
                CBSocketClient.responseMessageKey,
                updateMessage,
                message,
                YES,
                undefined,
                NO,
                nil,
                completion
            )
            
        }.bind(this)
        
        const sendUserBoundResponseFunction: CBSocketMessageSendResponseFunction = function (
            this: CBSocketClient,
            responseMessage: any,
            completion: CBSocketMessageCompletionFunction
        ) {
            
            this._sendMessageForKey(
                CBSocketClient.responseMessageKey,
                responseMessage,
                message,
                NO,
                undefined,
                YES,
                nil,
                completion
            )
            
        }.bind(this) as any
        
        sendUserBoundResponseFunction.sendIntermediateResponse = function (
            this: CBSocketClient,
            updateMessage: any,
            completion: CBSocketMessageCompletionFunction
        ) {
            
            this._sendMessageForKey(
                CBSocketClient.responseMessageKey,
                updateMessage,
                message,
                YES,
                undefined,
                YES,
                nil,
                completion
            )
            
        }.bind(this)
        
        if (IS_SOCKET_ERROR(message.messageData)) {
            
            console.log("CBSocketClient did receive error message.")
            
            console.log(message.messageData)
            
            
            
        }
        
        
        this._callbackHolder.socketDidReceiveMessageForKey(key, message, sendResponseFunction)
        
    }
    
    
    
    
    
    addTargetForMessagesForKeys(keys: string[], handlerFunction: CBSocketMessageHandlerFunction) {
        keys.forEach(function (this: CBSocketClient, key: string, index: number, array: string[]) {
            this.addTargetForMessagesForKey(key, handlerFunction)
        }.bind(this))
    }
    
    
    
    
    
    addTargetForMessagesForKey(key: string, handlerFunction: CBSocketMessageHandlerFunction) {
        
        this._callbackHolder.registerHandler(key, handlerFunction)
        
        if (IS_NOT(this._subscribedKeys[key])) {
            
            this._socket.on(key, function (this: CBSocketClient, message: CBSocketMessage<any>) {
                
                this.didReceiveMessageForKey(key, message)
                
            }.bind(this))
            
            this._subscribedKeys[key] = true
            
        }
        
        
        
    }
    
    addTargetForOneMessageForKey(key: string, handlerFunction: CBSocketMessageHandlerFunction) {
        
        this._callbackHolder.registerOnetimeHandler(key, handlerFunction)
        
        if (IS_NOT(this._subscribedKeys[key])) {
            
            this._socket.on(key, function (this: CBSocketClient, message: CBSocketMessage<any>) {
                
                this.didReceiveMessageForKey(key, message)
                
            }.bind(this))
            
            this._subscribedKeys[key] = true
            
        }
        
        
        
    }
    
    
    
    
    
}





export const SocketClient: SocketClientInterface = new Proxy({ "name": "SocketClient" }, {
    
    get(target, key) {
        
        const result = (
            messageData,
            completionPolicy,
            isUserBound
        ) => CBCore.sharedInstance.socketClient.resultForMessageForKey(
            key as string,
            messageData,
            completionPolicy,
            isUserBound
        )
        
        
        
        return result
        
    }
    
}) as any
































