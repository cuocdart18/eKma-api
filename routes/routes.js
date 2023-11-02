const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
const md5 = require("md5");
const qs = require("query-string");
const cheerio = require("cheerio");
var request = require('request');
var { google } = require('googleapis');

const { parseInitialFormData, parseSelector } = require("../utils");
const listSchedule = require("../schedule");

const loginUrl = "http://qldt.actvn.edu.vn/CMCSoft.IU.Web.Info/Login.aspx";
const studentProfileUrl =
    "http://qldt.actvn.edu.vn/CMCSoft.IU.Web.Info/StudentProfileNew/HoSoSinhVien.aspx";

const OK = 200;
const PROFILE = 1;
const SCHEDULE = 2;
const AUTH = 3;
const UPDATE_SCHEDULE = 4;
const SCHEDULE_WITH_SEMESTER_CODE = 5;
const SEMESTER_CODES = 6;

var MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
var SCOPES = [MESSAGING_SCOPE];

const drpSemesters = [
    "6761f16424244e5fa9984bb2c3b8fe9a", // 2_2023_2024
    "067aa253bc124d7089df25efe280dd00", // 1_2023_2024
    "4f0dc159f1504874b2f9c6ae7c8bd281", // 2_2022_2023
    "8e5f8f99cc7b4ddc83cd62863244b432", // 1_2022_2023
    "f73ceb56aac846d6865761a4fa87dc7c", // 2_2021_2022
    "fe894d5f58cc491a8fdbd50b46d1f682", // 1_2021_2022
    "4aeee21881294e4597e8e77c4c4bed04", // 2_2020_2021
    "2785c57c8f50480b91437980bb75f7ed", // 1_2020_2021
    "6958f2ddc785427d96cc6259be027f7a", // 2_2019_2020
    "e040d3df1f4b45c89a1fc1ebba2cb39c", // 1_2019_2020
    "edbd12cb31074a0aadacfbcc108d9d24", // 2_2018_2019
    "f85b945085ee4b8898a30165ca1833ff", // 1_2018_2019
    "665543dbe0cb4f59880c386a95634762", // 2_2017_2018
    "f5e86403ffb44689a948c9640d7bad5b", // 1_2017_2018
    "852cf26eb5624de1aaff02c7467326b8", // 2_2016_2017
    "9543b9fb32d34f10a6aaf15761919b7a", // 1_2016_2017
];

axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

axios.defaults.withCredentials = true;
axios.defaults.crossdomain = true;
axios.defaults.jar = cookieJar;

async function main(req, mode, shouldHash) {
    if (mode == SEMESTER_CODES) {
        return JSON.stringify(drpSemesters);
    }

    const username = req.username;
    const password = req.password;

    if (!username || !password) {
        console.log("Missing items!");
        return JSON.stringify("Missing items!");
    }

    try {
        const configLogin = { withCredentials: true, jar: cookieJar };
        const loginGet = await axios.get(loginUrl, configLogin);

        let $ = cheerio.load(loginGet.data);

        var form;
        if (shouldHash) {
            const formData = {
                ...parseInitialFormData($),
                ...parseSelector($),
                txtUserName: username,
                txtPassword: md5(password),
                btnSubmit: "Đăng nhập",
            };
            form = qs.stringify(formData);
        } else {
            const formData = {
                ...parseInitialFormData($),
                ...parseSelector($),
                txtUserName: username,
                txtPassword: password,
                btnSubmit: "Đăng nhập",
            };
            form = qs.stringify(formData);
        }

        const config = {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) coc_coc_browser/76.0.114 Chrome/70.0.3538.114 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            withCredentials: true,
            jar: cookieJar,
        };
        const loginPost = await axios.post(loginUrl, form, config);

        $ = cheerio.load(loginPost.data);
        const userFullName = $("#PageHeader1_lblUserFullName").text().toLowerCase();
        const wrongPass = $("#lblErrorInfo").text();

        if (
            wrongPass == "Bạn đã nhập sai tên hoặc mật khẩu!" ||
            wrongPass == "Tên đăng nhập không đúng!"
        ) {
            console.log("Sai ten dang nhap hoac mat khau");
            var result = {
                message: "Sai ten dang nhap hoac mat khau",
            };
            return JSON.stringify(result);
        }

        if (userFullName == "khách") {
            console.log("author: khách");
            return JSON.stringify("Please login again!");
        }

        if (mode == AUTH) {
            console.log("get Auth");
            var result = {
                message: "Login successfully",
            };
            return JSON.stringify(result);
        }

        if (mode == PROFILE) {
            console.log("get Profile");
            const config = {
                withCredentials: true,
                jar: cookieJar,
            };
            const res = await axios.get(studentProfileUrl, config);

            $ = cheerio.load(res.data);
            const displayName =
                ($('input[name="txtHoDem"]').val() || "") +
                " " +
                ($('input[name="txtTen"]').val() || "");
            const studentCode = $('input[name="txtMaSV"]').val() || "";
            const gender = $('select[name="drpGioiTinh"] > option[selected]').text();
            const birthday = $('input[name="txtNgaySinh"]').val() || "";

            const information = {
                message: "Thành Công",
                displayName,
                studentCode,
                gender,
                birthday,
            };

            return JSON.stringify(information);
        }

        if (mode == SCHEDULE) {
            var counter = 0;

            const ConvertLoop = async () => {
                periods = [];

                for (const semester of drpSemesters) {
                    let schedule = await listSchedule(cookieJar, semester);
                    schedule.data.forEach((schedule) => convertToPeriod(schedule, periods));
                }

                return periods
            }
            var fullPeriod = await ConvertLoop();

            var result = {
                message: "Thành Công",
                periods: fullPeriod,
            };

            return JSON.stringify(result);

            function convertToPeriod(item, arr) {
                var period = {
                    id: counter,
                    day: item.day,
                    subjectCode: item.subjectCode,
                    subjectName: item.subjectName,
                    className: item.className,
                    teacher: item.teacher,
                    lesson: item.lesson,
                    room: item.room,
                };
                arr.push(period);
                counter++;
            }
        }

        if (mode == SCHEDULE_WITH_SEMESTER_CODE) {
            let schedule = await listSchedule(cookieJar, req.semesterCode);
            var periods = [];
            schedule.data.forEach(displaySchedule);
            function displaySchedule(item, index, arr) {
                var period = {
                    id: (item.day + item.subjectCode).hashCode(),
                    day: item.day,
                    subjectCode: item.subjectCode,
                    subjectName: item.subjectName,
                    className: item.className,
                    teacher: item.teacher,
                    lesson: item.lesson,
                    room: item.room
                }
                periods[index] = period
            }

            var result = {
                message: "Thành Công",
                periods: periods
            };

            return JSON.stringify(result);
        }
    } catch (e) {
        console.log("-------------------------------------------------------");
        console.log(e);
        console.log("-------------------------------------------------------");
    }
}

