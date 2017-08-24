## Stream Example App

This example Node.js app shows you how you can use [GetStream.io](https://getstream.io/ "GetStream.io") to built a site similar to Pinterest.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

### Install
	npm install

### Prepare ###
You'll need a mongodb instance running in the background.

Example using [Homebrew](https://brew.sh/) on MacOS

	brew install mongodb
	mkdir data
	mongod --dbpath=./data
	
Or set up the URI to a remote one by modifying **config/config.js**.

### Load initial data
The app needs some initial data in order to function correctly. Run this script to load it:

	./after_deploy.js

### Run

	npm start

### Using GitHub to Sign/Log in
Initially, the app starts with the authentication user mocked, if you want to sign in and out using your GitHub account, you'll need to set up a GitHub app and modify **config/config.js** to use your app's client credentials.

You will also need to comment out in **app.js**, the middleware that mocks the authentication process like so:

	// app.use(passport_mock.initialize());
	app.use(passport.initialize());
	app.use(passport.session());
