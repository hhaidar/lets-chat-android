$(function() {
    var config = store.get('config');
    if (config) {
        $('[name=url]').val(config.url);
        $('[name=email]').val(config.email);
    }
    $('form').submit(function(e) {
        e.preventDefault();
        $('.response').empty()
          .removeClass('success error')
          .html('<i class="icon-star icon-spin"></i> Connecting...');
        var url = $('[name=url]').val();
        var email = $('[name=email]').val();
        var password = $('[name=password]').val();
        store.set('config', {
            url: url,
            email: email
        });
        var connectionURL = URI(url).search({
            username: email,
            password: password
        }).toString();
        try {
            var socket = io.connect(connectionURL, {
                reconnect: false,
                'force new connection': true
            });
            socket.on('error', function(err) {
                console.log(err);
                $('.response').empty()
                  .text('Failed to connect')
                  .removeClass('success')
                  .addClass('error');
            });
            socket.once('connect', function() {
                $('.response').empty()
                  .text('Fuck yes, authenticated!')
                  .removeClass('error')
                  .addClass('success');
                socket.disconnect();
            });
            socket.once('disconnect', function(reason) {
                console.log('disconnected');
            });
        } catch(e) {
            $('.response').empty()
              .text('There was an error communicating with the server')
              .removeClass('success')
              .addClass('error');
        }
    });
});