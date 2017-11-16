///////////////////////////////////////////////




exports.menu = {
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
				data: 'action=GET_STATUS_01'
			},
			{
				type: 'postback',
				label: "配送日指定",
				data: 'action=RESCHEDULE_01'
			}
		]
	}
}



// YYYY-MM-DDで日付を返すローカル関数
function getYYYYMMDD(dt){
	var y = dt.getFullYear();
	var m = ("00" + (dt.getMonth()+1)).slice(-2);
	var d = ("00" + dt.getDate()).slice(-2);
	var result = y + "-" + m + "-" + d;
	return result;
}


exports.dateSelection = function(){
	let carousel = {
			type: "template",
			altText: "配送日の選択",
			template: {
				type: "carousel",
				columns: [
					{
						title: "配送日",
						text: "配送日",
						actions: []

					}
				]
			}
		};
		
	let today = new Date();
	for(var i = 0; i < 7; i++){
		dtYYYYMMDD = getYYYYMMDD(new Date(today.getTime() + i * 24 * 60 * 60 * 1000));
		carousel.templete.columns[0].actions[i] = {
				type: "postback",
				label: dtYYYYMMDD,
				data: "action=RESCHEDULE_03&date=" + dtYYYYMMD
			};
	}
	return carousel;
}


exports.timeSelection = {
	"type": "template",
	"altText": "配達時間帯の選択",
	"template": {
		"type": "carousel",
		"columns": [
			{
				"title": "午前",
				"text": "午前",
				"actions": [
					{
						"type": "postback",
						"label": "9時-12時",
						"data": "action=RESCHEDULE_04&time=AM09TOPM12"
					}
				]
			},
			{
				"title": "午後",
				"text": "午後",
				"actions": [
					{
						"type": "postback",
						"label": "12時-14時",
						"data": "action=RESCHEDULE_04&time=PM12TOPM14"
					},
					{
						"type": "postback",
						"label": "14時-16時",
						"data": "action=RESCHEDULE_04&time=PM14TOPM16"
					},
					{
						"type": "uri",
						"label": "16時-18時",
						"data": "action=RESCHEDULE_04&time=PM16TOPM18"
					}
				]
			},
			{
				"title": "夜間",
				"text": "夜間",
				"actions": [
					{
						"type": "postback",
						"label": "18時-20時",
						"data": "action=RESCHEDULE_04&time=PM18TOPM20"
					},
					{
						"type": "postback",
						"label": "20時-22時",
						"data": "action=RESCHEDULE_04&time=PM20TOPM22"
					}
				]
			}
		]
	}
}

exports.rescheduleConfirmation = function(orderid, dt, tm) {
	return {
		type: "template",
		altText: "this is a confirm template",
		template: {
			type: "confirm",
			text: `伝票番号:${orderid}\n配達日:${dt}, 時間帯${tm}でよろしいですか？`,
			actions: [
				{
					type: "message",
					label: "はい",
					text: "RESCEDULE_CONFIRM_YES"
				},
				{
					type: "message",
					label: "いいえ",
					text: "RESCEDULE_CONFIRM_NO"
				}
			]
		}
	}
}
