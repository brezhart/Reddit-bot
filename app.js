tokens = {vk:"7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af"};
//tokens = {vk: "5578e3814a103627728fca26d577ed07f08fd68683d960e0109316c93640e1063301ae969e31a07833865"};
const VkBot = require('node-vk-bot-api');
const bot = new VkBot(tokens.vk);
const fs = require('fs');
const fetch = require('node-fetch');
const http = require('http');
const https = require('https');

let settings = { method: "Get" };

const {Bot} = require('node-vk-bot');

// Для загрузки фоточек в вк.
const imageUploader = new Bot({
    token: '7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af',
    group_id: "194737442"
}).start();


function gRI(min, max) {
    return Math.random() * (max - min) + min;
}


// Чекаем если сабреддит существует. Калбэкаем в калбэк один из трёх вариантов: Есть, нет, приватные
function isSubRedditExist(name, callback) {

    let url = `https://www.reddit.com/r/${name}/about/.json`;

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
            } else if (json.kind =='t5'){
                if (json.data.over18){
                    callback("NSFW");
                    return 0;
                } else {
                    callback("ok");
                    return 0;
                }
            }
            callback("dontExist");
            return 0;
        });
}
// Error function возникающем если переданно только название функции, но не аргумент
function splitError(command,ctx){
    ctx.reply(`Неправильный запрос! \n Не переданно название сабреддита. \n Пример: \"${command} Anime\" `);

}

// Чекаем если юзер есть в users/. Если есть - возвращаем его реддиты.
function checkIfSUserWasCreated(id) {
    try{
        let subRedditsOfUser =  JSON.parse(fs.readFileSync(`users/${id}.json`)).reddits;
        return subRedditsOfUser;
    } catch (e) {
        return false;
    }

}

// Чекаем если сабреддит есть в reddits/. Если есть - возвращаем его подпищиков.
function checkIfSubRedditWasCreated(name) {
    try{
        let useresOfSubReddit =  JSON.parse(fs.readFileSync(`reddits/${name}.json`)).users;
        return useresOfSubReddit;
    } catch (e) {
        return false;
    }

}
// Добавить юзера в users.json
function addUserTolistOfUsers(user_id) {
    let listOfUsers = JSON.parse(fs.readFileSync("users.json")).users;
    listOfUsers.push(user_id);
    fs.writeFileSync("users.json", JSON.stringify({users: listOfUsers}))
}
// добавить реддит в reddits.json
function addRedditToListOfReddits(redditName) {
    let listOfReddits = JSON.parse(fs.readFileSync("reddits.json")).reddits;
    listOfReddits.push(redditName);
    fs.writeFileSync("reddits.json", JSON.stringify({reddits: listOfReddits}))
}

// Подписка Work function
function followReddit(redditName,userId, callback){
    let subReddit = checkIfSubRedditWasCreated(redditName);
    let user = checkIfSUserWasCreated(userId);
    if (subReddit === false){
        isSubRedditExist(redditName,function(res){
            if (res === "ok"){
                addRedditToListOfReddits(redditName);
                fs.writeFileSync(`reddits/${redditName}.json`, JSON.stringify({users: [userId],post: ""}));
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


// Подписка Activation function
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
            ctx.reply("Вы уже подписанны на этот сабредит");
        } else if (res == "private"){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит является приватным`);
        } else if (res == 'dontExist'){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит не существует`);
        } else if (res == "NSFW"){
            ctx.reply("Данный сабреддит содержит NSFW контент. Подписка невозомжна")
        }
    });


});
// Показать юзеру его подписки. Actiovation and work fucntion.
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

// Базавая информация.
bot.command('Команды', (ctx) =>{
    ctx.reply(`Меню - вызвать меню\nПодписка *сабреддит* - подписка на *сабреддит*\n!Репорт *Текст* - Отправить баг репорт`)
});
bot.command('Инфо', (ctx) =>{
    ctx.reply(
        `Reddit-bot - ретранслятор постов из Реддита.\nБот находится в активной разработке присутствуют баги и недоработки. Если заметели таковой - исполбзуйте !Репорт.  \nMade by @brezhart`)
});


