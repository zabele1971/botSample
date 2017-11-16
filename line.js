let JS_NAME='line.js'


let querystring = require('querystring');
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


// Application Cache
let Cache = require('accs-cache-handler');
let cacheName = 'botContext';
let objCache = new Cache(cacheName);

// DB用

let oracledb = require('oracledb');
let connectionProperties = {
	user: process.env.DBAAS_USER_NAME || "c##bot",
	password: process.env.DBAAS_USER_PASSWORD || "c##bot",
	connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "localhost/orclpdb.jp.oracle.com",
	stmtCacheSize: 2,
	poolMin: 1,
	poolMax: 10
};


// LINEにメッセージを送信するローカル関数

function replyMessageToLine(token, msg) {
	return new Promise(function(resolve, reject) {
	
		if(typeof msg == 'string') {
			replyMsg =  {
				type: 'text',
				text: msg
			};
		} else {
			replyMsg = msg;
		}
   
		console.log(`${JS_NAME}: replyMessageToLine :token: %s`, token);
		console.log(`${JS_NAME}: replyMessageToLine :replyMsg: %j`, replyMsg);

		lineClient
			.replyMessage(token, replyMsg)
			.then(() => {
				resolve();
			})
			.catch((err) => {
				console.error(`${JS_NAME}: LINE Client replyMessage error occured:`);

				if (err instanceof HTTPError) {
					console.error(`${JS_NAME}: HTTPError`);
					console.error(`${JS_NAME}: ${err.statusCode}`);
					console.error(`${JS_NAME}: ${err.statusMessage}`);
				
				// HTTP Errorが起きたケース
				// 400:  送信データフォーマットを間違えていた場合や、同一のトークンに２回メッセージを送信する場合に起きた
				// 401:  コードに設定していたトークンを間違えていた場合など

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
				reject(new Error());
			}); 
	});
}

/*
function getDeliveryStatus(orderid, reschedule) {
	return new Promise(function(resolve, reject) {
		console.log(`${JS_NAME}: getDeliveryStatus: orderid ${orderid}`);
				   
		oracledb.getConnection(connectionProperties)
		.then(function(conn){
			console.log(`${JS_NAME}: getConnection success`);
						
			var sqltext = "SELECT order_id, status, location, complete_flg "
                   + "FROM delivery_status WHERE order_id = :id"
			
			conn.execute(sqltext, [orderid], { outFormat: oracledb.OBJECT })
			.then(function(result) {
				if (result.rows.length == 0) {
					console.log(`${JS_NAME}: not found`);
					resolve("該当伝票はありませんでした。適切な伝票番号を入力してください。");
				} else {
					console.log(`${JS_NAME}: getDeliveryStatus: retrieved row count %i`, result.rows.length);
					console.log(`${JS_NAME}: getDeliveryStatus: retrieved rows:  %j`, result.rows);
														
					if(reschedule) {
						if(result.rows[0].COMPLETE_FLG == 'Y') {
							resolve(`伝票番号 ${orderid} はすでに配達済みです。`);
						} else {
							resolve(`ORDER_CHECK_OK`);
						}
					} else {
						resolve(`伝票番号:${orderid}\n現在の状況:${result.rows[0].STATUS}\n場所:${result.rows[0].LOCATION}`);
					}
				}
				conn.release();
			})
			.catch((err) => {
				conn.release();
				console.error('${JS_NAME}: getDeliveryStatus: SQL Error %j', err);
				resolve(`SQL execution Error`);
			});
		})
		.catch((err) => {
			console.error('${JS_NAME}: getDeliveryStatus: %j', err);
			resolve("DBに接続できませんでした");
		});
	});
}
*/

function getDeliveryStatus(orderid, reschedule) {
	return new Promise(function(resolve, reject) {
		console.log(`${JS_NAME}: getDeliveryStatus: orderid ${orderid}`);
				   
		oracledb.getConnection(connectionProperties)
		.then((conn) => {
			console.log(`${JS_NAME}: getConnection success`);
			var sqltext = "SELECT order_id, status, location, complete_flg "
                   + "FROM delivery_status WHERE order_id = :id"
			return conn.execute(sqltext, [orderid], { outFormat: oracledb.OBJECT });
		})
		.then((result) => {
			if (result.rows.length == 0) {
				console.log(`${JS_NAME}: not found`);
				resolve("該当伝票はありませんでした。適切な伝票番号を入力してください。");
			} else {
				console.log(`${JS_NAME}: getDeliveryStatus: retrieved row count %i`, result.rows.length);
				console.log(`${JS_NAME}: getDeliveryStatus: retrieved rows:  %j`, result.rows);
														
				if(reschedule) {
					if(result.rows[0].COMPLETE_FLG == 'Y') {
						resolve(`伝票番号 ${orderid} はすでに配達済みです。`);
					} else {
						resolve(`ORDER_CHECK_OK`);
					}
				} else {
					resolve(`伝票番号:${orderid}\n現在の状況:${result.rows[0].STATUS}\n場所:${result.rows[0].LOCATION}`);
				}
			}
			conn.release();
		})
		.catch((err) => {
			console.error('${JS_NAME}: getDeliveryStatus: %j', err);
			resolve(`Error: %j`, err); // あえて resolveを返している
		});
	});
}


///////////////////////////////////////////////
var template = require('./line_template.js');


////////////////////////////////////////////////

function recordContext(context) {
	console.log(`recordContext: %j`, context);			
	objCache.put(context.userid, context, function(err){
		if(err)
			console.error(`${JS_NAME}: objCache.put: Error!: ${err}`);
	});
}

function removeContext(userid) {
	console.log(`${JS_NAME}: removeContext`);	
	objCache.delete(userid, function(err){
		if(err) {
			console.error(`${JS_NAME}: objCache.delete: Error!: ${err}`);
		}
	});
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


function onEventTypePostback(context, data, resolve){
	console.log(`onEventTypePostback: %j`, data);

	let postback = querystring.parse(data);
	context.action = postback.action.toUpperCase();
			
	switch(context.action) {
		case 'GET_STATUS_01':
			resolve(context);
			break;
		case 'RESCHEDULE_03':
			context.data.date = postback.date;
			resolve(context);
			break;
		case 'RESCHEDULE_04':
			context.data.time = postback.time;
			resolve(context);
			break;
	}
	console.log(`${JS_NAME}: end of postback:  %j`, context);
}


function onEventTypeMessageText(context, text, resolve){
	if(IsExit(text)) {
		console.log(`${JS_NAME}: IsExit:  %j`, context);
		context.action = 'SHOW_MENU';
		resolve(context);
		
	} else {
		switch(context.action) {
		case 'GET_STATUS_01':
		case 'GET_STATUS_02':
			context.action = 'GET_STATUS_02';
			context.data = {
				text: text.trim()
			}
			// resolve(context);
			break;
						
		case 'RESCHEDULE_02':
			// 再配達日程処理で、伝票が入力されたので、コンテキストにセット
			context.data = {
				oderid: text.trim(),
				date: null,
				time: null
			}
			// resolve(context);
			break;
		case 'RESCHEDULE_04':
			// 確認ボタンで押された内容に応じてアクションを設定
			if(text == 'RESCEDULE_CONFIRM_YES') {
				context.action = 'RESCHEDULE_99';
			} else { 
				context.action = 'RESCHEDULE_01';
			}
			break;
		case 'SHOW_MENU':
			// Do nothing
			break;
		}
		resolve(context);
	}
}


function getContext(event) {
	return new Promise(function(resolve, reject) {
   				
		console.log(`${JS_NAME}: getContext`);
		console.log(`${JS_NAME}: LINE UserID: ${event.source.userId}`);
		console.log(JSON.stringify(event));

		// userIdをもとにキャッシュに既存ステートを確認
		objCache.get(context.userid, function(err, response){
			
			if(err) {
			// Application Cacheのダウンなどの原因が考えられる
			// ログを取るだけで、何もしない。
				console.log(`${JS_NAME}: getContext: objCache.get: ${err}`);				
				reject(new Error());
				
			} else {
				if (response != null)
					var context = response;
				else
					var context = {
						userid: event.source.userId,
						replyToken: '',
						action: '',
						data: {}
					};
				
				// replyTokenを新トークンで上書き（これがちがっていると HTTPError 400になる
				context.replyToken = event.replyToken;
		
				// LINEイベントタイプごとに入力情報をコンテキストにセット
				if (event.type == 'postback') {
					console.log(`${JS_NAME}: getContext: postback: %j`, event.postback);
					onEventTypePostback(context, event.postback.data, resolve);
									
				} else if (event.type == 'message' && event.message.type == 'text') {
					console.log(`${JS_NAME}: getContext:(event.type == 'message' && event.message.type == 'text')`);					
					 if (response == null) // userIdはキャッシュに見つからない
						context.action = 'SHOW_MENU';

					console.log(`${JS_NAME}: %j`, context);
					onEventTypeMessageText(context, event.message.text, resolve);
				} else {
					// それ以外のタイプのイベントが来た場合	
					console.log(`${JS_NAME}: else`);
					context.action = 'INVALID_VALUE';
					resolve(context);
				}
//				console.log('getContext: context: %j', context);
			}
		});
	});
}

function doAction(context){
	
	console.log('doAction: context: %s', JSON.stringify(context));
	
	return new Promise(function(resolve, reject) {
	// Application Cacheに
	// コンテキスト情報を記録するものは resolve
	// コンテキスト情報を記録しないものは reject をコール

		switch(context.action) {
			case 'SHOW_MENU':
				console.log(`${JS_NAME}: doAction: SHOW_MENU`);
				replyMessageToLine(context.replyToken, template.menu)
				.then(()=>{
					// ユーザー・コンテキストを初期化
					removeContext(context.userid);
				})
				.catch((err)=>{
					reject(err);
				});
				
				break;
			case 'INVALID_VALUE':
			    console.log(`${JS_NAME}: doAction: INVALID_VALUE`);
				replyMessageToLine(context.replyToken, '文字を入力をしてください') // これは入力ミスの可能性があるので、ユーザー・コンテキスには何もしない
				.catch((err)=>{
					reject(err);
				});
				break;
			
			// 配達状況問合せ
			case 'GET_STATUS_01':
			    console.log(`${JS_NAME}: doAction: GET_STATUS_01`);
				replyMessageToLine(context.replyToken, 'お客様の伝票番号を入力してください')
				.then(()=>{
					recordContext(context);
				})
				.catch((err)=>{
					reject(err);
				});
				break;
				
			case 'GET_STATUS_02':
				console.log(`${JS_NAME}: doAction: GET_STATUS_02`);
				
				getDeliveryStatus(context.data.text, false)
				.then((msg) => {
					return replyMessageToLine(context.replyToken, msg)
				})
				.then(()=>{
					recordContext(context);
				})
				.catch((err) => {
					replyMessageToLine(context.replyToken, `Sorry. Error occured:\n${err}`)
					.then(()=>{
						recordContext(context);
					})
					.catch((err)=>{
						reject(err);
					});
				});
				break;
				
			// 配達日指定
			case 'RESCHEDULE_01': // 伝票番号の入力を促す
				console.log(`${JS_NAME}: doAction: RESCHEDULE_01`);
				replyMessageToLine(context.replyToken, 'お客様の伝票番号を入力してください')
				.then(()=>{
					recordContext(context);
				})
				.catch((err)=>{
					reject(err);
				});
				break;
				
			case 'RESCHEDULE_02': // 伝票番号が入力された。配達日を入力してもらう
				console.log(`${JS_NAME}: doAction: RESCHEDULE_02`);
				
				getDeliveryStatus(context.data.text, true)
				.then((msg) => {
					if(msg == `ORDER_CHECK_OK`)
						return replyMessageToLine(context.replyToken, template.dateSelection());
					else
						return replyMessageToLine(context.replyToken, msg);
				})
				.then(()=>{
					recordContext(context);
				})
				.catch((err) => {
					replyMessageToLine(context.replyToken, `Sorry. Error occured:\n${err}`)
					.then(()=>{
						recordContext(context);
					})
					.catch((err)=>{
						reject(err);
					});
				});
				break;
				
			case 'RESCHEDULE_03':// 配達日が入力された。配達時刻を指定してもらう。
				console.log(`${JS_NAME}: doAction: RESCHEDULE_03`);
				replyMessageToLine(context.replyToken, template.timeSelection)
				.then(()=>{
					recordContext(context);
				})
				.catch((err)=>{
					reject(err);
				});
				break;
				
				
			case 'RESCHEDULE_04':// 配達時刻が入力された。入力内容を確認してもらう。
				console.log(`${JS_NAME}: doAction: RESCHEDULE_04`);
				replyMessageToLine(context.replyToken, template.rescheduleConfirmation(context.data.order_id, context.data.date, context.data.time))
				.then(()=>{
					recordContext(context);
				})
				.catch((err)=>{
					reject(err);
				});
				break;
				
				
			case 'RESCHEDULE_99':// 入力内容を登録し、通知する。これで終わり。
				console.log(`${JS_NAME}: doAction: RESCHEDULE_99`);
				
				// ここに登録処理を入れる	
				replyMessageToLine(context.replyToken, '変更を登録しました')
				.then(()=>{
					removeContext(context.userid);
				})
				.catch((err)=>{
					reject(err);
				});
				/////////////////////////////////////////
		}
	});
}


function handleEvent(event) {
	// console.log(`${JS_NAME}: handleEvent: ${event}`);
	
	getContext(event) // コンテキスト情報を取得
	.then((context) => {
		console.log(`${JS_NAME}: handleEvent  console.log 1: %s`, JSON.stringify(context));
		console.log(context);
		 return doAction(context); // コンテキストに合わせて処理
	 })
	.catch((err)=>{
		console.log(`${JS_NAME}: handleEvent: catch err: %j`, err);
	 });
}

exports.webhook = function(req, res, next) {    
	// 先にLINE側にレスポンス
	res.send(200);
	
	// イベントオブジェクトは配列で渡される。mapを使ってひとつづつ処理
	req.body.events.map(function(event){
		console.log(`${event}`);
		handleEvent(event);
		
		
		// test
		/* OK
		getDeliveryStatus(event.message.text.trim(), false)
		.then((msg) => {
			console.log(`${JS_NAME}: 2 : ${msg}`);
			replyMessageToLine(event.replyToken, msg);
		})
		.catch((err) => {
			console.log(`${JS_NAME}: 3`);
			replyMessageToLine(event.replyToken, `Sorry. Error occured:\n${err}`);
		});
		*/
		
	});
	next();
}
