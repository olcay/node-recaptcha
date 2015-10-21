/*!
 * node-recaptcha2
 * Copyright(c) 2015 Olcay Bayram
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var https        = require('https'),
    querystring = require('querystring');

/**
 * Constants.
 */

var API_HOST      = 'www.google.com',
    API_END_POINT = '/recaptcha/api/siteverify',
    SCRIPT_SRC    = API_HOST + '/recaptcha/api.js';

/**
 * Initialize Recaptcha with given `public_key`, `private_key` and optionally
 * `data`.
 *
 * The `data` argument should have the following keys and values:
 *
 *   remoteip:  The IP of the client who submitted the form.
 *   response:  The value of `recaptcha_response_field` from the Recaptcha
 *              form.
 *
 * @param {String} public_key Your Recaptcha public key.
 * @param {String} private_key Your Recaptcha private key.
 * @param {Object} data The Recaptcha data to be verified.  See above for
 *                      format.  (optional)
 * @api public
 */

var Recaptcha = exports.Recaptcha = function Recaptcha(public_key, private_key, data) {
    this.public_key = public_key;
    this.private_key = private_key;
    this.data = data;
    return this;
}

/**
 * Render the Recaptcha fields as HTML.
 *
 * If there was an error during `verify` and the selected Recaptcha theme
 * supports it, it will be displayed.
 *
 * @api public
 */

Recaptcha.prototype.toHTML = function() {
    var script_src = "https://" + SCRIPT_SRC;

    return '<script type="text/javascript" src="' + script_src + '"></script>' +
           '<div class="g-recaptcha" data-sitekey="' + this.public_key + '"></div>';
};

/**
 * Verify the Recaptcha response.
 *
 * Example usage:
 *
 *     var recaptcha = new Recaptcha('PUBLIC_KEY', 'PRIVATE_KEY', data);
 *     recaptcha.verify(function(success, error_code) {
 *         if (success) {
 *             // data was valid.  Continue onward.
 *         }
 *         else {
 *             // data was invalid, redisplay the form using
 *             // recaptcha.toHTML().
 *         }
 *     });
 *
 * @param {Function} callback
 * @api public
 */

Recaptcha.prototype.verify = function(callback) {
    var self = this;

    // See if we can declare this invalid without even contacting Recaptcha.
    if (typeof(this.data) === 'undefined') {
        this.error_code = 'verify-params-incorrect';
        return callback(false, 'verify-params-incorrect');
    }
    if (!('remoteip' in this.data &&
          'response' in this.data))
    {
        this.error_code = 'verify-params-incorrect';
        return callback(false, 'verify-params-incorrect');
    }
    if (this.data.response === '') {
        this.error_code = 'incorrect-captcha-sol';
        return callback(false, 'incorrect-captcha-sol');
    }

    // Add the private_key to the request.
    this.data['secret'] = this.private_key;
    var data_qs = querystring.stringify(this.data);

    var req_options = {
        host: API_HOST,
        path: API_END_POINT,
        port: 443,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data_qs.length
        }
    };

    var request = https.request(req_options, function(response) {
        var body = '';

        response.on('error', function(err) {
            self.error_code = 'recaptcha-not-reachable';
            callback(false, 'recaptcha-not-reachable');
        });

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            var success, error_code, parts;

            parts = JSON.parse(body);
            success = parts.success;
            error_code = parts.error_code;

            if (success !== true) {
                self.error_code = error_code;
            }
            return callback(success === true, error_code);
        });
    });
    request.write(data_qs, 'utf8');
    request.end();
};
