tokens = {vk:"7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af"};

const VkBot = require('node-vk-bot-api');
const bot = new VkBot(tokens.vk);
const fs = require('fs');
const fetch = require('node-fetch');

function isSubRedditExist(name, callback) {

    let url = `https://www.reddit.com/r/${name}/hot/.json?limit=1`;

    let settings = { method: "Get" };
    fetch(url, settings)
        .then(res => res.json())
        .then((json) => {
            console.log("JSON", json);
            if (json.message == "Not Found"){
                callback("dontExist");
                return 0;
            }
            else if (json.reason == "private") {
                callback("private");
                return 0;
            } else if (json.data.children.length > 0) {
                if (json.data.children[0].kind =='t3'){
                    callback("ok");
                    return 0;
                }
            }
            callback("dontExist");
            return 0;
        });
}

function splitError(command,ctx){
    ctx.reply(`Неправильный запрос! \n Не переданно название сабреддита. \n Пример: \"${command} Anime\" `);

}

function followReddit(redditName,userId, callback){


    let reddits = JSON.parse(fs.readFileSync('reddits.json')).reddits;
    let flag = false;
    for (let i = 0; i < reddits.length; i++){
        if (redditName == reddits[i]){
            console.log("HERACK");
            let subs = JSON.parse(fs.readFileSync(`reddits/${redditName}.json`)).users;
            for (let g = 0; g < subs.length; g++){
                if (subs[g] == userId){
                    console.log("ALREADY");
                    callback("already");
                    return 0;
                }
            }
            console.log("DONT CARE", userId);

            subs.push(userId);
            fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users:subs}));
            flag = true;
            callback('ok');
            return 0;
        };
    }
    if (!flag){
        console.log("HERE");
        console.log(reddits);
        reddits.push(redditName);

        isSubRedditExist(redditName, function(res){
            if (res == "ok") {
                fs.writeFileSync(`reddits.json`, JSON.stringify({reddits: reddits}));
                fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users: [userId]}));
            }
            callback(res);
            return 0;
        });
    };
}


let checker = 123;

bot.command('подписка', (ctx) =>{
    console.log("HERE");
    splittedMessage = ctx.message.body.split(" ");
    if (splittedMessage.length < 2){
        splitError('подписка', ctx);
        return 0;
    }

    followReddit(splittedMessage[1].toUpperCase(), ctx.message.user_id, function(res){
        console.log("1");
        if (res == "ok"){
            ctx.reply(`Вы успешно подписались на ${splittedMessage[1]}`);
        } else if (res == "already"){
            checker++;
            ctx.reply("Вы уже подписанны на этот сабредит");
        } else if (res == "private"){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит является приватным`);
        } else if (res == 'dontExist'){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит не существует`);
        }
    });


});





// bot.command('отписка', (ctx) =>{
//     console.log('Отписка');
//
//     splittedMessage = ctx.message.body.split(" ");
//     if (splittedMessage.length < 2){
//         splitError('отписка', ctx);
//         return 0;
//     }
//
//     users = JSON.parse(fs.readFileSync('users.json')).users;
//     flag = false;
//     ind = 0;
//     for (let i = 0; i < users.length; i++){
//         if (users[i] == ctx.message.user_id){
//             ind = i;
//             flag = true;
//         }
//     }
//     if (!flag){
//         ctx.reply('Вы не подписанны');
//     } else{
//         ctx.reply("ОТПИСАЛСЯ");
//         users.splice(ind,1);
//         fs.writeFileSync('users.json', JSON.stringify({users:users}));
//     }
// });


bot.startPolling();




// // Setup basic express server
// var express = require('express');
// var app = express();
// var server = require('http').createServer(app);
// var io = require('socket.io')(server);
// var port = process.env.PORT || 80;
// var request = require("request");-ap
// var router = express.Router();
// app.listen(port,function () {
// });
//
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
//
// let tokens = {vk:"7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af"};
//
//
// function sendMessage(receiver, text) {
//     url = `https://api.vk.com/method/messages.send?user_id=${receiver}&message=${text}&access_token=${tokens.vk}&v=5.103&random_id=${gRI(1,99999999999)}`;
//     request({url: url, json: true}, function (error, response, body) {
//         if (!error && response.statusCode === 200) {
//             console.log("OKAY", response)
//         } else {
//             console.log("ERROR")
//         }
//     });
// }
//
//
//
// // router.get('/', function (req,res,next) {
// //     console.log(req);
// //     nJSOS = JSON.parse(req.body);
// //
// //     if (req.body.type === "confirmation"){
// //         res.send('9477a45d');
// //         return 0;
// //     }
// //
// //     if (nJSOS.type === "message_new"){
// //         sendMessage(nJSOS.object.user_id,nJSOS.object.text);
// //     }
// //     res.send('ok')
// // });
//
// router.post('/',function(req,res,next) {
//     console.log("POST", req);
//     if (req.body.type === "confirmation"){
//         res.send('7f4593fd')
//     }
// });
//















// // Setup basic express server
// var express = require('express');
// var app = express();
// var server = require('http').createServer(app);
// var io = require('socket.io')(server);
// var port = process.env.PORT || 3000;
// var request = require("request");
// app.listen(3000,function () {
// });
//
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "codepen.io"); // update to match the domain you will make the request from
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
//
//
//
// var getScoring = function(callback) {
//     var url = "https://earthmc.net/map/factions/tiles/_markers_/marker_earth.json";
//     let get;
//     get = request({url: url, json: true}, function (error, response, body) {
//         if (!error && response.statusCode === 200) {
//             callback(body); // Print the json response
//         }
//     });
//     console.log(get);
// };
//
// app.get('/',function(req,res) {
//
//     function upd(arg) {
//         res.json(arg)
//     }
//     getScoring(upd);
// });