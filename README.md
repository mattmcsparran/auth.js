[![npm version](https://img.shields.io/npm/v/auth.js.svg)](https://www.npmjs.com/package/auth.js)
[![npm](https://img.shields.io/npm/dt/auth.js.svg)](https://www.npmjs.com/package/auth.js)

# auth.js
A simple authentication and authorization module for building APIs when using front-end frameworks
## Getting Started

Installing via npm:
```
npm i --save auth.js
```

Adding the module to your project:

```
const auth = require('auth.js');
const authConfig = require('auth.js/lib/config');
```

## Configuring the variables
The configuration function is as follows
```
dotenv.load({ path: '.env' });
authConfig.conf(secret, saltRounds, expire);
```
There only two options that have defaults are ```saltRounds``` and ```expire```, which are ```16``` and ```{ expiresIn: '1h' }``` respectively.

The recommended configuration is to use ```dotenv``` to place the JWT secret and salt rounds in the ```.env``` file as seen in the example below.

NOTE: Please make sure to configure ```dotenv``` before you configure auth.js, or your application will fail.
```
authConfig.conf(process.env.SECRET_JWT, process.env.SALTROUNDS, { expiresIn: '4h' });
```
Auth.js uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for tokens and follows auth0's formatting.

## Configuring auth.js with mongoose
Require it in your user schema like so:

```
const mongoose = require("mongoose");
const auth = require('auth.js');

const UserSchema = new mongoose.Schema({
    username: String,
    password: String
});

UserSchema.plugin(auth)
module.exports = mongoose.model("User", UserSchema);
```

## Using auth.js in your routes
Require it in your route.

Here is a example of the registration method:

```
service.register = (req, res) => {
  const newUser = new User({username: req.body.username, email: req.body.email});
  User.register(newUser, req.body.password, (err, user, msg) => {
    if (err) {
      console.log('error recieved: ' + err.body + ' ' + err.code);
      res.status(err.code).send(err.body)
    }
    console.log(msg.type + ' recieved!' + ' ' + msg.body);
    res.status(msg.code).json({user, message: msg });
  });
}
  ```

  And an example of the login method:

  ```
service.login = (req, res) => {
  User.findOne({username: req.body.username}, (err, user) => {
    if (!user) {
      return res.sendStatus(403);
    }
    if (err) {
      return res.status(err.code).send(err.body);
    }
    User.login(req.body.username, req.body.password, (err, token, msg) => {
      if (err) {
        return res.status(err.code).send(err.body);
      }
      console.log(msg.type + ' recieved!' + ' ' + msg.body);
      res.status(msg.code).json({ token: token, message: msg });
    });
  });
}
  ```
Note: console.log()'s are being used for tracking purposes until a better logging system is implemented.

## Error handling
In the example above, you can see that auth.js handles its own errors and other messages. Messages are stored in a message object:

  ```
messages = {
  body: '',
  type: '',
  code: ''
}
```
The module will use pre determined error messages and HTTP codes. It will also send what type of message it is (currently: success or error) which will also allow you to utilize alerts on your front end.
