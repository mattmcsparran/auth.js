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
authConfig.conf(secret, saltRounds, expire);
```
There only two options that have defaults are ```saltRounds``` and ```expire```, which are ```16``` and ```{ expiresIn: '4h' }``` respectively.

The recommended configuration is to use ```dotenv``` to place the JWT secret and salt rounds in the ```.env``` file as seen in the example below.

```
authConfig.conf(process.env.SECRET_JWT, process.env.SALTROUNDS, { expiresIn: '4h' });
```
Auth.js uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for its tokens, so all expiration time formats for the tokens are the same.

## Configuring auth.js to work with mongoose
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
  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      res.status(err.code).send(err.body)
    }
    res.status(200).json(user);
  });
  ```
## Error handling
In the last example, you can see that auth.js handles its own errors and other messages. Messages are stored in a message object:
  
  ```
messages = {
  body: '',
  type: '',
  code: ''
}
```
The module will use pre determined error messages and codes, and will send what type of message it is (currently: success or error) which will also allow you to utilize alerts on your front end.

