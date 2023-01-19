API for KMA Schedule
## API

### GET
- /schedule   get schedule time table
- /profile    get profile inforrmation
  
- *params:*
  - username
  - password
  - hashed
- ***Ex:***
  - /profile?username=CT050413&password=mypassword&hashed=false
  - /schedule?username=CT050413&password=34819d7beeabb9260a5c854bc85b3e44&hashed=true
  
***Note: mã hoá được sử dụng là MD5***
  
## Result
  
### Username or password is empty
  
{"message":"Thiếu tên đăng nhập hoặc mật khẩu"}
  
### Username or password is incorrect
  
{"message":"Sai tên đăng nhập hoặc mật khẩu"}
  
### Success

## Deployment: Vercel

- **URL:** https://kma-schedule-api.vercel.app/
