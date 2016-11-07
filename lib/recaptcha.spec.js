var Recaptcha = require('./recaptcha').Recaptcha;
var request   = require('request');
var expect    = require('chai').expect;
var _         = require('underscore');

describe('recaptcha:', function () {
    var recaptcha;
    var data;

    describe('constructor', function () {
        it('should construct a recaptcha instance', function () {
            data = {
                remoteip:  '127.0.0.1',
                challenge: 'challenge',
                response:  'good_response'
            };
            recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);

            expect(recaptcha).to.have.property('public_key').and.to.equal('PUBLIC');
            expect(recaptcha).to.have.property('private_key').and.to.equal('PRIVATE');
            expect(recaptcha).to.have.property('data');
            expect(recaptcha.data).to.have.property('remoteip').and.to.equal('127.0.0.1');
            expect(recaptcha.data).to.have.property('challenge').and.to.equal('challenge');
            expect(recaptcha.data).to.have.property('response').and.to.equal('good_response');
        });
    });

    describe('toHTML()', function () {
        it('should return valid html', function () {
            recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', {});
            var html = recaptcha.toHTML();

            expect(html).to.equal('<script type="text/javascript" src="https://www.google.com/recaptcha/api.js"></script><div class="g-recaptcha" data-sitekey="PUBLIC"></div>');
        });
    });

    describe('verify()', function () {
        describe('with correct data', function () {
            it('should verify with error', function (done) {
                data = {
                    remoteip:  '127.0.0.1',
                    challenge: 'challenge',
                    response:  'good_response'
                };

                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);
                recaptcha.verify = mockVerify;

                recaptcha.verify(function (success, errorCode) {
                    expect(success).to.equal(true);
                    expect(errorCode).to.equal(undefined);
                    expect(recaptcha.error_code).to.equal(undefined);

                    done();
                });
            });
        });

        describe('with incorrect data', function () {
            it('should verify successfully', function (done) {
                data = {
                    remoteip:  '127.0.0.1',
                    challenge: 'challenge',
                    response:  'bad_response'
                };

                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);
                recaptcha.verify = mockVerify;

                recaptcha.verify('bad', function (success, errorCode) {
                    expect(success).to.equal(false);
                    expect(errorCode).to.equal('incorrect-captcha-sol');
                    expect(recaptcha.error_code).to.equal('incorrect-captcha-sol');

                    done();
                });
            });
        });

        describe('with no data', function () {
            it('should return with error', function (done) {
                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE');
                recaptcha.verify = mockVerify;
                recaptcha.verify(function (success, errorCode) {
                    expect(success).to.equal(false);
                    expect(errorCode).to.equal('verify-params-incorrect');
                    expect(recaptcha.error_code).to.equal('verify-params-incorrect');

                    done();
                });
            });
        });

        describe('with missing data.challenge', function () {
            it('should return with error', function (done) {
                data = {
                    remoteip : '127.0.0.1',
                    response : 'response'
                };
                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);
                recaptcha.verify = mockVerify;
                recaptcha.verify(function (success, errorCode) {
                    expect(success).to.equal(false);
                    expect(errorCode).to.equal('verify-params-incorrect');
                    expect(recaptcha.error_code).to.equal('verify-params-incorrect');

                    done();
                });
            });
        });

        describe('with missing data.remoteip', function () {
            it('should return with error', function (done) {
                data = {
                    challenge: 'challenge',
                    response : 'response'
                };
                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);
                recaptcha.verify = mockVerify;
                recaptcha.verify(function (success, errorCode) {
                    expect(success).to.equal(false);
                    expect(errorCode).to.equal('verify-params-incorrect');
                    expect(recaptcha.error_code).to.equal('verify-params-incorrect');

                    done();
                });
            });
        });

        describe('with missing data.response', function () {
            it('should return with error', function (done) {
                data = {
                    remoteip : '127.0.0.1',
                    challenge : 'challenge'
                };
                recaptcha = new Recaptcha('PUBLIC', 'PRIVATE', data);
                recaptcha.verify = mockVerify;
                recaptcha.verify(function (success, errorCode) {
                    expect(success).to.equal(false);
                    expect(errorCode).to.equal('verify-params-incorrect');
                    expect(recaptcha.error_code).to.equal('verify-params-incorrect');

                    done();
                });
            });
        });
    });
});

function mockVerify(requestType, callback) {
    if (_.isFunction(requestType) && !callback) {
        callback = requestType;
        requestType = 'good';
    }

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
    if (!this.data.challenge) {
        this.error_code = 'verify-params-incorrect';
        return callback(false, 'verify-params-incorrect');
    }

    // Add the private_key to the request.
    this.data['secret'] = this.private_key;

    var req_data = {
        method  : 'POST',
        baseUrl : 'https://www.google.com/recaptcha/api/siteverify',
        uri     : '',
        form    : this.data
    };

    if (requestType === 'bad') {
        fakeBadRequest();
        this.error_code = 'incorrect-captcha-sol';
        callback(false, 'incorrect-captcha-sol');

    } else {
        fakeGoodRequest();
        callback(true, undefined);
    }

    function fakeGoodRequest() {
        expect(req_data).to.have.property('method').and.to.equal('POST');
        expect(req_data).to.have.property('baseUrl').and.to.equal('https://www.google.com/recaptcha/api/siteverify');
        expect(req_data).to.have.property('uri').and.to.equal('');
        expect(req_data).to.have.property('form');
        expect(req_data.form).to.have.property('remoteip').and.to.equal('127.0.0.1');
        expect(req_data.form).to.have.property('challenge').and.to.equal('challenge');
        expect(req_data.form).to.have.property('response').and.to.equal('good_response');
        expect(req_data.form).to.have.property('secret').and.to.equal('PRIVATE');
    }

    function fakeBadRequest() {
        expect(req_data).to.have.property('method').and.to.equal('POST');
        expect(req_data).to.have.property('baseUrl').and.to.equal('https://www.google.com/recaptcha/api/siteverify');
        expect(req_data).to.have.property('uri').and.to.equal('');
        expect(req_data).to.have.property('form');
        expect(req_data.form).to.have.property('remoteip').and.to.equal('127.0.0.1');
        expect(req_data.form).to.have.property('challenge').and.to.equal('challenge');
        expect(req_data.form).to.have.property('response').and.to.not.equal('good_response');
        expect(req_data.form).to.have.property('secret').and.to.equal('PRIVATE');
    }
}