var LCBView = Backbone.View.extend({
    setvars: function() {
        this.client = this.options.client;
    }
});

var ViewManagerView = LCBView.extend({
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
            $view.siblings('.view').removeClass('current');
            $view.addClass('current');
        }
    }
});

var RoomView = LCBView.extend({
    lastMessageUser: false,
    scrollLocked: true,
    events: {
        'click .entry .send': 'sendMessage',
        'keypress .entry [name="talk"]': 'sendMessage',
        'taphold .message .avatar': 'addMention'
    },
    initialize: function() {
        this.setvars();
        this.template = Handlebars.compile($('#template-room').html());
        this.messageTemplate = Handlebars.compile($('#template-message').html());
        this.fragmentTemplate = Handlebars.compile($('#template-message-fragment').html());
        this.render();
        this.listen();
    },
    render: function() {
        var self = this;
        var room = this.model.toJSON();
        this.$el
            .addClass('lcb-view-room view room')
            .attr('data-id', room.id)
            .html(this.template(room))
            .appendTo($('.views'));
        this.$messages = this.$('.messages');
        this.$messages.on('scroll', function() {
            self.updateScrollLock();
        });
    },
    listen: function() {
        var self = this;
        this.model.messages.on('add', this.addMessage, this);
        this.model.messages.on('addsoftly', this.addMessageSoftly, this);
    },
    updateScrollLock: function() {
        this.scrollLocked = this.$messages[0].scrollHeight -
          this.$messages.scrollTop() - 5 <= this.$messages.outerHeight();
        return this.scrollLocked;
    },
    scrollMessagesDown: function(debounce) {
        var self = this;
        var scrollDown = function() {
            self.$messages.prop({
                scrollTop: self.$messages.prop('scrollHeight')
            });
        };
        if (!debounce) {
            return scrollDown();
        }
        if (!this.debouncedScrollDown) {
            this.debouncedScrollDown = _.debounce(function(debounce) {
                scrollDown();
            }, 40);
        }
        return this.debouncedScrollDown(debounce);
    },
    formatContent: function(text) {
        return window.utils.message.format(text, false, this.client.data.user.get('safeName'));
    },
    addMessageSoftly: function(message) {
        this.addMessage(message, true);
    },
    addMessage: function(message, debounce) {
        var message = message.toJSON ? message.toJSON() : message;
        message.fragment = this.lastMessageUser === message.owner;
        message.own = this.client.data.user.id === message.owner;
        message.paste = message.text.match(/\n/ig) || false;
        if (!message.fragment) {
            this.$messages.append(this.messageTemplate(message));
        }
        this.$messages.find('.message:last .fragments')
          .append(this.fragmentTemplate(message));
        var $text = this.$messages
          .find('.message:last .fragment:last').find('.text');
        $text.html(this.formatContent($text.html()));
        this.lastMessageUser = message.owner;
        if (this.scrollLocked) {
            this.scrollMessagesDown(debounce);
        }
    },
    sendMessage: function(e) {
        if (e.type === 'keypress' && e.keyCode !== 13 || e.altKey) return;
        e.preventDefault();
        var $textarea = this.$('.entry [name="talk"]');
        this.client.events.trigger('room:message:send', {
            room: this.model.id,
            text: $.trim($textarea.val())
        });
        $textarea.val('');
    },
    addMention: function(e) {
        e.preventDefault();
        var $input = this.$('.entry [name="talk"]');
        var name = $(e.currentTarget)
          .closest('.message')
          .find('.name').text().replace(/\W/g, '');
        $input.val($.trim($input.val() + ' @' + name) + ' ');
    }
});

var RoomManagerView = LCBView.extend({
    initialize: function() {
        this.setvars();
        this.views = {};
        this.rooms = this.client.data.rooms;
        this.listen();
    },
    listen: function() {
        var self = this;
        this.client.events.on('views:show', this.update, this);
        this.rooms.on('add', this.add, this);
    },
    add: function(room) {
        this.views[room.id] = new RoomView({
            model: room,
            client: this.client
        });
    },
    update: function(id) {
        if (this.views[id] && this.views[id].scrollMessagesDown) {
            this.views[id].scrollMessagesDown();
        }
    }
});

var LoginView = LCBView.extend({
    el: '.lcb-view-login',
    events: {
        'tap .login-button': 'submit',
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
    submit: function(e) {
        e.preventDefault();
        this.$('form').submit();
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
        this.$('.room-item').filter('[data-id=' + room.id + ']').remove();
    }
});

var ClientView = LCBView.extend({
    el: 'html',
    events: {
        'tap a[href][data-tap]': 'open'
    },
    initialize: function() {
        this.setvars();
        this.views = {
            'viewManager': new ViewManagerView({
                client: this.client
            }),
            'login': new LoginView({
                client: this.client
            }),
            'roomList': new RoomListView({
                client: this.client
            }),
            'roomManager': new RoomManagerView({
                client: this.client
            })
        }
    },
    open: function(e) {
        e.preventDefault();
        var $target = $(e.currentTarget);
        location.hash = $target.attr('href');
    }
});