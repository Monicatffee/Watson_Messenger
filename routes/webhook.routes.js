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

   // Función para recibir el session Id de watson assistant
   function obtenerId() {
    return new Promise(resolve => {

        assistant.createSession({
            // Identificador de la instancia "Assistants"
            assistant_id: `${process.env.ASSISTANT_ID}`,
        }, function (err, response) {
            if (err) {
                console.error(err);
                resolve(err)
            } else {
                let sessionId = JSON.stringify(response.session_id)
                resolve(sessionId.replace(/['"]+/g, ''))
            }
        });
    })
}

// Función para enviar mensaje a Watson Assistant
function enviaMensajeWatson(sessionId, text) {
    return new Promise(resolve => {

        assistant.message({
            assistant_id: `${process.env.ASSISTANT_ID}`,
            session_id: `${sessionId}`,
            input: text
        }, (err, response) => {
            if (err) {
                console.error('Error: ', err);
            } else {
                resolve(response);
            }
        });
    });
}

async function mensajeria(text) {
    let idUsuario = await obtenerId();
    let response = await enviaMensajeWatson(idUsuario, text);
    let resultado = {
        response,
        idUsuario
    };
    return resultado;
}


/** Variables globales */
var datoBoton = '';
var datoBotones = '';
var datoUser = '';
var splitWatson = '';
var datoSplit = '';
var translate = '';
var msgWatson = '';
var boton = [];
var lista = [];
var i;
var btn = '';
var respRapis = [];
var respList = []
var respRapi = [];
var userName = '';

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

                    mensajeria(event.message)
                    .then(async (data) => {
                        // resWatson = data.response
                        // console.log(JSON.stringify(resWatson, null, 2));
                        handleMessage(event, data);
                    })
                  
                } else if (event.postback) {
                    let eventPostback = handlePostback(event)

                    let input = {
                        text: eventPostback
                    }
                    mensajeria(input)
                    .then(async (data) => {

                        resWatson = data.response
                        handleMessage(event, data);
                        
                    })



                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });
        res.sendStatus(200);
    }
});

// Manejo de eventos entrantes
function handleMessage(event, watsonResponse) {
    // Capturamos los datos del que genera el evento y el mensaje 
    var senderID = event.sender.id;
    msgWatson = watsonResponse.response.output.generic[0].text

    userInfo(senderID);
    evaluarMensaje(senderID, msgWatson);

}


function handlePostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;

    return payload

}

/** EVALUAR MENSAJE */
function evaluarMensaje(senderID, messageText) {
    if (isContain(msgWatson, '_lista')) {
      sendList(senderID, translate);
  
    } else if (isContain(msgWatson, '_botones')) {
      manyButtons(senderID, messageText);
  
    }
    else if (isContain(msgWatson, '_vid')) {
      aVideo(senderID, messageText);
    }
    else if (isContain(msgWatson, '_btn')) {
      aButton(senderID, messageText)
    }
  
    else {
  
      userInfo(senderID);

      const comp = messageText.indexOf('_nombre')
      console.log(comp);
      if (comp !== -1) {
        // message.replace("_nombre", userName.replace('"', ''))
        var names = messageText.replace("_nombre", userName.replace(/['"]+/g, ''))
        console.log(names);
        sendTextMessage(senderID, names);
  
      } else {
        sendTextMessage(senderID, messageText)
      }
  
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


function aVideo(senderID, messageText) {
    splitWatson = msgWatson.split("_vid");
    datoSplit = splitWatson[0];
  
    userInfo(senderID);
    const comp = datoSplit.indexOf('_nombre')
    if (comp !== -1) {
      // message.replace("_nombre", userName.replace('"', ''))
      translate = datoSplit.replace("_nombre", userName.replace(/['"]+/g, ''))
  
    }
    datoVideo = splitWatson[1];
    console.log(datoVideo);
  
    sendTextMessage(senderID, translate);
    sendVideoYoutube(senderID, translate);
  }


  /**
 * 
 *  Los videos desde youtube deben hacerse con pñlantillas genericas.
 */
function sendVideoYoutube(recipientID, messageText, senderID) {
    var messageData = {
      recipient: {
        id: recipientID
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: "Cómo comprar en Offcorss",
              image_url: "https://i.ytimg.com/vi/4nIuogTusQA/hqdefault.jpg",
              default_action: {
                type: "web_url",
                url: datoVideo,
                messenger_extensions: false,
              },
              "buttons": [{
                "type": "web_url",
                "url": "https://youtu.be/4nIuogTusQA",
                "title": "Ir al video"
              }]
            }]
          }
        }
      }
    };
    callSendAPI(messageData);
  }

function sendList(senderID, messageText) {
    splitWatson = msgWatson.split("_lista");
    datoSplit = splitWatson[0];
  
    userInfo(senderID);
    const comp = datoSplit.indexOf('_nombre')
    if (comp !== -1) {
      // message.replace("_nombre", userName.replace('"', ''))
      translate = datoSplit.replace("_nombre", userName.replace(/['"]+/g, ''))
  
  
    }
    datoLista = splitWatson[1].split(",");
  
    for (i of datoLista) {
      lst = i;
      respList = {
        title: lst,
        image_url: 'https://external.feoh3-1.fna.fbcdn.net/safe_image.php?d=AQBRYVY0pouQzYLM&url=https%3A%2F%2Fsodimacco-chatbot.mybluemix.net%2Fimages%2Flist_template%2Fprecio_y_disponibilidad.png&_nc_hash=AQACpBXBqrjVUSJw',
        buttons: [
          {
            title: "Ver",
            type: "postback",
            payload: lst
          }
        ]
      };
      lista.push(respList);
    }
  
    sendTextMessage(senderID, translate);
    sendQuickList(senderID, translate);
    lista = [];
  }

// function sendGetStarted(senderID) {
//     var messageData = {
//         recipient: {
//             id: senderID
//         },
//         get_started: {
//             payload: "postback"
//         }
//     };
//     callSendAPI(messageData);
// }

function sendQuickList(recipientID) {
    var messageData = {
      recipient: {
        id: recipientID
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
            top_element_style: "compact",
            elements: lista
          }
        }
      }
    }
    callSendAPI(messageData);
  }

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

function userInfo(senderID) {
    var url = {
      uri: 'https://graph.facebook.com/' + senderID + '?fields=first_name,last_name,profile_pic&access_token=' + process.env.PAGE_ACCESS_TOKEN
    };
  
    request(url, (error, response, body) => {
  
      var datos = JSON.parse(body);
      userName = JSON.stringify(datos.first_name, null, 2)
      // console.log("name: ", userName);
      return userName
    });
  }
  

// Texto que el user ingresa
function isContain(texto, word) {
    if (typeof texto == 'undefined' || texto.lenght <= 0) return false;
    return texto.indexOf(word) > -1;
}

module.exports = router;