// Отписка. Activation and work fucntion. TODO::Seperate!
bot.command('отписка', (ctx) =>{
    console.log('Отписка');
    splittedMessage = ctx.message.body.split(" ");
    let amountOfSubRedditsByUser;
    try {
        amountOfSubRedditsByUser = JSON.parse(fs.readFileSync(`users/${ctx.message.user_id}.json`)).reddits.length;
    } catch (e) {
        amountOfSubRedditsByUser = 0;
    }
    if (splittedMessage.length < 2){
        if (amountOfSubRedditsByUser) {
            let url = `https://api.vk.com/method/messages.send?message=Выберите сабреддиты от которых хотите отписаться&access_token=${tokens.vk}&v=5.103&keyboard=${JSON.stringify(makeUnsubscribeKeyboard(ctx.message.user_id))}&random_id=${gRI(1, 99999999999999)}&user_id=${ctx.message.user_id}`;
            fetch(encodeURI(url), settings)
                .then(res => res.json())
                .then((json) => {
                    console.log(json.error);
                });
            return 0;
        } else {
            ctx.reply("Вы не подписанный ни на один сабреддит.")
            return 0;
        }
    }
    let flag =  (splittedMessage[2] == "\u2328");

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

            if (flag){
                console.log("AMOUNT", amountOfSubRedditsByUser);
                let keyboard = makeMenuKeyboard();
                if (amountOfSubRedditsByUser-1) {
                    keyboard = makeUnsubscribeKeyboard(ctx.message.user_id);
                }
                let url = `https://api.vk.com/method/messages.send?message=Вы успешно отписались от ${redditName}&access_token=${tokens.vk}&v=5.103&keyboard=${JSON.stringify(keyboard)}&random_id=${gRI(1, 99999999999999)}&user_id=${ctx.message.user_id}`;
                fetch(encodeURI(url), settings)
                    .then(res => res.json())
                    .then((json) => {
                        console.log(json.error);
                    });



            } else{
                ctx.reply(`Вы успешно отписались от ${redditName}`);
            }
            console.log("FLAG - ", flag )
        } else {
            ctx.reply(`Вы не подписанны на  ${redditName}`)
        }
    }

});

// 6642 => 6.6K function
function numToOkView(num) {
    if (num >= 1000000){
        return (num/1000000).toFixed(1) + "M"
    }
    else if (num >= 1000){
        return (num/1000).toFixed(1) + "K";
    }
    return num
}
// Five char unicode support
function fixedFromCharCode (codePt) {
    if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
    }
    else {
        return String.fromCharCode(codePt);
    }
}

