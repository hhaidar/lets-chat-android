var LCBView = Backbone.View.extend({
    setvars: function() {
        this.client = this.options.client;
    }
});

var ViewChangerView = LCBView.extend({
    el: '.views',
    initialize: function() {
        this.listen();
    },
    listen: function() {
        this.setvars();
        var self = this;
        this.client.events.on('views:show', this.show, this);
    },
    show: function(id) {
        var $view = this.$('.view').filter('[data-id="' + id + '"]');
        if ($view.length > 0) {
            $view.siblings('.view').hide();
            $view.show();
        }
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

var RoomListView = LCBView.extend({
    el: '.lcb-view-room-list',
    initialize: function() {
        this.setvars();
        this.rooms = this.client.data.rooms;
        this.template = Handlebars.compile($('#template-room-list-item').html());
        this.listen();
    },
    listen: function() {
        var self = this;
        this.rooms.on('add', this.add, this);
        this.rooms.on('remove', this.remove, this);
    },
    add: function(room) {
        var room = room.toJSON();
        this.$('.rooms').append(this.template(room));
    },
    remove: function(room) {
        var room = room.toJSON();
        this.$('.room').filter('[data-id=' + room.id + ']').remove();
    }
});

var ClientView = LCBView.extend({
    el: 'html',
    initialize: function() {
        this.setvars();
        this.views = {
            'viewChanger': new ViewChangerView({
                client: this.client
            }),
            'login': new LoginView({
                client: this.client
            }),
            'roomList': new RoomListView({
                client: this.client
            })
        }
    }
});