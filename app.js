tokens = {vk:"7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af"};

const VkBot = require('node-vk-bot-api');
const bot = new VkBot(tokens.vk);
const fs = require('fs');
const fetch = require('node-fetch');
const http = require('http');
const https = require('https');



const {Bot} = require('node-vk-bot');
const imageUploader = new Bot({
    token: '7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af',
    group_id: "194737442"
}).start();


function isSubRedditExist(name, callback) {

    let url = `https://www.reddit.com/r/${name}/hot/.json?limit=1`;

    let settings = { method: "Get" };
    fetch(url, settings)
        .then(res => res.json())
        .then((json) => {
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


function checkIfSUserWasCreated(id) {
    try{
        let subRedditsOfUser =  JSON.parse(fs.readFileSync(`users/${id}.json`)).reddits;
        return subRedditsOfUser;
    } catch (e) {
        return false;
    }

}
function checkIfSubRedditWasCreated(name) {
    try{
        let useresOfSubReddit =  JSON.parse(fs.readFileSync(`reddits/${name}.json`)).users;
        return useresOfSubReddit;
    } catch (e) {
        return false;
    }

}
function addUserTolistOfUsers(user_id) {
    let listOfUsers = JSON.parse(fs.readFileSync("users.json")).users;
    listOfUsers.push(user_id);
    fs.writeFileSync("users.json", JSON.stringify({users: listOfUsers}))
}
function addRedditToListOfReddits(redditName) {
    let listOfReddits = JSON.parse(fs.readFileSync("reddits.json")).reddits;
    listOfReddits.push(redditName);
    fs.writeFileSync("reddits.json", JSON.stringify({reddits: listOfReddits}))
}

function followReddit(redditName,userId, callback){



    let subReddit = checkIfSubRedditWasCreated(redditName);
    let user = checkIfSUserWasCreated(userId);

    if (subReddit === false){

        isSubRedditExist(redditName,function(res){
            if (res === "ok"){
                addRedditToListOfReddits(redditName);
                fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users: [userId]}));
                if (user === false){
                    fs.writeFileSync(`users/${userId}.json`,       JSON.stringify({reddits: [redditName]}));
                    addUserTolistOfUsers(userId);
                } else {
                    user.push(redditName);
                    fs.writeFileSync(`users/${userId}.json`,       JSON.stringify({reddits: user}));
                }

            }
            callback(res);
        });
    } else {
        let res = 'ok';
        if (user === false){
            fs.writeFileSync(`users/${userId}.json`, JSON.stringify({reddits: [redditName]}));
            addUserTolistOfUsers(userId);
        } else {
            let flag = false;
            for (let i = 0; i < user.length; i++ ){
                if (redditName === user[i]){
                    res = 'already';
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                user.push(redditName);
                fs.writeFileSync(`users/${userId}.json`, JSON.stringify({reddits: user}));
                subReddit.push(userId);
                fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users: subReddit}));
            }
        }
        callback(res);
    }

}


let checker = 123;

bot.command('подписка', (ctx) =>{
    splittedMessage = ctx.message.body.split(" ");
    if (splittedMessage.length < 2){
        splitError('подписка', ctx);
        return 0;
    }

    followReddit(encodeURIComponent(splittedMessage[1].toUpperCase()), ctx.message.user_id, function(res){
        console.log(res);
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
bot.command('Мои подписки', (ctx) =>{
    try {
        let reddits = JSON.parse(fs.readFileSync(`users/${ctx.message.user_id}.json`)).reddits;
        let answer = "Ваши подписки: ";
        for (let i = 0; i < reddits.length; i++){
            answer+=("\n"+reddits[i]);
        }
        ctx.reply(answer);

    } catch (e) {
        ctx.reply("Вы не подписанны ни на один сабреддит");
        return 0;
    };

});
// bot.command("Посты", (сtx) =>{
//     console.log(ctx);
//     if (ctx.message.user_id == 241007366){
//         messageSender();
//     } else
//         ctx.reply("Вы не админ. Используйте 'Мои посты'")
// });


bot.command('Команды', (ctx) =>{
    ctx.reply(`Reddit bot AlphaTESTV1.0;\n

Команды: подписка "название", отписка "название", мои подписки, Мои посты.\n

Если вы не знаете на что подписаться, вот список сабреддитов: Anime, EarthPorn, Europe`)
});


bot.command('отписка', (ctx) =>{
    console.log('Отписка');

    splittedMessage = ctx.message.body.split(" ");

    if (splittedMessage.length < 2){
        splitError('отписка', ctx);
        return 0;
    }

    let userId = ctx.message.user_id;
    let redditName = splittedMessage[1].toUpperCase();
    let subReddit = checkIfSubRedditWasCreated(redditName);
    let user = checkIfSUserWasCreated(userId);


    if (subReddit === false || user === false){
        ctx.reply(`Вы не подписанны на  ${redditName}`)
    } else {
        let ind;
        let flag = false;
        for (let i = 0; i < user.length; i++){
            if (user[i] == redditName){
                ind = i;
                flag = true;
                break
            }
        }
        if (flag){
            user.splice(ind,1);
            for (let i = 0; i < subReddit.length; i++){
                if (userId == subReddit[i]){
                    subReddit.splice(i,1);
                    break;
                }
            }
            if (user.length){
                fs.writeFileSync(`users/${userId}.json`, JSON.stringify({reddits: user}));
            } else {
                fs.unlinkSync(`users/${userId}.json`);

                let listOfUsers = JSON.parse(fs.readFileSync("users.json")).users;
                for (let i = 0; i < listOfUsers.length;i++){
                    if (userId==listOfUsers[i]){
                        listOfUsers.splice(i,1);
                        fs.writeFileSync("users.json", JSON.stringify({users:listOfUsers}));
                        break;
                    }
                }

            }
            if (subReddit.length){
                fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users: subReddit}));
            } else {
                fs.unlinkSync(`reddits/${redditName}.json`);

                let listOfReddits = JSON.parse(fs.readFileSync("reddits.json")).reddits;
                for (let i = 0; i < listOfReddits.length;i++){
                    if (redditName==listOfReddits[i]){
                        listOfReddits.splice(i,1);
                        fs.writeFileSync("reddits.json", JSON.stringify({reddits: listOfReddits}));
                        break;
                    }
                }

            }
            ctx.reply(`Вы успешно отписались от ${redditName}`)
        } else {
            ctx.reply(`Вы не подписанны на  ${redditName}`)
        }
    }

});


function numToOkView(num) {
    if (num >= 1000){
        return (num/1000).toFixed(1) + "K";
    }
     return num
}

function fixedFromCharCode (codePt) {
    if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
    }
    else {
        return String.fromCharCode(codePt);
    }
}



