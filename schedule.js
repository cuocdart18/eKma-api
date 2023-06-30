const axios = require("axios").default
const cheerio = require("cheerio")
const utils = require('./utils')
const qs = require('query-string')
const parser = require("./parser")

module.exports = async (cookieJar, drpSemester) => {

	axios.defaults.jar = cookieJar
	axios.defaults.withCredentials = true
	axios.defaults.crossdomain = true

	let url = `http://qldt.actvn.edu.vn/CMCSoft.IU.Web.Info/Reports/Form/StudentTimeTable.aspx`

	try {
		let res = await axios.get(url)

		const $ = cheerio.load(res.data)
		const selectorData = utils.parseSelector($)
		const initialFormData = utils.parseInitialFormData($)
		// selectorData.drpTerm = 1
		selectorData.drpSemester = drpSemester
		selectorData.drpType = 'B'
		selectorData.btnView = "Xuất file Excel"

		let formData = {
			...initialFormData,
			...selectorData
		}

		var form = qs.stringify(formData)
		const config = {
			responseType: 'arraybuffer',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
			},
		}
		let file = await axios.post(url, form, config)

		let { scheduleData } = await parser(file.data)

		let re = {
			code: 200,
			message: 'Thành Công',
			data: scheduleData
		}

		return Promise.resolve(re)
	} catch (err) {

		let re = {
			code: 400,
			message: err
		}

		return Promise.reject(re)
	}
}