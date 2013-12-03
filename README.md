connect-traversal
=================

connect-traversal is a middleware for Connect and Express framework that allows to use URL traversal instead of URL dispatching.

Traversal mechanism is more powerful then Url dispatching and used in popular frameworks such as Rails, Pyramid.

Example of usage:

Use middleware:

```
var traversal = ('connect-traversal');

app.use(traversal.middleware);


```

Register resources:

```
/*
Resource {req, parent, name}
*/
var rootResource = {
  children: ['users', 'news']
}

var usersResource = {
  child: ['user'],
  childValidate: function(name) {
    return !!name.match(/\d+/);
  },
  createUser: function() {
    //do something...  
  }
}

var userResource = {
  children: ['news'],
  getId: function() {
    return parseInt(this.name);
  },
  deleteUser: function() {
    //do something...  
  },
  getUser: function() {
    //get user by id... 
  }
}

var newsResource = {
  getNews: function() {
    if (this.parent.__resource__ == 'user') {
      // parent resource is UserResource
      var user = this.parent.getId()
      // get news for user...
    } else {
      // parent resource is RootResource
      // get common news for all users...
    }
  }
}


traverse.registerResource('root', rootResource);
traverse.registerResource('users', usersResource);
traverse.registerResource('user', userResource);
traverse.registerResource('news', newsResource);
```

Finally register path for each resource. For filtering can be used *HTTP method*, *parent resource name* and *path name* - next part of url after resources chain.


```
// GET /users/user/123
traverse.registerPath('user', {method: 'get'}, function(req, res) {
  var userResource = req.resource //UserResource for user 123
  
  var parent = resource.parent //UsersResource
  parent.createUser({id: '222'});
  var anotherUserResource = parent.get('222'); //UserResource for user 222
});

// GET /users/users/create
traverse.registerPath('users', {method: 'post', name: 'create'}, function(req, res) {
  // req.path_name = 'create'
  var resource = req.resource //UsersResource
});

// GET /users/users/random/222/333
traverse.registerPath('users', {method: 'post', name: 'random'}, function(req, res) {
  // req.path_name = 'random'
  // req.subpath = ['222', '333']
  var resource = req.resource //UsersResource
  res.send('users');
});

// GET /news
// GET /users/123/news
traverse.registerPath('news', {method: 'get'}, function(req, res) {
  req.parent // RootResource
  var resource = req.resource //NewsResource
  res.send(resource.getNews());
});
```



