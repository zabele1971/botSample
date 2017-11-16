let JS_NAME='line.js'

const querystring = require('querystring');

// LINE用

let line = require('@line/bot-sdk');


const LINE_CONFIG = {
  channelAccessToken: "32pH82R5T9BGmSG9nvXP7o7VbPokcsnFoJjpXG1flQdiilJhxO4RosnUf53H6FVKjSyJAeaDOLDdWSjpCQ2RpXpnFEhl9miDZNBOnDNT3j81szzj0K+nvHozs7TeHZA0eXlabhJ4rz33aBD2RzOiHAdB04t89/1O/w1cDnyilFU=",
  channelSecret: process.env.LINE_CHANNEL_SECRET || '6401b118cdcc55e15f010867529117f8'
};

exports.LINE_CONFIG = LINE_CONFIG; // server.jsから呼び出すために export

const HTTPError = require('@line/bot-sdk').HTTPError;
const JSONParseError = require('@line/bot-sdk').JSONParseError;
const ReadError = require('@line/bot-sdk').ReadError;
const RequestError = require('@line/bot-sdk').RequestError;
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed;

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

   console.log(`${JS_NAME}: replyMessageToLine : %j`, replyMsg);

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


// Application Cache

let Cache = require('accs-cache-handler');
let cacheName = 'botMetaData';
let objCache = new Cache(cacheName);





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

// 接続を開放する
function doRelease(connection) {
  connection.release(function (err) {
    if (err) {
      console.error(`${JS_NAME}: ${err.message}`);
    }
  });
}




function getDeliveryStatusFromDB(token, id) {
   console.log(`${JS_NAME}: getDeliveryStatusFromDB:  ${token}: ${id}`);
   let sqltext = "SELECT '伝票番号:' || order_id || '\n現在の状況: ' || status || '\n場所: ' || location STATUSINFO "
                   + "FROM delivery_status WHERE order_id = :id";

   oracledb.getConnection(connectionProperties, function (err, connection) {
      if (err) {
         replyMessageToLine(token, "DBに接続できませんでした");
      } else {
         connection.execute(sqltext, [id],
            { outFormat: oracledb.OBJECT },
            function (err, result) {
               if (err) {
                  replyMessageToLine(token, "SQL Error");
               } else if (result.rows.length == 0) {
                  replyMessageToLine(token,  "該当伝票はありませんでした。適切な伝票番号を入力してください");
               } else {
                  console.log(`${JS_NAME}: getDeliveryStatusFromDB: retrieved row count %i`, result.rows.length);
                  console.log(`${JS_NAME}: getDeliveryStatusFromDB: retrieved rows:  %j`, result.rows);
                  console.log(`${JS_NAME}: getDeliveryStatusFromDB: retrieved rows:  ${result.rows[0].STATUSINFO}`);
                  replyMessageToLine(token, result.rows[0].STATUSINFO);
               }
　             doRelease(connection);
         });
      }
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


function IsExit(txt) {

  console.log(`${JS_NAME}: IsExit`);

  let str = txt.trim().toUpperCase();
  if(str.indexOf('終') == 0 ||
     str.indexOf('止') == 0 ||
     str.indexOf('おわ') == 0 ||
     str.indexOf('やめ') == 0 ||
     str.indexOf('メニュ') == 0 ||
     str.indexOf('キャンセル') == 0 ||
     str == 'CANCEL' ||
     str == 'STOP' ||
     str == 'COMPLETE' ||
     str == 'EXIT' ||
     str == 'MENU') {
     return true;
  } else {
     return false;
  }
}



function handleEvent(req, event) {

   console.log(`${JS_NAME}: handleEvent -----------------------------------------`);
   console.log(`${JS_NAME}: LINE UserID: ${event.source.userId}`);
  
   if (event.type == 'postback') {
      console.log(`${JS_NAME}: handleEvent:(event.type == 'postback') -------------------------`);

      let postback = querystring.parse(event.postback.data);

      let metadata = {
         id: event.source.userId,
         action: postback.action,
         data: {}
      }

      console.log(`${JS_NAME}: setMetaData: %j`, metadata);
      objCache.put(event.source.userId, metadata, function(err){
         if(err)
            console.error(`${JS_NAME}: setMetaData: objCache.put: Error!: ${err}`);
      });

      if(postback.action == 'get_status'){
          replyMessageToLine(event.replyToken, "お客様の伝票番号を入力してください");
      } else {
          replyMessageToLine(event.replyToken, "(作成中)指定日時入力");
      }
      return;
   }

   if (event.type != 'message' || event.message.type != 'text'){
      console.log(`${JS_NAME}: handleEvent: event.type != 'message' || event.message.type != 'text' ---`);
      console.log(`${JS_NAME}: handleEvent: event data: %j`, event);
      replyMessageToLine(event.replyToken, '文字を入力をしてください');
      return;
   }

   if(IsExit(event.message.text)) {
      console.log(`${JS_NAME}: handleEvent: isExit() == true ---------------------------------`);
     // ユーザーは終了を希望
      objCache.delete(event.source.userId, function(err){
         if(err)
            console.error(`${JS_NAME}: objCache.delete: ${err}`);
      });
      replyMessageToLine(event.replyToken, menu);
      return;
   }

   // userIdをもとにキャッシュにステートを確認
   objCache.get(event.source.userId, function(err, response){
      console.log(`${JS_NAME}: handleEvent: objCache.get -------------------------------------`);
      if(err) {
          console.error(`${JS_NAME}: handleEvent: objCache.get: ${err}`);
      }
      if(err || response == null) {
          console.log(`${JS_NAME}: handleEvent: objCache.get: (err || response == null)`);
          // userIdはキャッシュに見つからない
          replyMessageToLine(event.replyToken, menu);
          return;
      }

      if(response.action == 'get_status') {
          console.log(`${JS_NAME}: handleEvent: (response.action == get_status)`);
          getDeliveryStatusFromDB(event.replyToken, event.message.text.trim());
      } else {
          console.log(`${JS_NAME}: handleEvent: objCache.get: else ---`);
          replyMessageToLine(event.replyToken, menu);
      }
   });
}




exports.webhook = function(req, res, next) {
     
  // 先にLINE側にレスポンス
  res.send(200);

  // イベントオブジェクトは配列で渡される
  // mapを使ってひとつづつ処理
  req.body.events.map(function(event){
     handleEvent(req, event);
  });
  next();
}