const router = (app, io) => {
    //-------------------------- SOCKET IO
    let onlineUsers = [];
    io.of('/status').on('connection', (socket) => {
        console.log('a user connected ', onlineUsers);

        socket.on("addOnlineUser", (userId) => {
            if (!onlineUsers.some((user) => user.userId === userId)) {
                onlineUsers.push(
                    {
                        userId: userId,
                        socketId: socket.id
                    }
                );
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("user disconnected = ", socket.id);
            console.log("reason = ", reason);
        });

        socket.on("removeOfflineUser", () => {
            onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id)
            console.log("user disconnected ", onlineUsers);
        });
    });

    //-------------------------- RESTful API
    app.get("/", function (req, res) {
        res
            .writeHead(301, {
                Location: `https://github.com/cuocdart18/eKma-api`,
            })
            .end();
    });

    app.get("/schedule", function (req, res) {
        var username = req.query.username;
        var password = req.query.password;
        var shouldHash = true;
        if (req.query.hashed == "true") {
            shouldHash = false;
        }
        let result = main({ username, password }, SCHEDULE, shouldHash);
        result.then(function (r) {
            res.send(r);
            res.end();
        });
    });

    app.get("/schedule-with-semester-code", function (req, res) {
        var username = req.query.username;
        var password = req.query.password;
        var shouldHash = true;
        var semesterCode = req.query.semesterCode;
        if (req.query.hashed == "true") {
            shouldHash = false;
        }
        let result = main({ username, password, semesterCode }, SCHEDULE_WITH_SEMESTER_CODE, shouldHash);
        result.then(function (r) {
            res.send(r);
            res.end();
        });
    });

    app.get("/semester-codes", function (req, res) {
        let result = main({}, mode = SEMESTER_CODES);
        result.then(function (r) {
            res.send(r);
            res.end();
        });
    });

    app.get("/profile", function (req, res) {
        var username = req.query.username;
        var password = req.query.password;
        var shouldHash = true;
        if (req.query.hashed == "true") {
            shouldHash = false;
        }
        let result = main({ username, password }, PROFILE, shouldHash);
        result.then(function (r) {
            res.send(r);
            res.end();
        });
    });

    app.get("/auth", function (req, res) {
        var username = req.query.username;
        var password = req.query.password;
        var shouldHash = true;
        if (req.query.hashed == "true") {
            shouldHash = false;
        }
        let result = main({ username, password }, AUTH, shouldHash);
        result.then(function (r) {
            res.send(r);
            res.end();
        });
    });

    app.post("/call-invitation", function (req, res) {

        try {
            getAccessToken().then(function (access_token) {

                var token = req.body.token;
                var data = req.body.data;

                request.post({
                    headers: {
                        Authorization: 'Bearer ' + access_token
                    },
                    url: "https://fcm.googleapis.com/v1/projects/ekma-c517e/messages:send",
                    body: JSON.stringify(
                        {
                            "message": {
                                "token": token,
                                "data": data
                            }
                        }
                    )
                }, function (error, response, body) {
                    res.end(body);
                    console.log(body);
                });
            })
        } catch (e) {
            console.log(e);
        }
    })
};

function getAccessToken() {
    return new Promise(function (resolve, reject) {
        var key = require("./service-account.json");
        var jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

String.prototype.hashCode = function () {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

module.exports = router;
