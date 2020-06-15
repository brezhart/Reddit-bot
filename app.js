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
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://localhost:27019/vkbotnode";
const client = new MongoClient(uri,{ useUnifiedTopology: true });
let db;

(async ()=>{ //Чтобы await работал

    await client.connect();
    db = client.db('vkbotnode');
    db.reddits = db.collection("reddits");
    db.users = db.collection("users");
    db.data = db.collection("data");
    db.reports = db.collection("reports");
    console.log(db);


// Админы кароче, что бы !Update можно было делать
    admins = [241007366,301052286];
// Для загрузки фоточек в вк.
    const imageUploader = new Bot({
        token: '7e155b83c9afc3c67b06e45b6465246bd69fe9efb7eb898531d1a8e1c9ca4754e1698c29b5ef60bb4a5af',
        group_id: "194737442"
    }).start();

// Обычный рандом с мин по макс
    function gRI(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }


// Чекаем если сабреддит существует. Калбэкаем в калбэк один из трёх вариантов: Есть, нет, приватные
    async function isSubRedditExist(name) {

        let url = `https://www.reddit.com/r/${name}/about/.json`;

        let settings = { method: "Get" };
        let res;
        await fetch(url, settings)
            .then(res => res.json())
            .then((json) => {
                if (json.message == "Not Found"){
                    res = "dontExist";
                }
                else if (json.reason == "private") {
                    res = "private"
                } else if (json.kind =='t5'){
                    if (json.data.over18){
                        res = "NSFW";
                    } else {
                        res = "ok";
                    }
                } else {
                    res = "dontExist";
                }
            });
        return res;
    }
// Error function возникающем если переданно только название функции, но не аргумент
    function splitError(command,ctx){
        ctx.reply(`Неправильный запрос! \n Не переданно название сабреддита. \n Пример: \"${command} Anime\" `);

    }

// Чекаем если юзер есть в users/. Если есть - возвращаем его реддиты.
    async function checkIfSUserWasCreated(id) {
        let user =  await db.users.findOne({id:id});
        if (user){
            return user.reddits;
        } else{
            return false
        }
    }
// Чекаем если сабреддит есть в reddits/. Если есть - возвращаем его подпищиков.
    async function checkIfSubRedditWasCreated(name) {
        let subReddit = await db.reddits.findOne({name: name});
        if (subReddit){
            return subReddit;
        }else {
            return false
        }
    }
    /*
        subReddit и user возращают false есть такого сабреддита или юзера не существует,
        иначе юзеров сабреддита или сабреддиты юзера
         */
// Добавить юзера в users.json
    async function addUserTolistOfUsers(user_id) {
        let users = await db.data.findOne({name:"users"});
        users.users.push(user_id);
        await db.data.findOneAndUpdate({name:"users"}, {$set:{users:users.users}});
    }
// добавить реддит в db.reddits
    async function addRedditToListOfReddits(redditName) {
        let reddits = await db.data.findOne({name:"reddits"});
        reddits.reddits.push(redditName);
        await db.data.findOneAndUpdate({name:"reddits"}, {$set:{reddits:reddits.reddits}});
    }

// Подписка Work function
    async function followReddit(redditName,userId, callback){
        let subReddit = await checkIfSubRedditWasCreated(redditName);
        console.log(subReddit);
        let user = await checkIfSUserWasCreated(userId);
        /*
        subReddit и user возращают false есть такого сабреддита или юзера не существует,
        иначе юзеров сабреддита или сабреддиты юзера
         */


        if (subReddit === false){
            let res = await isSubRedditExist(redditName);
            if (res === "ok"){
                await addRedditToListOfReddits(redditName);
                await db.reddits.insertOne({name:redditName,users: [userId],post: "", was: new Array(10).fill(0)});

                if (user === false){
                    await db.users.insertOne({id:userId, reddits: [redditName]});

                    addUserTolistOfUsers(userId);
                } else {
                    user.push(redditName);
                    await db.users.findOneAndUpdate({id:userId}, {$set: {reddits:user}});

                }

            }
            return res;
        } else {
            let res = 'ok';
            if (user === false){
                await db.users.insertOne({id:userId, reddits: [redditName]});

                addUserTolistOfUsers(userId);
            } else {
                let flag = false;
                console.log(user);
                for (let i = 0; i < user.length; i++ ){
                    if (redditName === user[i]){
                        res = 'already';
                        flag = true;
                        break;
                    }
                }
                if (!flag) {
                    user.push(redditName);
                    subReddit.users.push(userId);
                    await db.users.findOneAndUpdate({id:userId}, {$set: {reddits:user}});
                    await db.reddits.findOneAndUpdate({name:redditName}, {$set: {users:subReddit.users}});

                }
            }
            return res;
        }

    }


// Подписка Activation function
    bot.command('подписка', async (ctx) =>{
        splittedMessage = ctx.message.body.split(" ");
        if (splittedMessage.length < 2){
            splitError('подписка', ctx);
            return 0;
        }

        let res = await followReddit(encodeURIComponent(splittedMessage[1].toUpperCase()), ctx.message.user_id);
        console.log(res);
        if (res == "ok"){
            makePostUrl(splittedMessage[1].toUpperCase());
            ctx.reply(`Вы успешно подписались на ${splittedMessage[1]}`);
        } else if (res == "already"){
            ctx.reply("Вы уже подписанны на этот сабредит");
        } else if (res == "private"){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит является приватным`);
        } else if (res == 'dontExist'){
            ctx.reply(`Вы не можете подписаться на ${splittedMessage[1]}.\n Сабреддит не существует`);
        } else if (res == "NSFW"){
            ctx.reply("Данный сабреддит содержит NSFW контент. Подписка невозможна")
        }

    });
// Показать юзеру его подписки. Actiovation and work fucntion.
    bot.command('Мои подписки', async (ctx) =>{

        let reddits = (await db.users.findOne({id:ctx.message.user_id}));
        if (reddits) {
            reddits = reddits.reddits;
            let answer = "Ваши подписки: ";
            for (let i = 0; i < reddits.length; i++) {
                answer += ("\n" + reddits[i]);
            }
            ctx.reply(answer);
        } else {
            ctx.reply("Вы не подписаны ни на один сабреддит.");
        }

    });

// Базавая информация

// Отписка. Activation and work fucntion. TODO::Seperate!
    bot.command('отписка', async (ctx) =>{
        console.log('Отписка');
        splittedMessage = ctx.message.body.split(" ");
        let amountOfSubRedditsByUser = 0;
        let us = await db.users.findOne({id:ctx.message.user_id});
        if (us){
            amountOfSubRedditsByUser = us.reddits.length
        }
        if (splittedMessage.length < 2){
            if (amountOfSubRedditsByUser) {
                let url = `https://api.vk.com/method/messages.send?message=Выберите сабреддиты от которых хотите отписаться&access_token=${tokens.vk}&v=5.103&keyboard=${JSON.stringify(await makeUnsubscribeKeyboard(ctx.message.user_id))}&random_id=${gRI(1, 99999999999999)}&user_id=${ctx.message.user_id}`;
                fetch(encodeURI(url), settings)
                    .then(res => res.json())
                    .then((json) => {
                        console.log(json.error);
                    });
                return 0
            } else {
                ctx.reply("Вы не подписаны ни на один сабреддит.")
                return 0;
            }
        }
        let flag =  (splittedMessage[2] == "\u2328");

        let userId = ctx.message.user_id;
        let redditName = splittedMessage[1].toUpperCase();
        let subReddit = await checkIfSubRedditWasCreated(redditName);
        let user = await checkIfSUserWasCreated(userId);


        if (subReddit === false || user === false){
            ctx.reply(`Вы не подписаны на  ${redditName}`)
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
                    if (userId == subReddit.users[i]){
                        subReddit.users.splice(i,1);
                        break;
                    }
                }
                if (user.length){
                    await db.users.findOneAndUpdate({id:userId}, {$set: {reddits:user}});
                } else {
                    await db.users.findOneAndDelete({id:userId});

                    let listOfUsers = (await db.data.findOne({name:"users"})).users;
                    for (let i = 0; i < listOfUsers.length;i++){
                        if (userId==listOfUsers[i]){
                            listOfUsers.splice(i,1);
                            await db.data.findOneAndUpdate({name:"users"}, {$set: {users:listOfUsers}});
                            break;
                        }
                    }

                }
                if (subReddit.length){
                    await db.reddits.findOneAndUpdate({name:redditName}, {$set:{subReddit}});
                } else {
                    await db.reddits.findOneAndDelete({name:redditName});


                    let listOfReddits = (await db.data.findOne({name:"reddits"})).reddits;
                    for (let i = 0; i < listOfReddits.length;i++){
                        if (redditName==listOfReddits[i]){
                            listOfReddits.splice(i,1);
                            await db.data.findOneAndUpdate({name:"reddits"}, {$set:{reddits:listOfReddits}});
                            break;
                        }
                    }

                }

                if (flag){
                    console.log("AMOUNT", amountOfSubRedditsByUser);
                    let keyboard = makeMenuKeyboard();
                    if (amountOfSubRedditsByUser-1) {
                        keyboard = await makeUnsubscribeKeyboard(ctx.message.user_id);
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
    async function messageSender() {
        listOfReddits = JSON.parse(fs.readFileSync(`${__dirname}/` + 'tmpD/'+ 'reddits.json')).reddits;
        function sender(iter) {

            let url = `https://www.reddit.com/r/${listOfReddits[iter]}/hot/.json?limit=1`;

            fetch(url, settings)
                .then(res => res.json())
                .then((json) => {
                    let users = JSON.parse(fs.readFileSync(`${__dirname}/` + 'tmpD/'+ `reddits/${listOfReddits[iter]}.json`)).users;
                    let unfoldData = json.data.children[json.data.children.length-1].data;
                    let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;
                    if (unfoldData.thumbnail == "") {
                        bot.sendMessage(users, messageToSend);
                        if (iter < listOfReddits.length - 1) {
                            sender(iter + 1);
                        }
                    } else {
                        const file = fs.createWriteStream(`${__dirname}/` + 'tmpD/'+ "photoForUpload.jpg");
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
    bot.command('Мои посты', async (ctx) =>{
        if (await db.users.findOne({id:ctx.message.user_id})){
            messageSenderToOneUser(ctx.message.user_id)
        } else {
            ctx.reply("Вы не подписанны ни на один сабреддит");
        }
    });
// Посылает посты отдельному юзеру из сабредитов на которые подписанн юзер. Work function
    async function messageSenderToOneUser(user_id){
        listOfReddits = (await db.users.findOne({id:user_id})).reddits;
        async function sender(iter) {
            let subRedditObj = await db.reddits.findOne({name:listOfReddits[iter]});
            if (subRedditObj.post) {

                fetch(encodeURI(`${subRedditObj.post}&user_id=${user_id}&random_id=${gRI(1, 999999999999)}`), settings)
                    .then((json) => {

                    });
                if (iter < listOfReddits.length - 1) {
                    sender(iter + 1);
                }
            } else {
                makePostUrl(listOfReddits[iter], function(UrlRed){
                    fetch(encodeURI(`${UrlRed}&user_id=${user_id}&random_id=${gRI(1, 999999999999)}`), settings)
                        .then((json) => {

                        });

                });
                if (iter < listOfReddits.length - 1) {
                    sender(iter + 1);
                }
            }
        }
        sender(0);
    }
    async function makePostUrl(redditName, callback) {
        console.log("MAKING!");
        let subRedditObj = await db.reddits.findOne({name:redditName});
        let url = `https://www.reddit.com/r/${redditName}/hot/.json?limit=11`;
        let settings = {method: "Get"};
        let res = await fetch(url, settings)
            .then(async res => res.json())
            .then(async (json) => {
                let unfoldData;
                for (let i = json.data.children.length - 11; i < json.data.children.length; i++){
                    if (!subRedditObj.was.includes(json.data.children[i].data.created)){
                        unfoldData = json.data.children[i].data;
                        subRedditObj.was.unshift(json.data.children[i].data.created);
                        subRedditObj.was = subRedditObj.was.splice(0,10);
                        break
                    }
                };
                let messageToSend = `Из: ${unfoldData.subreddit} \n ${unfoldData.title} \n\u2B06${numToOkView(unfoldData.score)}\n${fixedFromCharCode(0x1F4AC)}${numToOkView(unfoldData.num_comments)}`;
                console.log("THIS SHIT", unfoldData.url);
                if ((unfoldData.thumbnail == "" || unfoldData.thumbnail == "self") && !(unfoldData.url.includes(".jpg") || unfoldData.url.includes(".png"))) {
                    let keyboard = keyBoardCreator.keyBoard(false, true);
                    keyboard.buttons.push([keyBoardCreator.linkButton(`https://reddit.com${unfoldData.permalink}`)]);
                    let postUrl = `https://api.vk.com/method/messages.send?message=${messageToSend}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}`;
                    subRedditObj.post = postUrl;

                    await db.reddits.findOneAndUpdate({name:redditName}, {$set:{post:postUrl, was:subRedditObj.was}});

                    if (callback) {
                        callback(postUrl);
                    }
                } else {
                    const image = `photoForUpload${unfoldData.subreddit}.jpg`;
                    const file = fs.createWriteStream(`${__dirname}/`+ 'tmpD/' + image);
                    let imageUrl;
                    if (unfoldData.url && !unfoldData.thumbnail){
                        imageUrl = unfoldData.url
                    } else {
                        if (unfoldData.preview.images[0].source.url.includes("external-preview")) {
                            imageUrl = unfoldData.thumbnail;
                        } else {
                            imageUrl = unfoldData.preview.images[0].source.url.replace('preview', 'i');
                        }
                    }
                    const request = await https.get(imageUrl, async function (response) {
                        response.pipe(file);
                        await response.on('end', async function () {
                            let prom = imageUploader.uploadPhoto(`${__dirname}/` + 'tmpD/' + image);
                            await prom.then(async function (photo) {
                                fs.unlink(`${__dirname}/` + 'tmpD/' + image, function () {console.log(`${__dirname}/` + image)});
                                let keyboard = keyBoardCreator.keyBoard(false, true);
                                keyboard.buttons.push([keyBoardCreator.linkButton(`https://reddit.com${unfoldData.permalink}`)]);
                                let postUrl = `https://api.vk.com/method/messages.send?message=${messageToSend}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}&attachment=photo${photo.owner_id}_${photo.id}`;

                                subRedditObj.post = postUrl;
                                await db.reddits.findOneAndUpdate({name:redditName}, {$set:{post:postUrl, was:subRedditObj.was}});

                                if (callback) {
                                    callback(postUrl);
                                }
                            }, function (error) {
                                fs.unlink(`${__dirname}/`+ 'tmpD/'  + image, function () {console.log(`${__dirname}/` + 'tmpD/' + image, "WAS DELETED AND WE HAVE AN ERROR")});
                            });
                        });
                    });

                }
            });
    };





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
        let topReddits = ["EarthPorn", "aww", "anime", "Europe"];
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
                    const image = `photoForUpload.png`;
                    const request = https.get(unfoldData.icon_img || standartLogo, function(response) {
                        const file = fs.createWriteStream(`${__dirname}/` + 'tmpD/'+ image);
                        response.pipe(file);
                        response.on("end", function () {
                            let prom = imageUploader.uploadPhoto(`${__dirname}/` + 'tmpD/'+ image);
                            prom.then(function (photo) {
                                fs.unlink(`${__dirname}/` + 'tmpD/'+ image, function () {});
                                console.log("UPLOAD");
                                let photoUrlPart = `photo${photo.owner_id}_${photo.id}`;
                                let keyboard = keyBoardCreator.keyBoard(false,true);
                                keyboard.buttons.push([keyBoardCreator.subscribeButton(topReddits[iter])]);

                                let url = `https://api.vk.com/method/messages.send?message=${text}&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(keyboard)}&attachment=${photoUrlPart}&user_id=`;
                                PopularRedditsUrls.push(url);
                                if (iter < topReddits.length - 1) {
                                    worker(iter + 1);
                                }
                            }, function (error) {
                                console.log(error)
                            });
                        });
                    });
                });
        }
        worker(0)
    }

    makeTopFiveSubReddits();
    bot.command("Рекомендации", (ctx) =>{

        let settings = { method: "Get" };
        for (let i = 0; i < PopularRedditsUrls.length; i++) {
            fetch(encodeURI(PopularRedditsUrls[i] + ctx.message.user_id + `&random_id=${gRI(1,99999999999999)}`), settings)
                .then(res => res.json())
                .then((json) => {
                });
        }
    });

    bot.command("Пост из", async (ctx) => {
        splittedMessage = ctx.message.body.split(" ");
        if (splittedMessage.length >= 3) {
            let reddit = (await db.reddits.findOne({name:splittedMessage[2].toLocaleUpperCase()}));
            if (reddit){
                fetch(encodeURI(`${reddit.post}&random_id=${gRI(1,99999999999999)}&user_id=${ctx.message.user_id}`), settings)
                    .then(res => res.json())
                    .then((json) => {
                        console.log(json.error);
                    }).catch(async (e) => {
                    let url = await makePostUrl(splittedMessage[2]);
                    console.log(url);
                    fetch(encodeURI(`${url}&random_id=${gRI(1,99999999999999)}&user_id=${ctx.message.user_id}`), settings);
                })
            } else {
                ctx.reply(`Вы не подписаны на ${splittedMessage[2]}`);
            }
        } else{
            let keyBoard = await makePostKeyboard(ctx.message.user_id);
            if (keyBoard) {
                let url = `https://api.vk.com/method/messages.send?message=Выберите сабреддит&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(await makePostKeyboard(ctx.message.user_id))}&random_id=${gRI(1, 99999999999999)}&user_id=${ctx.message.user_id}`;
                fetch(encodeURI(url), settings)
                    .then(res => res.json())
                    .then((json) => {
                        console.log(json.error);
                    });
            } else {
                ctx.reply("Вы не подписаны ни на один сабреддит")
            }
        }

        let flag =  (splittedMessage[2] == "\u2328");



    });


    function makeMenuKeyboard(){
        let keyboard = keyBoardCreator.keyBoard(false,false);
        keyboard.buttons.push([keyBoardCreator.actionButton("Мои посты", "primary")]);
        keyboard.buttons.push([keyBoardCreator.actionButton("Отписка", "negative"), keyBoardCreator.actionButton("Пост из", "positive")]);
        keyboard.buttons.push([keyBoardCreator.actionButton("Мои подписки", "secondary"),keyBoardCreator.actionButton("Помощь", "secondary")]);
        return keyboard;
    }


    bot.command(["Меню", "Start", "/start", "Начать"], (ctx) => {
        console.log(ctx.message.body);

        let url = `https://api.vk.com/method/messages.send?message=Меню!&access_token=${tokens.vk}&v=5.103&disable_mentions=1&keyboard=${JSON.stringify(makeMenuKeyboard())}&random_id=${gRI(1,99999999999999)}&user_id=${ctx.message.user_id}`;

        fetch(encodeURI(url), settings)
            .then(res => res.json())
            .then((json) => {
                console.log(json.response);
                let url = `https://api.vk.com/method/messages.delete?message_ids=${json.response}&delete_for_all=1&access_token=${tokens.vk}&v=5.103`;
                fetch(encodeURI(url), settings)
                    .then(res => res.json())
                    .then((json) => {
                        console.log(json);
                    })
            })
        // makeUnsubscribeKeyboard(ctx.message.user_id);
    });


    async function makeUnsubscribeKeyboard(user_id){
        let keyboard = keyBoardCreator.keyBoard(false,false);


        let subReddits = (await db.users.findOne({id:user_id})).reddits;
        for (let i = 0; i < Math.min(9, subReddits.length); i++) {
            keyboard.buttons.push([keyBoardCreator.actionButton(`Отписка ${subReddits[i]} \u2328`, "negative")]);
        }
        keyboard.buttons.push([keyBoardCreator.actionButton(`Меню`, "secondary")]);
        return keyboard;
    };
    async function makePostKeyboard(user_id){
        let keyboard = keyBoardCreator.keyBoard(false,false);
        let user = (await db.users.findOne({id:user_id}));
        if (user){

            let subReddits = user.reddits;
            for (let i = 0; i < Math.min(9, subReddits.length); i++) {
                keyboard.buttons.push([keyBoardCreator.actionButton(`Пост из ${subReddits[i]} \u2328`, "positive")]);
            }
            keyboard.buttons.push([keyBoardCreator.actionButton(`Меню`, "secondary")]);
            return keyboard;
        } else {
            return false;
        }
    }


    bot.command("!репорт", async (ctx) => {
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
        await db.reports.insertOne({id:ctx.message.user_id, time: time, message: message});
        ctx.reply(`Ваш репорт с идентификатором ${report_id} отправлен`)

    });
    bot.startPolling();

    bot.command("!update", (ctx) => {
        if (admins.includes(ctx.message.user_id)){
            updatePosts("FALSE");
            ctx.reply("Update was started")
        } else {
            ctx.reply("Вы не админ");
        }
    });


    bot.command("Помощь", (ctx) => {
        let message  = "Reddit-bot - чат-бот ретранслирующий посты с Реддита. \n\nКоманды:\nПодписка 'сабреддит' - подписаться на сабреддит\nОтписка 'сабреддита' - отписаться от сабреддита"+
            "\nМеню - вызвать меню\n!репорт 'текст' - написать в поддержку \n\n Если вы не знаете на что подписаться по нажмите на кнопку расположенную ниже." +
            "\n\n Made by *brezhart(brezhart)";

        let keyboard = keyBoardCreator.keyBoard(false,true);
        keyboard.buttons.push([keyBoardCreator.actionButton("Рекомендации", "secondary")]);


        let url = `https://api.vk.com/method/messages.send?message=${message}&access_token=${tokens.vk}&v=5.103&keyboard=${JSON.stringify(keyboard)}&random_id=${gRI(1, 99999999999999)}&user_id=${ctx.message.user_id}`;
        fetch(encodeURI(url), settings)
            .then(res => res.json())
            .then((json) => {
                console.log(json.error);
            });

    });






    async function  updatePosts(needTimer){
        console.log("UPDATE WAS STARTED!");
        let reddits = (await db.data.findOne({name:"reddits"})).reddits;

        if (needTimer) {
            setTimeout(function () {
                updatePosts(true);
            }, 3600000);
        }
        for (let i = 0; i < reddits.length; i++) {
            makePostUrl(reddits[i])
        }
    };
    setTimeout(async function(){await updatePosts(true)}, 3600000-Date.now()%3600000);
})();

