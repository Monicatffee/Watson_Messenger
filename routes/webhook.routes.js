var express = require('express');
var router = express.Router();
var request = require("request");
var AssistantV2 = require('watson-developer-cloud/assistant/v2');
var contexid = "";


var assistant = new AssistantV2({
    iam_apikey: process.env.I_AM_API_KEY,
    url: 'https://gateway.watsonplatform.net/assistant/api/',
    version: '2018-09-19'
});

var newContext = {
    global: {
        system: {
            turn_count: 1
        }
    }
};

// Session ID
var sessionId = '';
assistant.createSession({
    assistant_id: process.env.ASSISTANT_ID
}, (err, response) => {
    if (err) {
        console.error(err);
    } else {
        sessionId = response.session_id.replace(/['"]+/g, '');
        console.log("Session_id: ", sessionId);
    }
});


/** Variables globales */
var datoBoton = '';
var datoBotones = '';
var splitWatson = '';
var datoSplit = '';
var msgWatson = '';
var boton = [];
var i;
var btn = '';
var respRapis = [];
var respRapi = [];

/** */

router.get('/webhook', (req, res) => {

    // Verificar la coincidendia del token.
    var VERIFY_TOKEN = 'mi_token_de_seguridad';

    // Parametros de consulta
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});



// Todos eventos de messenger seran capturados por esta ruta
router.post('/webhook', function (req, res) {
    var data = req.body;

    // Verificar si el vento proviene del pagina asociada
    if (data.object === 'page') {

        // Iterar sobre cada entrada - puede haber múltiples si se hace por lotes
        data.entry.forEach(function (entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterara todos lo eventos capturados
            entry.messaging.forEach(function (event) {
                if (event.message) {

                    // console.log("Mensaje recibido");
                    const assistantID = process.env.ASSISTANT_ID;

                    var payload = {
                        assistant_id: assistantID,
                        session_id: `${sessionId}`,
                        input: event.message
                    };

                    // Mensajes desde Watson Assistant
                    assistant.message(payload, function (err, data) {
                        if (err) {
                            console.log("error");
                            // console.log(err);

                            if (!sessionId) {
                                assistant.createSession({
                                    assistant_id: process.env.ASSISTANT_ID
                                }, (err, response) => {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        sessionId = response.session_id.replace(/['"]+/g, '');
                                        console.log("Session_id: ", sessionId);
                                    }
                                });

                                return sessionId;
                            }
                            // return res.status(err.code || 500).json(err);
                        }
                        receivedMessage(event, data);
                        // console.log(JSON.stringify(data, null, 2));
                    });
                } else if (event.postback) {
                    receivedPostback(event)
                    console.log(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
        res.sendStatus(200);
    }
});

// Manejo de eventos entrantes
function receivedMessage(event, watsonResponse) {
    // Capturamos los datos del que genera el evento y el mensaje 
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    msgWatson = watsonResponse.output.generic[0].text;
    var messageId = message.mid;
    var messageText = message.text;
    var quickReply = message.text;

    // console.log(messageText);
    evaluarMensaje(senderID, messageText);
    console.log(messageText);

    // switch (payload) {
    //     case 'GET_STARTED':
    //         sendGetStarted(senderID);
    //     default:
    //         evaluarMensaje(senderID, messageText);
    // }
}


// Función que envía en la quick replies un solo botón
function aButton(senderID, messageText) {
    splitWatson = msgWatson.split("_btn");
    datoSplit = splitWatson[0];
    datoBoton = splitWatson[1];
    console.log(datoBoton);

    respRapi = {
        content_type: 'text',
        title: datoBoton,
        payload: 'boton'
    };
    boton.push(respRapi);
    sendQuickReply(senderID, datoSplit);
    boton = [];
}

// Función que envía varios botones en las quick replies
function manyButtons(senderID, messageText) {
    splitWatson = msgWatson.split("_botones");
    datoSplit = splitWatson[0];
    datoBotones = splitWatson[1].split(",");
    // console.log(splitWatson);

    for (i of datoBotones) {
        btn = i;
        respRapis = {
            content_type: 'text',
            title: btn,
            payload: 'xxx'
        };
        boton.push(respRapis);
        // boton se invoca e el title de las respuesta rapidas
    }

    sendQuickReply(senderID, datoSplit);
    boton = [];
}

/** EVALUAR MENSAJE */
function evaluarMensaje(senderID, messageText) {

    if (isContain(messageText, 'Empezar')) {
        sendTextMessage(senderID, msgWatson);
        // elementTemplate(senderID);
        sendGetStarted(senderID);

    } else
     if (isContain(msgWatson, '_btn')) {
        aButton(senderID, messageText);

    } else if (isContain(msgWatson, '_botones')) {
        manyButtons(senderID, messageText);

    } else if (isContain(messageText, 'perfil')) {
        elementTemplate(senderID);
        console.log("Este es el perfil");

    } else {
        sendTextMessage(senderID, msgWatson);
    }
}

// Función donde el chat respondera usando SendAPI
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}


function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    switch (payload) {
        case 'GET_STARTED':
            sendGetStarted(senderID);
            break;
        default:
            sendTextMessage(senderID, msgWatson);
    }
}

function sendGetStarted(senderID) {
    var messageData = {
        recipient: {
            id: senderID
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "Bienvenido a offCors",
                        image_url: "https://storage.googleapis.com/twg-content/images/OffCors_hero.width-1200.jpg",
                        subtitle: "Tienda de ropa para niños",
                        default_action: {
                            type: "web_url",
                            url: "https://www.offcorss.com/",
                            messenger_extensions: false,
                        },
                    }]
                }
            }
        }
    };
    callSendAPI(messageData);
}


// function sendGetStarted(senderID) {
//     var messageData = {
//         recipient: {
//             id: senderID
//         },
//         get_started: {
//             payload: "postback_payload"
//         },
//         message: {
//             attachment: {
//                 type: "template",
//                 payload: {
//                     template_type: "list",
//                     top_element_style: "compact",
//                     elements: [
//                         {
//                             title: "Tiendas y ho rarios",
//                             subtitle: "Ver todas las tiendas",
//                             image_url: "https://storage.googleapis.com/twg-content/images/OffCors_hero.width-1200.jpg",
//                             buttons: [
//                                 {
//                                     title: "Ver",
//                                     type: "web_url",
//                                     url: "https://www.offcorss.com/",
//                                     messenger_extensions: "true",
//                                     webview_height_ratio: "tall",
//                                     fallback_url: "https://www.offcorss.com/"
//                                 }
//                             ]
//                         },
//                         {
//                             title: "Classic White T-Shirt",
//                             subtitle: "See all our colors",
//                             default_action: {
//                                 "type": "web_url",
//                                 "url": "https://www.offcorss.com/",
//                                 "messenger_extensions": false,
//                                 "webview_height_ratio": "tall"
//                             }
//                         }
//                     ]
//                 }
//             }
//         }
//     };
//     callSendAPI(messageData);
// }

// Quick replies
function sendQuickReply(recipientId, quickReply, title) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: quickReply,
            quick_replies: boton
        }
    };

    callSendAPI(messageData);
}

/**
 * 
 * Enviar una imágen
 * 
 */
function sendImage(senderID) {
    var messageData = {
        recipient: {
            id: senderID
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: "https://s-media-cache-ak0.pinimg.com/564x/ef/e8/ee/efe8ee7e20537c7af84eaaf88ccc7302.jpg"
                }
            }
        }
    };
    callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, text, buttons) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: text,
                    buttons: buttons
                }
            }
        }
    };

    callSendAPI(messageData);
}


function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN,
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            // console.log("Successfully sent generic message with id %s to recipient %s", 
            //   messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            // console.error(response);
            // console.error(error);
        }
    });
}

// Texto que el user ingresa
function isContain(texto, word) {
    if (typeof texto == 'undefined' || texto.lenght <= 0) return false;
    return texto.indexOf(word) > -1;
}

module.exports = router;