// Посылает посты всем юзерам. Work function
function messageSender() {
    listOfReddits = JSON.parse(fs.readFileSync('reddits.json')).reddits;
    function sender(iter) {

        let url = `https://www.reddit.com/r/${listOfReddits[iter]}/hot/.json?limit=1`;

        fetch(url, settings)
            .then(res => res.json())
            .then((json) => {
                let users = JSON.parse(fs.readFileSync(`reddits/${listOfReddits[iter]}.json`)).users;
                let unfoldData = json.data.children[json.data.children.length-1].data;
                let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;
                if (unfoldData.thumbnail == "") {
                    bot.sendMessage(users, messageToSend);
                    if (iter < listOfReddits.length - 1) {
                        sender(iter + 1);
                    }
                } else {
                    const file = fs.createWriteStream("photoForUpload.jpg");
                    const request = https.get( unfoldData.thumbnail , function(response) {
                        response.pipe(file);
                        let prom = imageUploader.uploadPhoto('photoForUpload.jpg');
                        prom.then(function (photo) {
                            bot.sendMessage(users, messageToSend , `photo${photo.owner_id}_${photo.id}`);
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



// Посылает посты отдельному юзеру из сабредитов на которые подписанн юзер. Activation function
bot.command('Мои посты', (ctx) =>{
    try {
        let b = JSON.parse(fs.readFileSync(`users/${ctx.message.user_id}.json`)).reddits;
        messageSenderToOneUser(ctx.message.user_id)
    } catch(e) {
        ctx.reply("Вы не подписанны ни на один сабреддит");
    }
});
// Посылает посты отдельному юзеру из сабредитов на которые подписанн юзер. Work function
function messageSenderToOneUser(user_id){
    listOfReddits = JSON.parse(fs.readFileSync(`users/${user_id}.json`)).reddits;
    function sender(iter) {
        let subRedditObj = JSON.parse(fs.readFileSync(`reddits/${listOfReddits[iter]}.json`));
        if (subRedditObj.post) {
            fetch(encodeURI(`${subRedditObj.post}&user_id=${user_id}&random_id=${gRI(1, 999999999999)}`), settings)
                .then((json) => {
                });
            if (iter < listOfReddits.length - 1) {

                sender(iter + 1);
            }
        } else {
            let url = `https://www.reddit.com/r/${listOfReddits[iter]}/hot/.json?limit=1`;
            let settings = {method: "Get"};
            fetch(url, settings)
                .then(res => res.json())
                .then((json) => {

                    let users = JSON.parse(fs.readFileSync(`reddits/${listOfReddits[iter]}.json`)).users;

                    let unfoldData = json.data.children[json.data.children.length - 1].data;
                    let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;

                    if (unfoldData.thumbnail == "" || unfoldData.thumbnail == "self") {

                        let keyboard = keyBoardCreator.keyBoard(false, true);
                        keyboard.buttons.push([keyBoardCreator.linkButton(`https://reddit.com${unfoldData.permalink}`)]);
                        let url = `https://api.vk.com/method/messages.send?message=${messageToSend}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}`;
                        fetch(encodeURI(`${url}&user_id=${user_id}&random_id=${gRI(1, 999999999999)}`), settings)
                            .then(res => res.json())
                            .then((json) => {
                            });
                        fs.writeFileSync(`reddits/${listOfReddits[iter]}.json`, JSON.stringify({users:subRedditObj.users,post:url}));
                        if (iter < listOfReddits.length - 1) {
                            sender(iter + 1);
                        }
                    } else {
                        const file = fs.createWriteStream("photoForUpload.jpg");
                        let imageUrl;
                        if (unfoldData.preview.images[0].source.url.includes("external-preview")) {
                            imageUrl = unfoldData.thumbnail;
                        } else {
                            imageUrl = unfoldData.preview.images[0].source.url.replace('preview', 'i');
                        }
                        const request = https.get(imageUrl, function (response) {

                            response.pipe(file);
                            response.on('end', function () {


                                let prom = imageUploader.uploadPhoto('photoForUpload.jpg');
                                prom.then(function (photo) {
                                    let keyboard = keyBoardCreator.keyBoard(false, true);
                                    keyboard.buttons.push([keyBoardCreator.linkButton(`https://reddit.com${unfoldData.permalink}`)]);
                                    let url = `https://api.vk.com/method/messages.send?message=${messageToSend}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}&attachment=photo${photo.owner_id}_${photo.id}`;
                                    fetch(encodeURI(`${url}&user_id=${user_id}&random_id=${gRI(1, 999999999999)}`), settings)
                                        .then(res => res.json())
                                        .then((json) => {
                                        });
                                    fs.writeFileSync(`reddits/${listOfReddits[iter]}.json`, JSON.stringify({users:subRedditObj.users,post:url}));
                                    if (iter < listOfReddits.length - 1) {
                                        sender(iter + 1);
                                    }
                                }, function (error) {
                                });
                            });
                        });

                    }
                });
        }
    }
    sender(0);
}


let PopularRedditsUrls= [];


let keyBoardCreator = {
    keyBoard: function (one_time, inline) {
        return {
            "one_time": one_time,
            "inline": inline,
            "buttons": []
        }

    },
    actionButton: function(command,color){
        return {
            "action": {
                "type": "text",
                "payload": "false",
                "label": command
            },
            "color": color
        }

    },
    subscribeButton: function (redditName) {
        return keyBoardCreator.actionButton(`Подписка ${redditName}`, 'positive')
    },
    unsubscribeButton: function(redditName) {
        return keyBoardCreator.actionButton(`Отписка ${redditName}`, 'negative')
    },
    linkButton: function (link) {
        return {
            "action": {
                "type": "open_link",
                "link": link,
                "payload": "{\"button\": \"1\"}",
                "label": `Открыть`
            }
        }
    }

};


function makeTopFiveSubReddits(){
    let topReddits = ['EarthPorn', "Anime", "Europe", "Memes"];
    let settings = { method: "Get" };


    function worker(iter) {
        console.log("---------------",iter);
        fetch(`https://www.reddit.com/r/${topReddits[iter]}/about/.json?`, settings)
            .then(res => res.json())
            .then((json) => {
                let unfoldData = json.data;
                let text = `r/${unfoldData.display_name}\n${unfoldData.public_description}\n${fixedFromCharCode(0x1F465)}: ${numToOkView(unfoldData.subscribers)}`;
                console.log(unfoldData.icon_img);
                let standartLogo = "https://raw.githubusercontent.com/brezhart/seafac/master/inLogo.png";
                const request = https.get(unfoldData.community_icon || unfoldData.icon_img || standartLogo, function(response) {
                    const file = fs.createWriteStream("photoForUpload.png");
                    response.pipe(file,{ end: false });
                    response.on("end", function () {
                        let prom = imageUploader.uploadPhoto('photoForUpload.png');
                        prom.then(function (photo) {
                            let photoUrlPart = `photo${photo.owner_id}_${photo.id}`;
                            let keyboard = keyBoardCreator.keyBoard(false,true);
                            keyboard.buttons.push([keyBoardCreator.subscribeButton(topReddits[iter])]);

                            let url = `https://api.vk.com/method/messages.send?message=${text}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}&attachment=${photoUrlPart}&user_id=`;
                            PopularRedditsUrls.push(url);
                            if (iter < topReddits.length - 1) {
                                worker(iter + 1);
                            }
                        }, function (error) {
                        });
                    });
                });
            });
    }
    worker(0)
}


bot.command("Рекомендации", (ctx) =>{
    console.log("RECOMEND!");
    let settings = { method: "Get" };
    for (let i = 0; i < PopularRedditsUrls.length; i++) {
        fetch(encodeURI(PopularRedditsUrls[i] + ctx.message.user_id + `&random_id=${gRI(1,99999999999999)}`), settings)
            .then(res => res.json())
            .then((json) => {
                console.log(json)
            });
    }
});
makeTopFiveSubReddits();

function makeMenuKeyboard(){
    let keyboard = keyBoardCreator.keyBoard(false,false);
    keyboard.buttons.push([keyBoardCreator.actionButton("Мои посты", "primary")]);
    keyboard.buttons.push([keyBoardCreator.actionButton("Рекомендации", "primary")]);
    keyboard.buttons.push([keyBoardCreator.actionButton("Команды", "secondary"), keyBoardCreator.actionButton("Инфо", "secondary")]);
    keyboard.buttons.push([keyBoardCreator.actionButton("Отписка", "primary")]);
    keyboard.buttons.push([keyBoardCreator.actionButton("Мои подписки", "primary")]);
    return keyboard;
}


bot.command("Меню", (ctx) => {
    console.log(ctx.message.body);

    let url = `https://api.vk.com/method/messages.send?message=Меню!&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(makeMenuKeyboard())}&random_id=${gRI(1,99999999999999)}&user_id=${ctx.message.user_id}`;
    fetch(encodeURI(url), settings)
        .then(res => res.json())
        .then((json) => {
            console.log(json.error);
        });
    // makeUnsubscribeKeyboard(ctx.message.user_id);
});


function makeUnsubscribeKeyboard(user_id){
    let keyboard = keyBoardCreator.keyBoard(false,false);
    try {

        let subReddits = JSON.parse(fs.readFileSync(`users/${user_id}.json`)).reddits;
        for (let i = 0; i < Math.min(9, subReddits.length); i++) {
            keyboard.buttons.push([keyBoardCreator.actionButton(`Отписка ${subReddits[i]} \u2328`, "negative")]);
        }
    } catch (e) {}
    keyboard.buttons.push([keyBoardCreator.actionButton(`Меню`, "secondary")]);
    // let url = `https://api.vk.com/method/messages.send?message=1&access_token=${tokens.vk}&v=5.103&keyboard=${JSON.stringify(keyboard)}&random_id=${gRI(1,99999999999999)}&user_id=${user_id}`;
    // fetch(encodeURI(url), settings)
    //     .then(res => res.json())
    //     .then((json) => {
    //         console.log(json.error);
    //     });
    return keyboard;
};
bot.command("!репорт", (ctx) => {
    if (ctx.message.body.split(" ").length < 2){
        ctx.reply("Отправте репорт используя !репорт *текст*");
        return 0;
    }
    if (ctx.message.body.length > 2008){
        ctx.reply(`Репорт должен быть меньше 2000 знаков`);
        return 0;
    }
    let report_id = Math.floor(gRI(1,99999));
    let time = new Date();
    let message = ctx.message.body.split(" ");
    message.splice(0,1);
    message = message.join(" ");
    fs.writeFileSync(`reports/${report_id}.txt`, `От: ${ctx.message.user_id}\nВремя: ${time}\n${message}`);
    ctx.reply(`Ваш репорт с идентификатором ${report_id} отправлен`)

});

bot.startPolling();


















//
//
