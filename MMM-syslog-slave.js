/**
 * @file MMM-syslog-slave.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-syslog-slave
 */

/* global Module Log moment config MMM_syslog_slave_socket */

/**
 * @external Module
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/module.js
 */

/**
 * @external Log
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/logger.js
 */

/**
 * @external moment
 * @see https://www.npmjs.com/package/moment
 */

/**
 * @external config
 * @see https://github.com/MichMich/MagicMirror/blob/master/config/config.js.sample
 */

/**
 * @module MMM-syslog-slave
 * @description Frontend for the module to display data.
 *
 * @requires external:Module
 * @requires external:Log
 * @requires external:moment
 * @requires external:config
 * @requires MMM_syslog_slave_socket
 *
 * @see https://github.com/paviro/MMM-syslog
 */
Module.register('MMM-syslog-slave', {

    /**
     * @member {Object[]} messages - Log messages
     * @property {string} type - Log event type info, warning, error etc.
     * @property {string} message - Content of log event.
     * @property {boolean=} silent - Flag to indicate if an alert should be fired.
     * @property {string} timestamp - Log event date and time.
     */
    messages: [],

    /**
     * @member {Object} defaults - Defines the default config values.
     * @property {int} max - Maximum amount of log messages shown in UI.
     * @property {boolean|string} format - Date and time format {@link http://momentjs.com/docs/#/displaying/format/}.
     * @property {Object.<string, string>} types - CSS classes for specified types.
     * @property {Object.<string, string>} icons - Fontawesome icons for specified types
     * {@link http://fontawesome.io/icons/}.
     * @property {boolean|int} shortenMessage - Maximum amount of characters shown in UI.
     * @property {string[]} blacklist - List of types that should not be shown.
     */
    defaults: {
        max: 5,
        format: false,
        types: {
            INFO: 'dimmed',
            WARNING: 'normal',
            ERROR: 'bright'
        },
        icons: {
            INFO: 'info',
            WARNING: 'exclamation',
            ERROR: 'exclamation-triangle'
        },
        shortenMessage: false,
        blacklist: []
    },

    /**
     * @function getStyles
     * @description Style dependencies for this module.
     * @override
     *
     * @returns {string[]} List of the style dependency filepaths.
     */
    getStyles() {
        return ['font-awesome.css'];
    },

    /**
     * @function getScripts
     * @description Script dependencies for this module.
     * @override
     *
     * @returns {string[]} List of the script dependency filepaths.
     */
    getScripts() {
        return ['moment.js', 'MMM-syslog-slave-socket.js'];
    },

    /**
     * @function start
     * @description Starts connection to master via websocket and creates UI update interval.
     * @override
     */
    start() {
        Log.info(`Starting module: ${this.name}`);
        moment.locale(config.language);
        this.sendSocketNotification('PINGMASTER');

        // Update DOM every minute so that the time of the call updates and calls get removed after a certain time
        setInterval(() => {
            this.updateDom();
        }, 60 * 1000);
    },

    /**
     * @function socketNotificationReceived
     * @description Handles incoming messages from node_helper of the master.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'NEW_MESSAGE') {
            if (!this.config.blacklist.includes(payload.type)) {
                this.sendNotification('SHOW_ALERT', { type: 'notification', title: payload.type, message: payload.message });
                this.messages.push(payload);

                while (this.messages.length > this.config.max) {
                    this.messages.shift();
                }

                this.updateDom(3000);
            }
        }
    },

    /**
     * @function getDom
     * @description Creates the UI as DOM for displaying in MagicMirror application.
     * @override
     *
     * @returns {Element}
     */
    getDom() {
        const wrapper = document.createElement('div');

        if (this.config.title !== false) {
            const title = document.createElement('header');
            title.innerHTML = this.config.title || this.name;
            wrapper.appendChild(title);
        }

        const logs = document.createElement('table');

        for (let i = this.messages.length - 1; i >= 0; i -= 1) {
            // Create callWrapper
            const callWrapper = document.createElement('tr');
            callWrapper.classList.add('normal');

            const iconCell = document.createElement('td');
            const icon = document.createElement('i');
            if (Object.prototype.hasOwnProperty.call(this.config.icons, this.messages[i].type)) {
                icon.classList.add('fa', 'fa-fw', `fa-${this.config.icons[this.messages[i].type]}`);
            } else {
                icon.classList.add('fa', 'fa-fw', 'fa-question');
            }
            this.setTypeClass(this.messages[i].type, icon);

            iconCell.classList.add('small');

            iconCell.appendChild(icon);
            callWrapper.appendChild(iconCell);

            let message = this.messages[i].message;
            if (this.config.shortenMessage && message.length > this.config.shortenMessage) {
                message = `${message.slice(0, this.config.shortenMessage)}&#8230;`;
            }
            // Set caller of row
            const caller = document.createElement('td');
            caller.innerHTML = ` ${message}`;
            caller.classList.add('title', 'small', 'align-left');
            this.setTypeClass(this.messages[i].type, caller);
            callWrapper.appendChild(caller);

            // Set time of row
            const time = document.createElement('td');
            time.innerHTML = this.config.format ?
                moment(this.messages[i].timestamp).format(this.config.format) :
                moment(this.messages[i].timestamp).fromNow();
            time.classList.add('time', 'light', 'xsmall');
            callWrapper.appendChild(time);

            // Add to logs
            logs.appendChild(callWrapper);
        }
        wrapper.appendChild(logs);
        return wrapper;
    },

    setTypeClass(type, element) {
        if (Object.prototype.hasOwnProperty.call(this.config.types, type)) {
            element.classList.add(this.config.types[type]);
        }
    },

    /**
     * @function socket
     * @description Sets up websocket with master.
     * @override
     *
     * @returns {MMM_syslog_slave_socket}
     */
    socket() {
        /* eslint-disable no-underscore-dangle */
        if (typeof this._socket === 'undefined') {
            this._socket = new MMM_syslog_slave_socket(this.name, this.config.master);
        }

        this._socket.setNotificationCallback((notification, payload) => {
            this.socketNotificationReceived(notification, payload);
        });

        return this._socket;
        /* eslint-enable no-underscore-dangle */
    }
});
