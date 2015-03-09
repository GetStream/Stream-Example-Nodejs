## Stream Example App

This example Node.js app shows you how you can use [GetStream.io](https://getstream.io/ "GetStream.io") to built a site similar to Pinterest.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

### Install
	npm install

### Run
	npm start

### Using GitHub to Sign/Log in
Initially, the app starts with the authentication user mocked, if you want to sign in and out using your GitHub account, you'll need to set up a GitHub and modify **config/config.js** to use the app's client credentials.

You will also need to commment out in **app.js** the middleware that doesn't mocks the authentication process:

	app.use(passport.initialize());
	// app.use(passport_mock.initialize());
	app.use(passport.session());
