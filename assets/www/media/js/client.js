function Client() {};

Client.prototype.init = function() {
    var client = this;
    this.state = {};
    this.events = _.extend({}, Backbone.Events);
    this.data = {
        user: new UserModel,
        rooms: new RoomsCollection
    }
    this.view = new ClientView({
        client: this
    });
    this.listenGUI();
    this.route();
};

Client.prototype.route = function() {
    var self = this;
    var Router = Backbone.Router.extend({
        routes: {
            '!/rooms': 'rooms',
            '!/room/:id': 'room',
            '*path': 'login'
        },
        login: function() {
            if (self.state.authenticated) {
                this.navigate('!/rooms');
                return;
            }
            self.events.trigger('views:show', 'login');
        },
        rooms: function() {
            if (!self.state.authenticated) {
                this.navigate('!/', true);
                return;
            }
            self.events.trigger('views:show', 'room-list');
        },
        room: function(id) {
            if (!self.state.authenticated) {
                this.navigate('!/', true);
                return;
            }
            self.events.trigger('views:show', id);
        }
    });
    this.router = new Router;
    Backbone.history.start();
};

Client.prototype.listenGUI = function() {
    var self = this;
    this.events.on('client:pause', function() {
        self.state.paused = true;
    });
    this.events.on('client:resume', function() {
        self.state.paused = false;
    });
    this.events.on('client:login', this.login, this);
    this.events.on('room:message:send', function(message) {
        self.socket.emit('room:messages:new', message);
    });
    this.events.on('room:message:new', function(message) {
        if (!client.state.paused) {
            return;
        }
        if (message.text.match(new RegExp('\\@' + self.data.user.get('safeName') + '\\b', 'g'))) {
            console.log(message.text.match(new RegExp('\\@' + self.data.user.get('safeName') + '\\b', 'ig')));
            window.plugins.statusBarNotification.notify('Mentioned by ' + message.name, message.text);
        }
    })
};

Client.prototype.listenSocket = function() {
    var self = this;
    if (this.state.listenSocket) {
        return;
    }
    this.socket.on('connect', function() {
        self.socket.emit('user:whoami');
        self.socket.emit('rooms:get');
    });
    this.socket.on('user:whoami', function(profile) {
        self.data.user.set(profile);
    });
    this.socket.on('user:update', function(profile) {
    });
    this.socket.on('room:messages:new', function(data) {
        if ($.isArray(data)) {
            _.each(data, function(message) {
                var room = self.data.rooms.get(message.room);
                room.messages.add(message, {
                    silent: true
                });
                room.messages.trigger('addsoftly', message);
            });
        } else {
            var room = self.data.rooms.get(data.room);
            room.messages.add(data);
            self.events.trigger('room:message:new', data);
        }
    });
    this.socket.on('room:users:new', function(user) {
    });
    this.socket.on('room:users:leave', function(user) {
    });
    this.socket.on('room:remove', function(id) {
    });
    this.socket.on('room:update', function(data) {
    });
    this.socket.on('rooms:new', function(room) {
        self.data.rooms.add(room);
        self.socket.emit('room:join', room.id);
        self.socket.emit('room:messages:get', {
            room: room.id
        });
    });
    this.socket.on('rooms:remove', function(id) {
        self.data.rooms.remove(id);
    });
    this.socket.on('rooms:users:new', function(user) {
    });
    this.socket.on('rooms:users:leave', function(user) {
    });
    this.state.listenSocket = true;
};

Client.prototype.login = function(creds) {
    var self = this;
    store.set('config', {
        url: creds.url,
        username: creds.username
    });
    try {
        var connectionURL = URI(creds.url).search({
            username: creds.username,
            password: creds.password
        });
        if (!connectionURL.is('url') || !connectionURL.is('absolute')) {
            throw 'Invalid URL';
        }
        this.connect(connectionURL.toString(), true);
        this.socket.once('error', function(err) {
            self.state.authenticated = false;
            self.events.trigger('client:login:error', err || 'Connection failed');
        });
        this.socket.once('connect', function() {
            self.state.authenticated = true;
            self.connect(connectionURL.toString(), false);
            self.events.trigger('client:login:success');
            self.router.navigate('!/rooms', true);
        });
    } catch(e) {
       this.events.trigger('client:login:error', e);
    }
};

Client.prototype.connect = function(url, once) {
    if (once) {
        this.disconnect();
        this.socket = io.connect(url, {
            reconnect: true,
            'force new connection': true
        });
        this.socket.once('connect', function() {
            this.disconnect();
        })
        return;
    }
    this.socket = io.connect(url, {
        reconnect: true,
        'force new connection': false
    });
    this.listenSocket();
}

Client.prototype.disconnect = function() {
    if (this.socket && this.socket.socket.connected) {
        this.socket.disconnect();
        return true;
    }
    return false;
};

$(function() {
    window.client = new Client;
    window.client.init();
});