// function messageSender() {
//     listOfReddits = JSON.parse(fs.readFileSync('reddits.json')).reddits;
//     function sender(iter) {
//
//         let url = `https://www.reddit.com/r/${listOfReddits[iter]}/hot/.json?limit=1`;
//
//         let settings = { method: "Get" };
//         fetch(url, settings)
//             .then(res => res.json())
//             .then((json) => {
//                 let users = JSON.parse(fs.readFileSync(`reddits/${listOfReddits[iter]}.json`)).users;
//                 let unfoldData = json.data.children[json.data.children.length-1].data;
//                 let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;
//                 if (unfoldData.thumbnail == "") {
//                     bot.sendMessage(users, messageToSend);
//                     if (iter < listOfReddits.length - 1) {
//                         sender(iter + 1);
//                     }
//                 } else {
//                     const file = fs.createWriteStream("photoForUpload.jpg");
//                     console.log(unfoldData.thumbnail);
//                     const request = https.get(unfoldData.thumbnail, function(response) {
//                         response.pipe(file);
//                         let prom = imageUploader.uploadPhoto('photoForUpload.jpg');
//                         prom.then(function (photo) {
//                             bot.sendMessage(users, messageToSend , `photo${photo.owner_id}_${photo.id}`);
//                             if (iter < listOfReddits.length - 1) {
//                                 sender(iter + 1);
//                             }
//                         }, function (error) {
//                         });
//                     });
//                 }
//             });
//     }
//     sender(0)
// }
// // bot.sendMessage(241007366, "yl","c67H1USawwc.jpg");
bot.startPolling();
bot.command('Мои посты', (ctx) =>{
   try {
       let b =  JSON.parse(fs.readFileSync(`users/${ctx.message.user_id}.json`)).reddits;
       messageSenderToOneUser(ctx.message.user_id)
   } catch(e) {
       ctx.reply("Вы не подписанны ни на один сабреддит");
   }
});

function messageSenderToOneUser(user_id){
    listOfReddits = JSON.parse(fs.readFileSync(`users/${user_id}.json`)).reddits;
    function sender(iter) {

        let url = `https://www.reddit.com/r/${listOfReddits[iter]}/hot/.json?limit=1`;

        let settings = { method: "Get" };
        fetch(url, settings)
            .then(res => res.json())
            .then((json) => {
                let users = JSON.parse(fs.readFileSync(`reddits/${listOfReddits[iter]}.json`)).users;
                console.log(json);
                let unfoldData = json.data.children[json.data.children.length-1].data;
                let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;
                if (unfoldData.thumbnail == "") {
                    bot.sendMessage(user_id, messageToSend);
                    if (iter < listOfReddits.length - 1) {
                        sender(iter + 1);
                    }
                } else {
                    const file = fs.createWriteStream("photoForUpload.jpg");
                    const request = https.get(unfoldData.thumbnail, function(response) {
                        response.pipe(file);
                        let prom = imageUploader.uploadPhoto('photoForUpload.jpg');
                        prom.then(function (photo) {
                            bot.sendMessage(user_id, messageToSend , `photo${photo.owner_id}_${photo.id}`);
                            if (iter < listOfReddits.length - 1) {
                                sender(iter + 1);
                            }
                        }, function (error) {
                        });
                    });
                }
            });
    }
    sender(0)
}