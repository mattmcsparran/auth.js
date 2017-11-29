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


```
authConfig.conf(process.env.SECRET_JWT, process.env.SALTROUNDS, { expiresIn: '4h' });
```
Auth.js uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for tokens and follows auth0's formatting.

NOTE: Please make sure to configure ```dotenv``` before you configure auth.js, or your application will fail.

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

## Configuring user models/schemas and permissions

Auth.js has middleware capabilities that authorize and authenticate. For these to be done properly, some extra configuration has to be done.

First, we need to include the user model/schema in the application root.

For example, in ```app.js```, we can include the following:

```
const User = require('./models/user');
```
Next, we will need to set up a local variable in the application, in order for the middleware to use the model.

```
app.use((req, res, next) => {
  res.locals.User = User;
  next();
});
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


## Middleware serivce
Auth.js features a middleware to authenticate, authorize, and validate users, their permissions, and their tokens.

Currently, the middleware functions are ```verify``` and ```isAdmin```.

In the routes you want to authenticate and authorize, require the middleware.

```
const authMiddleware = require('auth.js/middleware');
```

After requiring it, place it in the routes as you would do for any other middleware.

```
router.post('/', [authMiddleware.verify, authMiddleware.isAdmin], userService.insert);
```

In the above example, the middleware is being used in a route that inserts users into a database. This is different from the typical registering users route.
### Verify Token
```
middleware.verify = (req, res, next) => {
  if (!req.headers.authorization) {
      return res.sendStatus(401);
      }
    j.verifyToken(req.headers.authorization, secretToken(), (err, verified) => {
      if (err) {
        return res.send(err).status(400);
      }
      req.user = verified.user;
      return next();
    });
}
```

The verify middleware uses the jwt verify function and takes the following parameters:

```
j.verifyToken(jwtToken, jwtSecret, callback)
```
The token should be placed in the headers in an authorization field, the jwt secret will be taken from your environment variables, and the callback sets the ```req.user``` field to an object with a value of verified user. You can choose to query your database to retrieve the most current information regarding a specific user in the route.

### isAdmin
```
middleware.isAdmin = (req, res, next) => {
  if (req.user) {
    res.locals.User.findById({_id: req.user._id}, (err, user) => {
      if (err) { return res.status(404).send(err); }
      if (user.role === 'admin') {
      return next();
      }
      return res.status(401).send('User not authorized');
    });
  }
}
```

The isAdmin middleware verifies whether the user making the request has administrative privileges. Since the example route inserts a new user into the database, it needs to be secured so only users with admin privileges can insert users. The reason for this, is the example route has more options that can be used when making a request.

The middleware checks to see if a req.user field is present, and if it is, it uses the User model to find the user making the request in the database, in order to verify that the role that is shown in the token, is the role they currently have.


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
