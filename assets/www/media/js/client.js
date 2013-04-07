function Client() {};

Client.prototype.init = function() {
    var client = this;
    this.state = {};
    this.events = _.extend({}, Backbone.Events);
    this.data = {
        rooms: new RoomsCollection
    }
    this.view = new ClientView({
        client: this
    });
    this.listenGUI();
    this.events.trigger('views:show', 'login');
};

Client.prototype.listenGUI = function() {
    this.events.on('client:login', this.login, this);
};

Client.prototype.listenSocket = function() {
    var self = this;
    if (this.state.listenSocket) {
        return;
    }
    this.socket.on('connect', function() {
        self.socket.emit('rooms:get');
        console.log('connected');
    });
    this.socket.on('user:whoami', function(profile) {
        console.log('whoami');
    });
    this.socket.on('user:update', function(profile) {
        console.log('user:update');
    });
    this.socket.on('room:messages:new', function(message) {
        console.log('room:messages:new');
    });
    this.socket.on('room:users:new', function(user) {
        console.log('room:users:new');
    });
    this.socket.on('room:users:leave', function(user) {
        console.log('room:users:leave');
    });
    this.socket.on('room:remove', function(id) {
        console.log('room:remove')
    });
    this.socket.on('room:update', function(data) {
        console.log('room:update');
    });
    this.socket.on('rooms:new', function(room) {
        self.data.rooms.add(room);
        self.socket.emit('room:join', room.id);
    });
    this.socket.on('rooms:remove', function(id) {
        self.data.rooms.remove(id);
    });
    this.socket.on('rooms:users:new', function(user) {
        console.log('rooms:users:new');
    });
    this.socket.on('rooms:users:leave', function(user) {
        console.log('rooms:users:leave');
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
            self.events.trigger('client:login:error', err);
        });
        this.socket.once('connect', function() {
            self.state.authenticated = true;
            self.connect(connectionURL.toString(), false);
            self.events.trigger('client:login:success');
            self.events.trigger('views:show', 'room-list');
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