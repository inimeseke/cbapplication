import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client"
import { FIRST_OR_NIL, IF, IS, IS_NIL, IS_NOT, MAKE_ID, nil, NO, RETURNER, UIObject, YES } from "../../uicore-ts"
import { CBCore } from "./CBCore"
import {
    CBSocketHandshakeInitMessage,
    CBSocketHandshakeResponseMessage,
    CBSocketKeepalivePayload,
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


type FilterConditionally<Source, Condition> = Pick<Source, { [K in keyof Source]: Source[K] extends Condition ? K : never }[keyof Source]>;


export function IS_SOCKET_ERROR(object: any): object is CBSocketClientErrorMessage {
    
    const result = (IS(object) && object._isCBSocketErrorMessage)
    
    return result
    
}

export function IS_NOT_SOCKET_ERROR(object: any) {
    
    return !IS_SOCKET_ERROR(object)
    
}


/**
 * A Promise returned by resultForMessageForKey.
 * Exposes didReceiveKeepalive() for registering a keepalive callback
 * in the same fluent style as the rest of the API.
 */
export interface CBSocketRequestPromise<T> extends Promise<T> {
    /**
     * Register a handler to be called each time a keepalive frame arrives
     * for this request.
     *
     * @param handler               Called with the payload sent by the server.
     * @param extendsDefaultHandler When true (default) the application-level
     *                              defaultKeepaliveHandler fires first, then
     *                              this handler. When false this handler fires
     *                              alone and the default is suppressed for this
     *                              request.
     */
    didReceiveKeepalive(
        handler: (payload: CBSocketKeepalivePayload) => void,
        extendsDefaultHandler?: boolean
    ): CBSocketRequestPromise<T>
}


export class CBSocketClient extends UIObject {
    
    _socket: Socket
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
    
    
    static timeoutMessage: CBSocketClientErrorMessage = {
        
        _isCBSocketErrorMessage: YES,
        
        messageData: "Request timed out"
        
    }
    
    
    /**
     * How long (in milliseconds) to wait for a server response before treating
     * the request as failed. Set to 0 to disable timeouts entirely.
     * Default: 30 000 ms (30 seconds).
     *
     * Each keepalive frame from the server resets this window, so long-running
     * requests only time out if the server goes completely silent for this duration.
     */
    requestTimeoutMs: number = 30_000

    /**
     * Application-level keepalive handler. Called for every keepalive frame
     * received on any request, unless the per-call handler was registered with
     * extendsDefaultHandler = false.
     *
     * Configure once at application startup:
     *   CBSocketClient.sharedInstance.defaultKeepaliveHandler = payload => { ... }
     */
    defaultKeepaliveHandler?: (payload: CBSocketKeepalivePayload) => void
    
    
    constructor(core: CBCore) {
        
        super()
        
        this._core = core
        this._socket = io()
        
        this.socket.on("connect", () => {
            
            console.log("Socket.io connected to server. clientID = ", this.socket, " socketID = ", this.socket)
            
            this.sendUnsentMessages()
            
        })
        
        
        this._callbackHolder = new CBSocketCallbackHolder(this, this._callbackHolder)
        
        this.socket.on(
            "CBSocketWelcomeMessage",
            (message: CBSocketMessage<{ userProfile?: Record<string, string> }>) => {
                
                core.userProfile = message.messageData.userProfile
                
                this._isConnectionEstablished = YES
                
                this.sendUnsentMessages()
                
            }
        )
        
        this.socket.on("disconnect", () => {
            
            console.log("Socket.io disconnected from server. clientID = ", this.socket)
            
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
                // @ts-ignore
                if (document.cbsocketclientlogmessages) {
                    console.log(message.messageData)
                }
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
                    inResponseToIdentifier: messageToBeSentObject.inResponseToMessage.identifier,
                    completionPolicy: messageToBeSentObject.completionPolicy
                    
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
                
                didSendFunctions.push(messageToBeSentObject.didSendFunction!)
                
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
            completionPolicy: CBSocketClient.completionPolicy.all,
            
            shouldGroupResponses: receiveResponsesTogether
            
        }
        
        //if (receiveResponsesTogether) {
        
        this._callbackHolder.socketWillSendMultipleMessage(messageObject, completion)
        
        //}
        
        // @ts-ignore
        if (document.cbsocketclientlogmessages) {
            console.log(
                "CB socket client is sending multiple messages. [",
                groupedMessages.everyElement.key.UI_elementValues?.join(", "), "] ",
                messageObject
            )
        }
        
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
        
    } as const
    
    
    sendUserBoundMessageForKeyWithPolicy(
        key: keyof SocketClientInterface,
        message: any,
        completionPolicy: keyof typeof CBSocketClient.completionPolicy,
        completion?: CBSocketMessageCompletionFunction
    ) {
        
        this._sendMessageForKey(key as string, message, undefined, NO, completionPolicy, YES, nil, completion)
        
    }
    
    sendUserBoundMessageForKey(
        key: keyof SocketClientInterface,
        message: any,
        completion?: CBSocketMessageCompletionFunction
    ) {
        
        this._sendMessageForKey(key as string, message, undefined, NO, undefined, YES, nil, completion)
        
    }
    
    sendMessageForKeyWithPolicy(
        key: keyof SocketClientInterface,
        message: any,
        completionPolicy: keyof typeof CBSocketClient.completionPolicy,
        completion?: CBSocketMessageCompletionFunction
    ) {
        
        this._sendMessageForKey(key as string, message, undefined, NO, completionPolicy, NO, nil, completion)
        
    }
    
    sendMessageForKey(key: keyof SocketClientInterface, message: any, completion?: CBSocketMessageCompletionFunction) {
        
        this._sendMessageForKey(key as string, message, undefined, NO, undefined, NO, nil, completion)
        
    }
    
    
    resultForMessageForKey(
        key: keyof SocketClientInterface,
        message: any,
        completionPolicy?: keyof typeof CBSocketClient.completionPolicy,
        isUserBound = NO
    ): CBSocketRequestPromise<{
        responseMessage: any,
        result: any,
        errorResult: any,
        respondWithMessage: CBSocketMessageSendResponseFunction
    }> {

        // The identifier is assigned synchronously inside _sendMessageForKey.
        // We capture it via didObtainIdentifier so we can look up the descriptor
        // immediately after the send, before any async gap.
        let capturedIdentifier: string | undefined

        const basePromise = new Promise<{
            responseMessage: any,
            result: any,
            errorResult: any,
            respondWithMessage: CBSocketMessageSendResponseFunction
        }>((resolve, reject) => {

            this._sendMessageForKey(
                key as string,
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

                }),
                (identifier) => { capturedIdentifier = identifier }
            )

        })

        const requestPromise = basePromise as CBSocketRequestPromise<any>

        requestPromise.didReceiveKeepalive = (
            handler: (payload: CBSocketKeepalivePayload) => void,
            extendsDefaultHandler = YES
        ): CBSocketRequestPromise<any> => {

            // The descriptor is pushed synchronously before _sendMessageForKey returns,
            // so capturedIdentifier is already set at this point.
            if (capturedIdentifier) {
                this._attachKeepaliveHandlerForIdentifier(capturedIdentifier, handler, extendsDefaultHandler)
            }

            return requestPromise

        }

        return requestPromise

    }


    /**
     * Finds the descriptor for the given request identifier and attaches the
     * keepalive handler fields to it.
     */
    _attachKeepaliveHandlerForIdentifier(
        identifier: string,
        handler: (payload: CBSocketKeepalivePayload) => void,
        extendsDefaultHandler: boolean
    ) {

        const descriptorKey = this._callbackHolder.keysForIdentifiers[identifier]
        if (!descriptorKey) {
            return
        }

        const descriptors = this._callbackHolder.messageDescriptors[descriptorKey]
        if (!descriptors) {
            return
        }

        const descriptor = descriptors.find(d => d.message.identifier === identifier)
        if (!descriptor) {
            return
        }

        descriptor.keepaliveHandler = handler
        descriptor.keepaliveHandlerOverridesDefault = !extendsDefaultHandler

    }

    
    _sendMessageForKey(
        key: string,
        message: any,
        inResponseToMessage: CBSocketMessage<any> = {} as any,
        keepMessageConnectionOpen = NO,
        completionPolicy: keyof typeof CBSocketClient.completionPolicy = CBSocketClient.completionPolicy.directOnly,
        isUserBound = NO,
        didSendFunction: () => void = nil,
        completion: CBSocketMessageCompletionFunction = nil,
        didObtainIdentifier?: (identifier: string) => void
    ) {
        
        if (IS_NIL(message)) {
            
            message = ""
            
        }
        
        if (this._isConnectionEstablished && !this._collectMessagesToSendLater) {
            
            const identifier = MAKE_ID()

            didObtainIdentifier?.(identifier)
            
            const messageObject: CBSocketMessage<any> = {
                
                messageData: message,
                identifier: identifier,
                keepWaitingForResponses: keepMessageConnectionOpen,
                inResponseToIdentifier: inResponseToMessage.identifier,
                completionPolicy: completionPolicy
                
            }
            
            const shouldSendMessage = this._callbackHolder.socketShouldSendMessage(
                key,
                messageObject,
                completionPolicy,
                completion
            )
            
            if (shouldSendMessage) {
                
                // @ts-ignore
                if (document.cbsocketclientlogmessages) {
                    console.log(
                        "CB socket client is sending message. [", key, "] ",
                        messageObject
                    )
                }
                
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
                isBoundToUserWithID: IF(isUserBound)(RETURNER(FIRST_OR_NIL(CBCore.sharedInstance.userProfile?._id)))(),
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
            messageData: any,
            completionPolicy: string | undefined,
            isUserBound: boolean | undefined
        ) => CBCore.sharedInstance.socketClient.resultForMessageForKey(
            key as string,
            messageData,
            completionPolicy as any,
            isUserBound
        )
        
        
        return result
        
    }
    
}) as any
