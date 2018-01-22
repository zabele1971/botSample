let JS_NAME='line.js'


// LINE用

let line = require('@line/bot-sdk');


const HTTPError = require('@line/bot-sdk').HTTPError;
const JSONParseError = require('@line/bot-sdk').JSONParseError;
const ReadError = require('@line/bot-sdk').ReadError;
const RequestError = require('@line/bot-sdk').RequestError;
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed;

const LINE_CONFIG = {
  channelAccessToken: "(your access token)",
  channelSecret: process.env.LINE_CHANNEL_SECRET || '(your channel secret)'
};

exports.LINE_CONFIG = LINE_CONFIG; // server.jsから呼び出すために export

let lineClient = new line.Client(LINE_CONFIG);


// LINEにメッセージを送信するローカル関数


function replyMessageToLine(token, msg) {

   if(typeof msg == 'string') {
      replyMsg =  {
            type: 'text',
            text: msg
         };
   } else {
      replyMsg = msg;
   }

   lineClient
      .replyMessage(token, replyMsg)
      .catch((err) => {
          console.log(`${JS_NAME}: LINE Client replyMessage error occured:`);

         if (err instanceof HTTPError) {
             console.error(`${JS_NAME}: HTTPError`);
             console.error(`${JS_NAME}: ${err.statusCode}`);
             console.error(`${JS_NAME}: ${err.statusMessage}`);

         } else if (err instanceof JSONParseError) {
             console.error(`${JS_NAME}: JSONParseError`);
             console.error(`${JS_NAME}: ${err.raw}`);

         } else if (err instanceof ReadError) {
             console.error(`${JS_NAME}: ReadError`);

         } else if (err instanceof RequestError) {
             console.error(`${JS_NAME}: RequestError`);
             console.error(`${JS_NAME}: ${err.code}`);

         } else if (err instanceof SignatureValidationFailed) {
             console.error(`${JS_NAME}: SignatureValidationFailed`);
             console.error(`${JS_NAME}: ${err.signature}`);
         }
     }); 
}


let clients = require('restify-clients');

let CCSHOST = process.env.CACHING_INTERNAL_CACHE_URL || 'dummy'
let baseCCSURL = `http://${CCSHOST}:8080`;
let cacheName = 'botMetaData';

let client = clients.createJsonClient({
     url: baseCCSURL
});



// DB用

let oracledb = require('oracledb');
let connectionProperties = {
  user: process.env.DBAAS_USER_NAME || "c##bot",
  password: process.env.DBAAS_USER_PASSWORD || "c##bot",
  connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "localhost/orclpdb.jp.oracle.com",
  stmtCacheSize: 5,
  poolMin: 1,
  poolMax: 10
};

function doRelease(connection) {
  connection.release(function (err) {
    if (err) {
      console.error(`${JS_NAME}: ${err.message}`);
    }
  });
}




function getDeliveryStatus(token, id) {
        let msgText = "";
        let sqltext = "SELECT '伝票番号:' || order_id || chr(10) || ' 現在の状況: ' || status || chr(10) ||  '場所: ' || location FROM delivery_status WHERE order_id = :id";

        oracledb.getConnection(connectionProperties, function (err, connection) {
           if (err) {
              msgText = "DBに接続できませんでした";
           } else {
              connection.execute(sqltext, [id],
                 { outFormat: oracledb.OBJECT },
                 function (err, result) {
                    if (err) {
                       msgText = "SQL Error";
                    } else if (result.rows.length === 1) {
                       msgText = result.rows[0];
                    } else { // length==0 or length > 1。実際にはPrimary Keyなので複数行は返されない。
                       msgText = "適切な伝票IDを入力してください";
                    }
               });
　　　　       doRelease(connection);
           }
           console.log(`${JS_NAME}: ${msgText}`);
           replyMessageToLine(token, msgText);
        });
}



let menu = {
  type: "template",
  altText: "メニューです",
  template: {
      type: "buttons",
      title: "メニュー",
      text: "ご要望の処理を選択してください",
      actions: [
          {
            type: 'postback',
            label: "配送状況確認",
            data: 'action=get_status'
          },
          {
            type: 'postback',
            label: "配送日指定",
            data: 'action=reschedule'
          }
      ]
   }
}

function checkExit(text) {
debug('checkExit')
  let txt = text.toUpperString().trim();

  if(txt.indexOf('終') == 0 ||
     txt.indexOf('止') == 0 ||
     txt.indexOf('おわ') == 0 ||
     txt.indexOf('やめ') == 0 ||
     txt.indexOf('メニュ') == 0 ||
     txt.indexOf('キャンセル') == 0 ||
     txt == 'CANCEL' ||
     txt == 'STOP' ||
     txt == 'COMPLETE' ||
     txt == 'EXIT' ||
     txt == 'MENU') {
debug('true')
     return true;
  } else {
debug('false')
     return false;
  }
}



exports.webhook = function(req, res, next) {

  // 先にLINE側にレスポンス
  res.send(200);


  // イベントオブジェクトは配列で渡される
  // mapを使ってひとつづつ処理
  req.body.events.map(function(event){
  
     if(req.getQuery()) {
console.log(`${JS_NAME}: %j`, req.query);

        let metadata = {
           id: event.source.userId,
           action: req.query.action,
           data: {}
        }

        client.put(`/ccs/${cacheName}/${event.source.userId}`, metadata, function(err, reqCl, resCl, obj){
           var responseBody = { };
           console.log('%d -> %j', resCl.statusCode, resCl.headers);
           console.log(obj);
           if(err) {
              console.log(`${JS_NAME}: ${err}`);
           }
        });

        if(req.query.action == 'get_status'){
           replyMessageToLine(event.replyToken, "適切な伝票IDを入力してください");
        } else {
           replyMessageToLine(event.replyToken, "(作成中)指定日時入力");
        }
        next();
     }


     if (event.type == "message" && event.message.type == "text"){
         console.log('debug3');

        if(checkExit(event.message.text)) {
           console.log('debug3-1');
           client.del(`/ccs/${cacheName}/${event.source.userId}`, function(err, reqCl, resCl){
              console.log('%d -> %j', resCl.statusCode, resCl.headers);
           });
           replyMessageToLine(event.replyToken, 'ご利用ありがとうございました。');
           next();
        }

        console.log('debug4');

        client.get(`/ccs/${cacheName}/${event.source.userId}`, function(err, reqCl, resCl, obj){
           console.log('%d -> %j', resCl.statusCode, resCl.headers);
           console.log('returnd object: ');
           console.log(obj);

           if(err) {
               console.log(`${JS_NAME}: ${err}`);
           } else if(obj == null) {
               console.log('debug5');
               replyMessageToLine(event.replyToken, menu);
           } else {
               console.log('debug6');
               if(obj.action == 'get_status') {
                   console.log('debug7');
                   getDeliveryStatus(event.replyToken, event.message.text.trim());
               } else { 
                  console.log('debug8');
                  replyMessageToLine(event.replyToken, menu);
               }
             }
          });

         }
      } else {
          replyMessageToLine(event.replyToken, '適切な入力をしてください');
          replyMessageToLine(event.replyToken, menu);
      }
   });
   next();
}
