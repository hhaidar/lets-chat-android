var LCBView = Backbone.View.extend({
    setvars: function() {
        this.client = this.options.client;
    }
});

var LoginView = LCBView.extend({
    el: '.lcb-view-login',
    events: {
        'submit form': 'login'
    },
    initialize: function() {
        this.setvars();
        var config = store.get('config');
        if (config) {
            this.$('[name=url]').val(config.url);
            this.$('[name=email]').val(config.username);
        }
        this.listen();
    },
    listen: function() {
        var self = this;
        this.client.events.on('client:login:success', function() {
            self.response('<i class="icon-star icon-spin"></i> Signing you in...', 'success', true);
        });
        this.client.events.on('client:login:error', function(err) {
            self.response(err, 'error');
        });
    },
    login: function(e) {
        var self = this;
        e.preventDefault();
        this.response('<i class="icon-star icon-spin"></i> Connecting...', false, true);
        this.client.events.trigger('client:login', {
            url: this.$('[name=url]').val(),
            username: this.$('[name=email]').val(),
            password: this.$('[name=password]').val()
        });
    },
    response: function(message, status, html) {
        var $response = this.$('.response');
        this.$('.response')
          .empty()
          .removeClass('success error')
          .addClass(status);
        html ? this.$('.response').html(message) : this.$('.response').text(message);
    }
});

var ClientView = LCBView.extend({
    el: 'html',
    initialize: function() {
        this.setvars();
        this.views = {};
        this.views.login = new LoginView({
            client: this.client
        });
    }
});