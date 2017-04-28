/**
 * @file MMM-syslog-slave-socket.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-syslog-slave
 */

/* global io */

/**
 * @external io
 * @see https://www.npmjs.com/package/socket.io-client
 */

/**
 * @module MMM_syslog_slave_socket
 * @description Manipulated websocket to connect to master.
 *
 * @param {string} moduleName - Name of the MagicMirror module.
 * @param {string} master - Web address of master.
 *
 * @requires external:io
 *
 * @throws {Error} Error gets thrown if moduleName isn't a string.
 *
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/socketclient.js
 */
// eslint-disable-next-line camelcase, no-unused-vars, func-names
const MMM_syslog_slave_socket = function (moduleName, master) {
    if (typeof moduleName !== 'string') {
        throw new Error('Please set the module name for the MMM_syslog_slave_socket.');
    }

    /** @member {string} moduleName - Name of the MagicMirror module. */
    this.moduleName = moduleName;

    /** @member {io} socket - Socket connection to master. */
    this.socket = io(`${master}/MMM-syslog`);
    let notificationCallback = () => {};

    const onevent = this.socket.onevent;
    this.socket.onevent = function (packet) { // eslint-disable-line func-names
        const args = packet.data || [];
        onevent.call(this, packet); // original call
        packet.data = ['*'].concat(args); // eslint-disable-line no-param-reassign
        onevent.call(this, packet); // additional call to catch-all
    };

    // register catch all.
    this.socket.on('*', (notification, payload) => {
        if (notification !== '*') {
            notificationCallback(notification, payload);
        }
    });

    /**
     * @callback notificationCallback
     * @param {string} notification - Notification name
     * @param {*} payload - Notification data
     */

    /**
     * @function setNotificationCallback
     * @description Sets notification callback for receiving notifications.
     *
     * @param {notificationCallback} callback - New callback
     */
    this.setNotificationCallback = (callback) => {
        notificationCallback = callback;
    };

    /**
     * @function sendNotification
     * @description Sends notification to master.
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Notification data
     */
    this.sendNotification = (notification, payload) => {
        this.socket.emit(notification, payload || {});
    };
};
