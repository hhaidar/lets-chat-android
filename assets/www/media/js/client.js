function Client() {};

Client.prototype.init = function() {
    var client = this;
    this.events = _.extend({}, Backbone.Events);
    this.view = new ClientView({
        client: this
    });
    this.listen();
};

Client.prototype.listen = function() {
    this.events.on('client:login', this.login, this);
}

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
        this.connect(connectionURL.toString());
        this.socket.once('error', function(err) {
            self.events.trigger('client:login:error', err);
        });
        this.socket.once('connect', function() {
            self.events.trigger('client:login:success');
        });
        this.socket.once('disconnect', function(reason) {
            console.log('disconnected');
        });
    } catch(e) {
       this.events.trigger('client:login:error', e);
    }
};

Client.prototype.connect = function(url) {
    this.disconnect();
    this.socket = io.connect(url, {
        reconnect: true,
        'force new connection': true
    });
}

Client.prototype.disconnect = function() {
    if (this.socket && this.socket.socket.connected) {
        this.socket.disconnect();
        return true;
    }
    return false;
};

$(function() {
    var client = new Client;
    client.init();
});