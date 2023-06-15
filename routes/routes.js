const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
const md5 = require('md5')
const qs = require('query-string')
const cheerio = require('cheerio')

const { parseInitialFormData, parseSelector } = require('../utils')
const listSchedule = require('../schedule')


const loginUrl = 'http://qldt.actvn.edu.vn/CMCSoft.IU.Web.Info/Login.aspx'
const studentProfileUrl = 'http://qldt.actvn.edu.vn/CMCSoft.IU.Web.Info/StudentProfileNew/HoSoSinhVien.aspx'

const OK = 200
const PROFILE = 1
const SCHEDULE = 2
const AUTH = 3

axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar()

axios.defaults.withCredentials = true
axios.defaults.crossdomain = true
axios.defaults.jar = cookieJar

async function main(req, mode, shouldHash) {
    const username = req.username
    const password = req.password

    if (!username || !password) {
        return JSON.stringify("Missing items!");
    }

    console.log('Login With ID:', username);

    try {
        const loginGet = await axios.get(loginUrl, { withCredentials: true, jar: cookieJar })

        let $ = cheerio.load(loginGet.data)

        var form
        if (shouldHash) {
            const formData = {
                ...parseInitialFormData($),
                ...parseSelector($),
                txtUserName: username,
                txtPassword: md5(password),
                btnSubmit: 'Đăng nhập',
            }
            form = qs.stringify(formData)
        } else {
            const formData = {
                ...parseInitialFormData($),
                ...parseSelector($),
                txtUserName: username,
                txtPassword: password,
                btnSubmit: 'Đăng nhập',
            }
            form = qs.stringify(formData)
        }

        const config = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) coc_coc_browser/76.0.114 Chrome/70.0.3538.114 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            withCredentials: true,
            jar: cookieJar,
        }

        const loginPost = await axios.post(loginUrl, form, config)

        $ = cheerio.load(loginPost.data)
        const userFullName = $('#PageHeader1_lblUserFullName').text().toLowerCase()
        const wrongPass = $('#lblErrorInfo').text()

        if (wrongPass == 'Bạn đã nhập sai tên hoặc mật khẩu!' || wrongPass == 'Tên đăng nhập không đúng!') {
            var result = {
                message: "Sai ten dang nhap hoac mat khau"
            }
            return JSON.stringify(result);
        }

        if (userFullName == 'khách') {
            return JSON.stringify("Please login again!");
        }

        if (mode == AUTH) {
            var result = {
                message: "Login successfully"
            }
            return JSON.stringify(result)
        }

        let schedule = await listSchedule(cookieJar)

        if (schedule.code != OK) {
            console.log(schedule.message)
        } else {
            if (mode == PROFILE) {
                const res = await axios.get(studentProfileUrl, { withCredentials: true, jar: cookieJar })

                $ = cheerio.load(res.data)
                const displayName = ($('input[name="txtHoDem"]').val() || '') + ' ' + ($('input[name="txtTen"]').val() || '')
                const studentCode = $('input[name="txtMaSV"]').val() || ''
                const gender = $('select[name="drpGioiTinh"] > option[selected]').text()
                const birthday = $('input[name="txtNgaySinh"]').val() || ''
                const information = {
                    message: schedule.message,
                    displayName,
                    studentCode,
                    gender,
                    birthday,
                }

                return JSON.stringify(information)

            } else if (mode == SCHEDULE) {
                var periods = []
                schedule.data.forEach(displaySchedule)

                function displaySchedule(item, index, arr) {
                    var period = {
                        id: index,
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
                    message: schedule.message,
                    periods: periods
                }

                return JSON.stringify(result)

            }
        }
    } catch (e) {
        console.log(e)
    }
}

const router = server => {
    server.get("/", function (req, res) {
        res.writeHead(301, {
            Location: `https://github.com/cuocdart18/kma-schedule-api`
          }).end();
    })

    server.get("/schedule", function (req, res) {
        var username = req.query.username
        var password = req.query.password
        var shouldHash = true
        if (req.query.hashed == 'true') {
            shouldHash = false;
        }
        let result = main({ username, password }, SCHEDULE, shouldHash)
        result.then(function (r) {
            res.send(r)
            res.end()
        })
    })

    server.get("/profile", function (req, res) {
        var username = req.query.username
        var password = req.query.password
        var shouldHash = true
        if (req.query.hashed == 'true') {
            shouldHash = false;
        }
        let result = main({ username, password }, PROFILE, shouldHash)
        result.then(function (r) {
            res.send(r)
            res.end()
        })
    })

    server.get("/auth", function (req, res) {
        var username = req.query.username
        var password = req.query.password
        var shouldHash = true
        if (req.query.hashed == 'true') {
            shouldHash = false;
        }
        let result = main({ username, password }, AUTH, shouldHash)
        result.then(function (r) {
            res.send(r)
            res.end()
        })
    })
}

module.exports = router;